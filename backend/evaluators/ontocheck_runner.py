"""In-process OntoCheck runs and SPARQL execution."""

import csv
import logging
import re
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from rdflib import Graph

_assessment_lock = threading.Lock()

LOCAL_METRICS = [
    "altLabelCheck",
    "isolatedElements",
    "classConnections",
    "definitionCheck",
    "duplicateLabels",
    "missingDomainRange",
    "leafNodeCheck",
    "semanticConnection",
    "classCapitalCheck",
    "classSpaceCheck",
    "checkLabel",
]

_PREFIX_DECLARATION = re.compile(
    r"PREFIX\s+([A-Za-z][\w-]*)\s*:",
    re.IGNORECASE,
)
_PREFIX_USE = re.compile(r"(?<![\w])([A-Za-z][\w-]*)\s*:")
_PREFIX_KEYWORDS = {
    "prefix",
    "select",
    "where",
    "filter",
    "optional",
    "bind",
    "graph",
    "service",
    "base",
    "union",
    "minus",
    "values",
    "http",
    "https",
}


def extract_prefixes(sparql_queries):
    declared = []
    used = []
    for sparql in sparql_queries or []:
        text = sparql or ""
        declared.extend(_PREFIX_DECLARATION.findall(text))
        stripped = re.sub(r"<[^>]*>", " ", text)
        for prefix in _PREFIX_USE.findall(stripped):
            if prefix.lower() not in _PREFIX_KEYWORDS:
                used.append(prefix)
    source = declared or used
    unique = []
    for prefix in source:
        if prefix not in unique:
            unique.append(prefix)
    return unique


def to_turtle(source_path, dest_path):
    """Load an uploaded ontology and store it as Turtle for OntoCheck."""
    graph = Graph()
    suffix = Path(source_path).suffix.lower()
    formats = {
        ".ttl": "turtle",
        ".owl": "xml",
        ".rdf": "xml",
        ".xml": "xml",
        ".n3": "n3",
        ".nt": "nt",
        ".jsonld": "json-ld",
    }
    try:
        graph.parse(source_path, format=formats.get(suffix))
    except Exception:
        graph.parse(source_path)
    if len(graph) == 0:
        raise ValueError("The file did not contain any RDF triples.")
    graph.serialize(destination=dest_path, format="turtle")
    return dest_path


def execute_sparql(ttl_path, sparql):
    graph = Graph()
    graph.parse(ttl_path, format="turtle")
    try:
        result = graph.query(sparql)
    except Exception as exc:
        return {"ok": False, "count": None, "error": str(exc)}
    if getattr(result, "type", "") == "ASK":
        answer = bool(result)
        return {"ok": True, "count": 1 if answer else 0, "ask": answer}
    try:
        rows = list(result)
    except Exception as exc:
        return {"ok": False, "count": None, "error": str(exc)}
    return {"ok": True, "count": len(rows)}


def task_metrics(ttl_path, sparql_queries, domain_prefixes):
    from ontocheck import task_based_metric_v_0_0_1

    prefixes = domain_prefixes or extract_prefixes(sparql_queries)
    if not prefixes:
        raise ValueError(
            "Could not find a SPARQL prefix. Declare one with PREFIX, "
            "or enter it in the evaluation config."
        )
    raw = task_based_metric_v_0_0_1(
        ttl_file=str(ttl_path),
        questions=list(sparql_queries),
        domain_prefixes=prefixes,
    )
    missing = raw.get("missing_from_onto") or set()
    return {
        "recall": raw.get("recall"),
        "precision": raw.get("precision"),
        "task_terms": raw.get("T_a_count"),
        "ontology_terms": raw.get("T_o_count"),
        "intersection": raw.get("intersection"),
        "missing": sorted(missing)[:40],
        "query_count": raw.get("query_count"),
        "prefixes": prefixes,
    }


def evaluate_ontology(ttl_path, checks, sparql_queries, domain_prefixes, output_dir):
    from backend.evaluators.foops import assess as assess_foops
    from backend.evaluators.oops import assess as assess_oops
    from backend.evaluators.report import build_report

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    ontology_text = Path(ttl_path).read_text(encoding="utf-8", errors="replace")
    prefixes = list(domain_prefixes or [])
    if sparql_queries and not prefixes:
        prefixes = extract_prefixes(sparql_queries)

    frameworks = []
    if "oops" in checks:
        frameworks.append("OOPS!")
    if "foops" in checks:
        frameworks.append("FOOPS!")
    if "oquare" in checks:
        frameworks.append("OQuaRE")

    with ThreadPoolExecutor(max_workers=2) as pool:
        remote_jobs = {}
        if "foops" in checks:
            remote_jobs["foops"] = pool.submit(_safe_remote, assess_foops, ontology_text)
        if "oops" in checks:
            remote_jobs["oops"] = pool.submit(_safe_remote, assess_oops, ontology_text)
        with _assessment_lock:
            result = _run_assessment(
                ttl_path,
                sparql_queries if prefixes else None,
                prefixes or None,
                frameworks,
                output_dir,
            )
            _quiet_logging()
        remote = {name: job.result() for name, job in remote_jobs.items()}

    task_based, framework_metrics = _split_assessment(result)
    if sparql_queries and prefixes and task_based is None:
        task_based = task_metrics(ttl_path, sparql_queries, prefixes)
    core_rows = _read_core_metrics(output_dir / "scores.csv")
    return build_report(task_based, framework_metrics, core_rows, remote, checks)


