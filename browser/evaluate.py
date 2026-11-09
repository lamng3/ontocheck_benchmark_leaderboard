"""Evaluate in the browser, under Pyodide.

The backend's own OntoCheck run (backend.evaluators.ontocheck_runner) and
report, so results match a backend run, without the calls to the public
FOOPS and OOPS web services: their checks run locally, as they do offline.
Takes and returns JSON strings.
"""

import json
import uuid
from pathlib import Path

from backend.evaluators.ontocheck_runner import (
    _quiet_logging,
    _read_core_metrics,
    _run_assessment,
    _split_assessment,
    extract_prefixes,
    score_queries,
    task_metrics,
)
from backend.evaluators.report import build_report

FRAMEWORKS = (("oops", "OOPS!"), ("foops", "FOOPS!"), ("oquare", "OQuaRE"))
FORMATS = {".ttl": "turtle", ".owl": "xml", ".rdf": "xml", ".xml": "xml", ".n3": "n3", ".nt": "nt", ".jsonld": "json-ld"}


def evaluate_text(text, suffix, checks, sparql_queries, domain_prefixes):
    """Evaluate an ontology given as file text, stored as Turtle first like an upload."""
    return evaluate(_store(text, suffix), checks, sparql_queries, domain_prefixes)


def score_text(text, suffix, items, domain_prefixes):
    """Recall, precision, and bindings for each query, as the backend's scoring returns them."""
    return json.dumps(score_queries(_store(text, suffix), json.loads(items), json.loads(domain_prefixes) or None))


def _store(text, suffix):
    from rdflib import Graph

    graph = Graph()
    try:
        graph.parse(data=text, format=FORMATS.get(suffix.lower(), "turtle"))
    except Exception as exc:
        raise ValueError(
            f"Could not read this file as an ontology ({type(exc).__name__}). "
            "Check that it is valid Turtle, RDF/XML, N-Triples, N3, or JSON-LD."
        ) from None
    path = Path("/tmp/graphs") / f"{uuid.uuid4().hex}.ttl"
    path.parent.mkdir(parents=True, exist_ok=True)
    graph.serialize(path, format="turtle")
    return str(path)


def evaluate(path, checks, sparql_queries, domain_prefixes):
    checks = json.loads(checks)
    sparql_queries = json.loads(sparql_queries)
    prefixes = json.loads(domain_prefixes) or (extract_prefixes(sparql_queries) if sparql_queries else [])
    output_dir = Path("/tmp/evaluations") / uuid.uuid4().hex
    output_dir.mkdir(parents=True)
    result = _run_assessment(
        path,
        sparql_queries if prefixes else None,
        prefixes or None,
        [name for check, name in FRAMEWORKS if check in checks],
        output_dir,
    )
    _quiet_logging()
    task_based, framework_metrics = _split_assessment(result)
    if sparql_queries and prefixes and task_based is None:
        task_based = task_metrics(path, sparql_queries, prefixes)
    core_rows = _read_core_metrics(output_dir / "scores.csv")
    return json.dumps(build_report(task_based, framework_metrics, core_rows, {}, checks))
