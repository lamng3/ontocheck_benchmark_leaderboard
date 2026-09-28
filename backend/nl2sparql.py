"""Translate a natural-language competency question into SPARQL."""

import os
import re

import httpx
from rdflib import Graph
from rdflib.namespace import OWL, RDF, RDFS

_FENCE = re.compile(r"```(?:sparql)?\s*([\s\S]*?)```", re.IGNORECASE)
_QUERY = re.compile(
    r"((?:PREFIX\s+\S+\s*<[^>]+>\s*)*(?:SELECT|ASK|CONSTRUCT|DESCRIBE)\b[\s\S]+)",
    re.IGNORECASE,
)


def translate(ontology_path, nl_text):
    api_key = os.environ.get("ONTOCHECK_LLM_API_KEY", "").strip()
    if not api_key:
        raise LookupError(
            "No language-model key is configured. Paste a SPARQL query to evaluate and save it."
        )
    vocabulary = _vocabulary(ontology_path)
    base_url = os.environ.get(
        "ONTOCHECK_LLM_BASE_URL", "https://api.together.xyz/v1"
    ).rstrip("/")
    model = os.environ.get(
        "ONTOCHECK_LLM_MODEL", "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"
    )
    prompt = _prompt(nl_text, vocabulary)
    response = httpx.post(
        f"{base_url}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": model,
            "temperature": 0,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You translate competency questions into one SPARQL query. "
                        "Return only the query."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        },
        timeout=40.0,
    )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    sparql = _extract_sparql(content)
    if not sparql:
        raise ValueError("The model did not return a SPARQL query.")
    return {"sparql": sparql, "model": model}


def _prompt(nl_text, vocabulary):
    classes = "\n".join(f"- {item}" for item in vocabulary["classes"]) or "- (none found)"
    properties = (
        "\n".join(f"- {item}" for item in vocabulary["properties"]) or "- (none found)"
    )
    prefixes = "\n".join(
        f"PREFIX {prefix}: <{namespace}>" for prefix, namespace in vocabulary["prefixes"]
    )
    return (
        "Write one SPARQL query for this competency question. "
        "Prefer the classes and properties listed below.\n\n"
        f"Prefixes:\n{prefixes or '(none)'}\n\n"
        f"Classes:\n{classes}\n\n"
        f"Properties:\n{properties}\n\n"
        f"Question: {nl_text.strip()}"
    )


def _vocabulary(ontology_path, limit=60):
    graph = Graph()
    graph.parse(ontology_path, format="turtle")
    classes = _labelled(
        graph,
        """
        SELECT ?term ?label WHERE {
          { ?term a owl:Class } UNION { ?term a rdfs:Class }
          OPTIONAL { ?term rdfs:label ?label }
          FILTER(isIRI(?term))
        }
        """,
        limit,
    )
    properties = _labelled(
        graph,
        """
        SELECT ?term ?label WHERE {
          { ?term a owl:ObjectProperty } UNION
          { ?term a owl:DatatypeProperty } UNION
          { ?term a rdf:Property }
          OPTIONAL { ?term rdfs:label ?label }
          FILTER(isIRI(?term))
        }
        """,
        limit,
    )
    prefixes = [
        (prefix, str(namespace))
        for prefix, namespace in graph.namespaces()
        if prefix and not str(namespace).startswith("http://www.w3.org/")
    ][:12]
    return {"classes": classes, "properties": properties, "prefixes": prefixes}


def _labelled(graph, query, limit):
    rows = []
    for term, label in graph.query(query, initNs={"owl": OWL, "rdfs": RDFS, "rdf": RDF}):
        text = str(label) if label else _local_name(term)
        if text and text not in rows:
            rows.append(text)
        if len(rows) >= limit:
            break
    return rows


def _local_name(term):
    value = str(term)
    if "#" in value:
        return value.rsplit("#", 1)[-1]
    return value.rsplit("/", 1)[-1]


def _extract_sparql(content):
    fenced = _FENCE.search(content or "")
    text = fenced.group(1) if fenced else (content or "")
    match = _QUERY.search(text)
    return (match.group(1) if match else text).strip()
