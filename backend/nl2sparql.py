"""Translate a natural-language competency question into SPARQL."""

import os
import re
from pathlib import Path

import httpx
from rdflib import Graph
from rdflib.namespace import OWL, RDF, RDFS
from rdflib.plugins.sparql import prepareQuery

_FENCE = re.compile(r"```(?:sparql)?\s*([\s\S]*?)```", re.IGNORECASE)
_QUERY = re.compile(
    r"((?:PREFIX\s+\S+\s*<[^>]+>\s*)*(?:SELECT|ASK|CONSTRUCT|DESCRIBE)\b[\s\S]+)",
    re.IGNORECASE,
)
_DECLARED_PREFIX = re.compile(
    r"@?prefix\s+([A-Za-z][\w.-]*)\s*:\s*<([^>]+)>",
    re.IGNORECASE,
)


_OLLAMA_PREFERENCE = ("llama3.1", "llama3", "mistral", "phi3", "qwen2.5", "qwen")
_SYSTEM = (
    "You translate competency questions into one SPARQL query. "
    "Return only the query."
)


def translate(ontology_path, nl_text):
    vocabulary = _vocabulary(ontology_path)
    prompt = _prompt(nl_text, vocabulary)
    provider = _provider()
    content, model = _chat(provider, prompt)
    sparql = _lift_modifiers(_require_sparql(content))
    error = _parse_error(sparql)
    if error:
        content, model = _chat(provider, _repair_prompt(sparql, error))
        sparql = _lift_modifiers(_require_sparql(content))
        error = _parse_error(sparql)
        if error:
            raise ValueError(f"The model returned SPARQL that does not parse: {error}")
    return {"sparql": sparql, "model": model, "provider": provider}


def _chat(provider, prompt):
    if provider == "openai":
        return _openai_chat(prompt)
    return _ollama_chat(prompt)


def _require_sparql(content):
    sparql = _extract_sparql(content)
    if not sparql:
        raise ValueError("The model did not return a SPARQL query.")
    return sparql


def _parse_error(sparql):
    try:
        prepareQuery(sparql)
    except Exception as exc:
        return str(exc).strip()
    return None


def _repair_prompt(sparql, error):
    return (
        "Fix this SPARQL query and return only the corrected query.\n"
        "Do not put SELECT inside FILTER. "
        "Put GROUP BY, ORDER BY, and LIMIT after WHERE { }. "
        "When grouping, select the aggregate, as in (MAX(?value) AS ?maxValue).\n\n"
        f"Error: {error}\n"
        f"Query:\n{sparql}"
    )


_MODIFIER = re.compile(
    r"^(GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|OFFSET)\b",
    re.IGNORECASE,
)


def _lift_modifiers(sparql):
    """Move solution modifiers that were written inside WHERE to after it."""
    match = re.search(r"\bWHERE\b", sparql, re.IGNORECASE)
    if not match:
        return sparql
    start = sparql.find("{", match.end())
    if start < 0:
        return sparql
    depth = 0
    end = None
    for index, char in enumerate(sparql[start:], start):
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                end = index
                break
    if end is None:
        return sparql
    kept = []
    moved = []
    inner_depth = 0
    for line in sparql[start + 1 : end].splitlines():
        if inner_depth == 0 and _MODIFIER.match(line.strip()):
            moved.append(line.strip())
        else:
            kept.append(line)
        inner_depth += line.count("{") - line.count("}")
    if not moved:
        return sparql
    body = "\n".join(kept).rstrip()
    return (
        f"{sparql[: start + 1]}\n{body}\n}}"
        f"\n{chr(10).join(moved)}{sparql[end + 1 :]}"
    )


def _provider():
    configured = os.environ.get("ONTOCHECK_LLM_PROVIDER", "").strip().lower()
    if configured == "openai":
        return "openai"
    return "ollama"


def _ollama_chat(prompt):
    base_url = os.environ.get(
        "ONTOCHECK_OLLAMA_BASE_URL", "http://127.0.0.1:11434"
    ).rstrip("/")
    try:
        model = _ollama_model(base_url)
        response = httpx.post(
            f"{base_url}/api/chat",
            json={
                "model": model,
                "stream": False,
                "keep_alive": "10m",
                "options": {"temperature": 0},
                "messages": [
                    {"role": "system", "content": _SYSTEM},
                    {"role": "user", "content": prompt},
                ],
            },
            timeout=180.0,
        )
    except httpx.ConnectError as exc:
        raise LookupError(
            f"Ollama is not running at {base_url}. Start it with `ollama serve`."
        ) from exc
    except httpx.TimeoutException as exc:
        raise LookupError(
            "Ollama took too long to answer. Try again, or set "
            "ONTOCHECK_OLLAMA_MODEL to a smaller model."
        ) from exc
    if response.status_code == 404:
        raise LookupError(
            f"Ollama model {model} is not installed. Run `ollama pull {model}`."
        )
    response.raise_for_status()
    return response.json()["message"]["content"], model