def score_queries(ttl_path, items, domain_prefixes=None):
    """Query-level recall and precision, plus the combined term aggregate."""
    sparqls = [item["sparql"] for item in items if (item.get("sparql") or "").strip()]
    prefixes = list(domain_prefixes or []) or extract_prefixes(sparqls)
    scored = []
    for item in items:
        sparql = (item.get("sparql") or "").strip()
        if not sparql:
            continue
        entry = {
            "id": item.get("id"),
            "nl_text": item.get("nl_text") or "",
            "sparql": sparql,
        }
        try:
            entry.update(
                task_metrics(
                    ttl_path,
                    [sparql],
                    extract_prefixes([sparql]) or prefixes,
                )
            )
            entry["bindings"] = execute_sparql(ttl_path, sparql)
        except Exception as exc:
            entry["error"] = str(exc)
            entry["bindings"] = {"ok": False, "count": None, "error": str(exc)}
        scored.append(entry)
    aggregate = None
    if sparqls:
        try:
            aggregate = task_metrics(ttl_path, sparqls, prefixes)
        except Exception as exc:
            aggregate = {"error": str(exc)}
    return {"aggregate": aggregate, "queries": scored}


def _safe_remote(function, ontology_text):
    try:
        return function(ontology_text)
    except Exception as exc:
        return {"ok": False, "detail": str(exc)}


def _run_assessment(ttl_path, sparql_queries, prefixes, frameworks, output_dir):
    from ontocheck import run_assessment

    return run_assessment(
        ttl_files=str(ttl_path),
        metrics=LOCAL_METRICS,
        questions=list(sparql_queries) if sparql_queries else None,
        domain_prefixes=prefixes,
        frameworks=frameworks or None,
        allow_network=False,
        has_abox=_has_abox(ttl_path),
        output_log_file=str(output_dir / "assessment.log"),
        output_csv_file=str(output_dir / "scores.csv"),
        framework_csv_file=str(output_dir / "framework.csv"),
    )


def _has_abox(ttl_path):
    graph = Graph()
    graph.parse(ttl_path, format="turtle")
    query = """
        PREFIX owl: <http://www.w3.org/2002/07/owl#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
        ASK {
          ?s a ?t .
          FILTER(isIRI(?t) && ?t NOT IN (
            owl:Class, rdfs:Class, owl:ObjectProperty, owl:DatatypeProperty,
            owl:AnnotationProperty, rdf:Property, owl:Ontology, owl:Restriction,
            owl:NamedIndividual
          ))
        }
    """
    try:
        return bool(graph.query(query))
    except Exception:
        return False


def _split_assessment(result):
    if isinstance(result, dict) and "framework" in result:
        return result.get("task_based"), _serialize_metrics(result.get("framework") or [])
    if isinstance(result, dict) and "recall" in result:
        return result, []
    return None, []


def _serialize_metrics(results):
    from ontocheck.metric_registry import METRIC_REGISTRY

    serialized = []
    for result in results:
        descriptor = METRIC_REGISTRY.get(result.metric_id)
        detail = result.detail or {}
        serialized.append(
            {
                "id": result.metric_id,
                "source_id": descriptor.source_id if descriptor else "",
                "name": descriptor.name if descriptor else result.metric_id,
                "framework": descriptor.source_framework.value if descriptor else "",
                "severity": descriptor.severity.value if descriptor else "",
                "fair_principle": descriptor.fair_principle if descriptor else "",
                "score": _plain(result.score),
                "static_scale": detail.get("static_scale"),
                "passed": result.passed,
                "affected": len(result.affected or []),
                "message": result.message,
                "status": result.status,
            }
        )
    return serialized


def _plain(value):
    if isinstance(value, bool) or value is None:
        return value
    if isinstance(value, (int, float, str)):
        return value
    return str(value)


def _read_core_metrics(csv_path):
    if not Path(csv_path).exists():
        return []
    rows = []
    with open(csv_path, newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            if row.get("Metric") in LOCAL_METRICS:
                rows.append(
                    {
                        "name": row["Metric"],
                        "score": row.get("Score"),
                        "status": row.get("Status"),
                    }
                )
    return rows


def _quiet_logging():
    root = logging.getLogger()
    for handler in list(root.handlers):
        if isinstance(handler, logging.FileHandler):
            root.removeHandler(handler)
            handler.close()
