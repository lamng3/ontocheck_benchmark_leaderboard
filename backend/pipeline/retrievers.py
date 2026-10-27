"""Retrievers: question -> ranked ontology terms.

Each retriever returns a list of {"iri", "label", "kind", "score", "why"}.
"""

import importlib.util
import math
import os
import re
from collections import Counter

from rdflib import URIRef

from backend.pipeline.graph import label_of

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "can", "do", "does", "for",
    "from", "has", "have", "how", "in", "is", "it", "list", "many", "of", "on",
    "or", "show", "that", "the", "their", "there", "this", "to", "was", "were",
    "what", "when", "where", "which", "who", "with", "all", "any", "give", "find",
}


class RetrieverError(Exception):
    """A retriever could not run with the given settings."""


def words(text, stem=True):
    found = re.findall(r"[a-z0-9]+", re.sub(r"(?<=[a-z])(?=[A-Z])", " ", text or "").lower())
    kept = [word for word in found if word not in STOPWORDS and len(word) > 2]
    return [_stem(word) for word in kept] if stem else kept


def _stem(word):
    for suffix in ("ies", "es", "s"):
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            return word[: -len(suffix)] + ("y" if suffix == "ies" else "")
    return word


def _hit(term, score, why):
    return {"iri": term["iri"], "label": term["label"], "kind": term["kind"], "score": round(score, 3), "why": why}


def _vector(text):
    padded = f"  {(text or '').lower()}  "
    grams = Counter(padded[i : i + 3] for i in range(len(padded) - 2))
    norm = math.sqrt(sum(v * v for v in grams.values())) or 1.0
    return {gram: count / norm for gram, count in grams.items()}


_vectors = {}


def nearest(question, graph, terms, k, **_):
    """Exact cosine search over character trigram vectors of each term."""
    key = id(terms)
    if key not in _vectors:
        _vectors.clear()
        _vectors[key] = {
            iri: _vector(" ".join([t["label"], *t["labels"], t["local"]]))
            for iri, t in terms.items()
        }
    vectors = _vectors[key]
    # Score each question phrase separately so one long question does not
    # wash out a short label.
    tokens = words(question, stem=False)
    phrases = tokens + [" ".join(pair) for pair in zip(tokens, tokens[1:])] or [question]
    query_vectors = [_vector(phrase) for phrase in phrases]
    scored = []
    for iri, vector in vectors.items():
        best, phrase = 0.0, ""
        for text, query in zip(phrases, query_vectors):
            score = sum(weight * vector.get(gram, 0.0) for gram, weight in query.items())
            if score > best:
                best, phrase = score, text
        if best > 0.2:
            scored.append(_hit(terms[iri], best, f"close to “{phrase}”"))
    scored.sort(key=lambda hit: -hit["score"])
    return scored[:k]


def pattern(question, graph, terms, k, **_):
    """Terms whose label or local name contains question words."""
    wanted = set(words(question))
    if not wanted:
        return []
    scored = []
    for term in terms.values():
        label_words = set(words(" ".join([term["label"], *term["labels"], term["local"]])))
        shared = wanted & label_words
        if shared:
            score = len(shared) / max(len(label_words), 1)
            scored.append(_hit(term, score, "matches " + ", ".join(sorted(shared))))
    scored.sort(key=lambda hit: (-hit["score"], len(hit["label"])))
    return scored[:k]


def sparql(question, graph, terms, k, query="", **_):
    if not query.strip():
        raise RetrieverError("The SPARQL retriever runs the query in the editor. Write one, or translate the question first.")
    try:
        rows = list(graph.query(query))
    except Exception as exc:
        raise RetrieverError(f"The SPARQL query failed: {exc}") from exc
    hits, seen = [], set()
    for row in rows:
        for value in row if isinstance(row, tuple) else [row]:
            if isinstance(value, URIRef) and str(value) not in seen:
                seen.add(str(value))
                term = terms.get(str(value)) or {"iri": str(value), "label": label_of(terms, value), "kind": "iri"}
                hits.append(_hit(term, 1.0, "returned by the query"))
    return hits[:k]


def cypher(question, graph, terms, k, query="", **_):
    uri = os.environ.get("NEO4J_URI")
    if not uri:
        raise RetrieverError("Set NEO4J_URI (and NEO4J_USER, NEO4J_PASSWORD) before using the Cypher retriever.")
    if not query.strip():
        raise RetrieverError("The Cypher retriever runs the query in the editor.")
    try:
        from neo4j import GraphDatabase
    except ImportError as exc:
        raise RetrieverError("Install the neo4j package to use the Cypher retriever.") from exc
    auth = (os.environ.get("NEO4J_USER", "neo4j"), os.environ.get("NEO4J_PASSWORD", ""))
    with GraphDatabase.driver(uri, auth=auth) as driver:
        records, _summary, _keys = driver.execute_query(query)
    hits = []
    for record in records[:k]:
        values = record.data()
        label = ", ".join(f"{key}: {value}" for key, value in values.items())
        hits.append({"iri": "", "label": label, "kind": "row", "score": 1.0, "why": "returned by Cypher"})
    return hits


def script(question, graph, terms, k, script_path=None, **_):
    if os.environ.get("ONTOCHECK_ALLOW_SCRIPTS") != "1":
        raise RetrieverError("Uploaded retrievers run your Python code. Start the backend with ONTOCHECK_ALLOW_SCRIPTS=1 to allow them.")
    if not script_path:
        raise RetrieverError("Upload a retriever script first.")
    spec = importlib.util.spec_from_file_location("user_retriever", script_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    if not hasattr(module, "retrieve"):
        raise RetrieverError("The script must define retrieve(question, graph, k).")
    hits = []
    for item in module.retrieve(question, graph, k) or []:
        if isinstance(item, str):
            item = {"iri": item}
        iri = str(item.get("iri", ""))
        term = terms.get(iri) or {"iri": iri, "label": item.get("label") or label_of(terms, URIRef(iri)), "kind": "iri"}
        hits.append(_hit(term, float(item.get("score", 1.0)), item.get("why", "your retriever")))
    return hits[:k]


RETRIEVERS = {
    "ann": nearest,
    "pattern": pattern,
    "sparql": sparql,
    "cypher": cypher,
    "script": script,
}


def retrieve(name, question, graph, terms, k=8, **options):
    if name not in RETRIEVERS:
        raise RetrieverError(f"Unknown retriever: {name}")
    return RETRIEVERS[name](question, graph, terms, max(1, min(int(k), 50)), **options)
