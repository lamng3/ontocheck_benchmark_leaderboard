"""Reasoners: retrieved terms -> paths, inferred facts, or an answer.

Each reasoner returns {"kind": ..., "items": [...], "text": ...}; "text" is
what goes into the context.
"""

import os
from collections import defaultdict
from itertools import combinations

import httpx
import networkx as nx
from rdflib import BNode, URIRef
from rdflib.namespace import OWL, RDF, RDFS

from backend.pipeline.graph import is_schema, label_of


class ReasonerError(Exception):
    """A reasoner could not run with the given settings."""


STRUCTURAL = {RDFS.subClassOf, RDFS.subPropertyOf, OWL.equivalentClass, RDFS.domain, RDFS.range, OWL.inverseOf}
_networks = {}


def _network(graph, terms):
    """Undirected multigraph over named terms; edges remember their predicate."""
    key = id(terms)
    if key in _networks:
        return _networks[key]
    network = nx.Graph()
    for subject, predicate, obj in graph:
        if not isinstance(subject, URIRef):
            continue
        if predicate == RDFS.subClassOf and isinstance(obj, BNode):
            # C subClassOf [onProperty p; someValuesFrom D] becomes C -p- D.
            prop = graph.value(obj, OWL.onProperty)
            target = graph.value(obj, OWL.someValuesFrom) or graph.value(obj, OWL.allValuesFrom)
            if isinstance(prop, URIRef) and isinstance(target, URIRef):
                network.add_edge(str(subject), str(target), predicate=str(prop), source=str(subject))
            continue
        if not isinstance(obj, URIRef) or is_schema(obj):
            continue
        if predicate in STRUCTURAL or (str(predicate) in terms and str(subject) in terms):
            network.add_edge(str(subject), str(obj), predicate=str(predicate), source=str(subject))
    _networks.clear()
    _networks[key] = network
    return network


def path_based(graph, terms, hits, hops=3, **_):
    network = _network(graph, terms)
    seeds = [hit["iri"] for hit in hits if hit["iri"] in network][:8]
    paths = []
    for start, end in combinations(seeds, 2):
        try:
            nodes = nx.shortest_path(network, start, end)
        except nx.NetworkXNoPath:
            continue
        if len(nodes) - 1 > int(hops):
            continue
        steps = [label_of(terms, URIRef(nodes[0]))]
        for left, right in zip(nodes, nodes[1:]):
            edge = network.edges[left, right]
            arrow = "→" if edge["source"] == left else "←"
            steps.append(f"{arrow} {label_of(terms, URIRef(edge['predicate']))} {arrow} {label_of(terms, URIRef(right))}")
        paths.append({"hops": len(nodes) - 1, "text": " ".join(steps)})
    paths.sort(key=lambda path: path["hops"])
    neighbours = []
    if not paths:
        # One seed, or seeds that never meet: describe each seed's neighbourhood.
        for iri in seeds[:4]:
            for other in list(network.neighbors(iri))[:6]:
                edge = network.edges[iri, other]
                subject, obj = (iri, other) if edge["source"] == iri else (other, iri)
                neighbours.append({
                    "hops": 1,
                    "text": f"{label_of(terms, URIRef(subject))} → {label_of(terms, URIRef(edge['predicate']))} → {label_of(terms, URIRef(obj))}",
                })
    items = (paths or neighbours)[:20]
    return {"kind": "paths", "items": items, "text": "\n".join(item["text"] for item in items)}


def _successors(pairs):
    successors = defaultdict(set)
    for left, right in pairs:
        successors[left].add(right)
    return successors


def _apply_rules(facts):
    """One round of rules; returns {rule name: new facts}."""
    by_predicate = defaultdict(list)
    for s, p, o in facts:
        by_predicate[p].append((s, o))
    parents = _successors(by_predicate[RDFS.subClassOf])
    derived = {
        "subclass is transitive": {
            (a, RDFS.subClassOf, c) for a, b in by_predicate[RDFS.subClassOf] for c in parents[b] if a != c
        },
        "type inherits up the hierarchy": {
            (x, RDF.type, d) for x, c in by_predicate[RDF.type] for d in parents[c]
        },
        "property domain types the subject": {
            (x, RDF.type, c) for prop, c in by_predicate[RDFS.domain] for x, _y in by_predicate[prop]
        },
        "property range types the object": {
            (y, RDF.type, c)
            for prop, c in by_predicate[RDFS.range]
            for _x, y in by_predicate[prop]
            if isinstance(y, URIRef)
        },
        "inverse properties": {
            (y, q, x)
            for prop, q in by_predicate[OWL.inverseOf]
            for x, y in by_predicate[prop]
            if isinstance(y, URIRef)
        },
        "transitive properties": set(),
    }
    for prop, kind in by_predicate[RDF.type]:
        if kind == OWL.TransitiveProperty:
            successors = _successors(by_predicate[prop])
            derived["transitive properties"] |= {
                (x, prop, z) for x, y in by_predicate[prop] for z in successors[y] if x != z
            }
    return derived


def rule_based(graph, terms, hits, **_):
    """Forward chaining of RDFS and OWL rules, reported near the hits."""
    facts = {(s, p, o) for s, p, o in graph if not isinstance(s, BNode) and not isinstance(o, BNode)}
    seeds = {URIRef(hit["iri"]) for hit in hits if hit["iri"]}
    inferred = []
    for _round in range(6):
        added = 0
        for name, new in _apply_rules(facts).items():
            for fact in new - facts:
                facts.add(fact)
                added += 1
                if seeds & {fact[0], fact[2]}:
                    inferred.append((name, fact))
        if not added or len(facts) > 200_000:
            break
    items = [
        {"rule": name, "text": f"{label_of(terms, s)} → {label_of(terms, p)} → {label_of(terms, o)}"}
        for name, (s, p, o) in inferred[:40]
    ]
    return {"kind": "inferences", "items": items, "text": "\n".join(item["text"] for item in items)}


def agent(graph, terms, hits, question="", context_text="", model="", **_):
    host = os.environ.get("OLLAMA_HOST", "http://127.0.0.1:11434").rstrip("/")
    model = model or os.environ.get("OLLAMA_MODEL", "llama3.1")
    prompt = (
        "Answer the question using only the ontology context below. Name the "
        "ontology terms you rely on. Say so if the context is not enough.\n\n"
        f"Context:\n{context_text}\n\nQuestion: {question}"
    )
    try:
        response = httpx.post(
            f"{host}/api/chat",
            json={"model": model, "stream": False, "messages": [{"role": "user", "content": prompt}]},
            timeout=120,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise ReasonerError(f"Could not reach Ollama at {host} with model {model}: {exc}") from exc
    answer = response.json().get("message", {}).get("content", "").strip()
    return {"kind": "answer", "items": [], "text": answer, "model": model}


def planned(name):
    def run(*_args, **_kwargs):
        raise ReasonerError(f"The {name} reasoner is planned and not wired in yet.")

    return run


REASONERS = {
    "path": path_based,
    "rule": rule_based,
    "owl": planned("OWL"),
    "agent": agent,
    "none": lambda *_args, **_kwargs: {"kind": "none", "items": [], "text": ""},
}


def reason(name, graph, terms, hits, **options):
    if name not in REASONERS:
        raise ReasonerError(f"Unknown reasoner: {name}")
    return REASONERS[name](graph, terms, hits, **options)
