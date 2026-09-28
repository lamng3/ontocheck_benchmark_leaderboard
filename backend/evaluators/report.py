"""Turn an OntoCheck run into the panels the workbench renders."""

from backend.evaluators.oquare import characteristics_from_metrics

LOCAL_CORE = {
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
}


def build_report(task_based, framework_metrics, core_rows, remote, checks):
    report = {
        "ontocheck": _ontocheck_panel(task_based, core_rows),
    }
    selected = set(checks)
    if "foops" in selected:
        report["foops"] = _foops_panel(framework_metrics, remote.get("foops"))
    if "oops" in selected:
        report["oops"] = _oops_panel(framework_metrics, remote.get("oops"))
    if "oquare" in selected:
        report["oquare"] = _oquare_panel(framework_metrics)
    return report


def _ontocheck_panel(task_based, core_rows):
    panel = {
        "recall": None,
        "precision": None,
        "task_terms": None,
        "ontology_terms": None,
        "intersection": None,
        "missing": [],
        "query_count": None,
        "metrics": core_rows,
    }
    if not task_based:
        return panel
    missing = task_based.get("missing_from_onto") or task_based.get("missing") or []
    panel.update(
        {
            "recall": task_based.get("recall"),
            "precision": task_based.get("precision"),
            "task_terms": task_based.get("T_a_count", task_based.get("task_terms")),
            "ontology_terms": task_based.get(
                "T_o_count", task_based.get("ontology_terms")
            ),
            "intersection": task_based.get("intersection"),
            "missing": sorted(missing)[:40],
            "query_count": task_based.get("query_count"),
        }
    )
    return panel


def _foops_panel(metrics, remote):
    tests = [metric for metric in metrics if metric.get("framework") == "FOOPS!"]
    principles = {}
    passed = failed = skipped = 0
    for test in tests:
        principle = test.get("fair_principle") or "Other"
        bucket = principles.setdefault(
            principle, {"id": principle, "passed": 0, "failed": 0, "skipped": 0}
        )
        status = test.get("status") or ""
        if status.startswith("Skipped") or status.startswith("Error"):
            skipped += 1
            bucket["skipped"] += 1
            continue
        if test.get("passed") is True:
            passed += 1
            bucket["passed"] += 1
        elif test.get("passed") is False:
            failed += 1
            bucket["failed"] += 1
    decided = passed + failed
    rows = []
    for principle in sorted(principles):
        bucket = principles[principle]
        decided_here = bucket["passed"] + bucket["failed"]
        bucket["score"] = (
            round(100 * bucket["passed"] / decided_here, 1) if decided_here else None
        )
        rows.append(bucket)
    return {
        "overall": round(100 * passed / decided, 1) if decided else None,
        "passed": passed,
        "failed": failed,
        "skipped": skipped,
        "principles": rows,
        "tests": tests,
        "remote": remote,
    }


def _oops_panel(metrics, remote):
    tests = [metric for metric in metrics if metric.get("framework") == "OOPS!"]
    pitfalls = []
    summary = {"critical": 0, "important": 0, "minor": 0, "passed": 0, "skipped": 0}
    for test in tests:
        status = test.get("status") or ""
        if status.startswith("Skipped") or status.startswith("Error"):
            summary["skipped"] += 1
            continue
        if test.get("passed") is True:
            summary["passed"] += 1
            continue
        if test.get("passed") is False:
            severity = test.get("severity") or "minor"
            if severity in summary:
                summary[severity] += 1
            pitfalls.append(test)
    pitfalls.sort(key=lambda item: ("critical", "important", "minor", "info").index(
        item.get("severity") if item.get("severity") in summary else "minor"
    ))
    return {"summary": summary, "pitfalls": pitfalls, "remote": remote}


def _oquare_panel(metrics):
    oquare = [metric for metric in metrics if metric.get("framework") == "OQuaRE"]
    return {
        "characteristics": characteristics_from_metrics(oquare),
        "metrics": [
            {
                "name": metric.get("source_id") or metric.get("name"),
                "raw": metric.get("score"),
                "score": metric.get("static_scale"),
                "status": metric.get("status"),
                "message": metric.get("message"),
            }
            for metric in oquare
            if not str(metric.get("status") or "").startswith("Skipped")
        ],
    }
