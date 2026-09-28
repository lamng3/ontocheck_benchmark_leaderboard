"""Background evaluation jobs."""

import threading
import traceback

from backend.db import DATA_DIR, get_ontology, save_result, update_run
from backend.evaluators.ontocheck_runner import evaluate_ontology


def start_evaluation(session_id, run):
    thread = threading.Thread(
        target=_execute,
        args=(session_id, run),
        daemon=True,
    )
    thread.start()
    return thread


def _execute(session_id, run):
    update_run(run["id"], "running")
    try:
        ontology = get_ontology(session_id, run["ontology_id"])
        if ontology is None:
            raise FileNotFoundError("That ontology is no longer available.")
        output_dir = DATA_DIR / "jobs" / run["id"]
        payload = evaluate_ontology(
            ontology["path"],
            run["checks"],
            run.get("sparql_queries") or None,
            run.get("domain_prefixes") or None,
            output_dir,
        )
        payload["ontology"] = {"id": ontology["id"], "name": ontology["name"]}
        save_result(run["id"], payload)
        update_run(run["id"], "complete")
    except Exception as exc:
        traceback.print_exc()
        update_run(run["id"], "failed", error=str(exc))