def _ollama_model(base_url):
    configured = os.environ.get("ONTOCHECK_OLLAMA_MODEL", "").strip()
    if configured:
        return configured
    response = httpx.get(f"{base_url}/api/tags", timeout=5.0)
    response.raise_for_status()
    names = [
        item.get("name") or item.get("model")
        for item in response.json().get("models") or []
    ]
    names = [name for name in names if name]
    for preferred in _OLLAMA_PREFERENCE:
        for name in names:
            if name == preferred or name.startswith(preferred + ":"):
                return name
    if not names:
        raise LookupError(
            "Ollama has no models. Run `ollama pull llama3.1`, then translate again."
        )
    return names[0]


def _openai_chat(prompt):
    api_key = os.environ.get("ONTOCHECK_LLM_API_KEY", "").strip()
    if not api_key:
        raise LookupError(
            "Set ONTOCHECK_LLM_API_KEY, or leave ONTOCHECK_LLM_PROVIDER unset to use Ollama."
        )
    base_url = os.environ.get(
        "ONTOCHECK_LLM_BASE_URL", "https://api.together.xyz/v1"
    ).rstrip("/")
    model = os.environ.get(
        "ONTOCHECK_LLM_MODEL", "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"
    )
    response = httpx.post(
        f"{base_url}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": model,
            "temperature": 0,
            "messages": [
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": prompt},
            ],
        },
        timeout=40.0,
    )
    response.raise_for_status()
    return response.json()["choices"][0]["message"]["content"], model


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
        "Use only the prefixes and terms below. "
        "Match the question to the labels in quotes. "
        "Put triple patterns inside WHERE { }. "
        "Put ORDER BY and LIMIT after that block. "
        "Do not put SELECT inside FILTER. "
        "Do not copy the example terms. "
        "Return only the query.\n\n"
        "Shape:\n"
        "PREFIX ex: <http://example.org/>\n"
        "SELECT ?item ?value\n"
        "WHERE {\n"
        "  ?item a ex:Record ;\n"
        "        ex:relatedItem ?other ;\n"
        "        ex:amount ?value .\n"
        "}\n"
        "ORDER BY DESC(?value)\n\n"
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
    declared = _declared_prefixes(ontology_path)
    iris = [term for term, _label in classes + properties]
    prefixes, by_namespace = _prefixes_for_terms(iris, declared)
    return {
        "classes": [_term_line(term, label, by_namespace) for term, label in classes],
        "properties": [
            _term_line(term, label, by_namespace) for term, label in properties
        ],
        "prefixes": prefixes,
    }


def _prefixes_for_terms(iris, declared):
    by_namespace = {namespace: prefix for prefix, namespace in declared}
    used = {prefix.lower() for prefix, _namespace in declared}
    prefixes = list(declared)
    for iri in iris:
        namespace = _namespace(iri)
        if namespace in by_namespace or _is_core_namespace(namespace):
            continue
        prefix = _prefix_name(namespace, used)
        by_namespace[namespace] = prefix
        used.add(prefix.lower())
        prefixes.append((prefix, namespace))
        if len(prefixes) >= 12:
            break
    return prefixes, by_namespace


def _is_core_namespace(namespace):
    return namespace.startswith(
        (
            "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
            "http://www.w3.org/2000/01/rdf-schema#",
            "http://www.w3.org/2002/07/owl#",
            "http://www.w3.org/2001/XMLSchema#",
            "http://www.w3.org/XML/1998/namespace",
        )
    )


def _namespace(iri):
    text = str(iri)
    if "#" in text:
        return text.rsplit("#", 1)[0] + "#"
    return text.rsplit("/", 1)[0] + "/"


def _prefix_name(namespace, used):
    segment = namespace.rstrip("#/").rsplit("/", 1)[-1]
    slug = re.sub(r"[^A-Za-z0-9-]", "", segment).lower()[:16] or "ns"
    if not slug[0].isalpha():
        slug = f"ns{slug}"
    candidate = slug
    number = 2
    while candidate.lower() in used:
        candidate = f"{slug}{number}"
        number += 1
    return candidate


def _term_line(term, label, by_namespace):
    namespace = _namespace(term)
    local = _local_name(term)
    prefix = by_namespace.get(namespace)
    name = f"{prefix}:{local}" if prefix else f"<{term}>"
    if label:
        return f'{name} "{label}"'
    return name


def _declared_prefixes(ontology_path):
    text = Path(ontology_path).read_text(encoding="utf-8", errors="replace")
    found = []
    seen = set()
    for prefix, namespace in _DECLARED_PREFIX.findall(text):
        key = prefix.lower()
        if key in seen or _is_core_namespace(namespace):
            continue
        seen.add(key)
        found.append((prefix, namespace))
        if len(found) >= 12:
            break
    return found


def _labelled(graph, query, limit):
    rows = []
    seen = set()
    for term, label in graph.query(query, initNs={"owl": OWL, "rdfs": RDFS, "rdf": RDF}):
        iri = str(term)
        if iri in seen:
            continue
        seen.add(iri)
        rows.append((iri, str(label) if label else ""))
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
