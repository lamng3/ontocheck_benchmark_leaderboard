"""Built-in example ontologies, shared by every session and read-only."""

import json
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "examples" / "manifest.json"


@lru_cache(maxsize=1)
def _examples():
    if not MANIFEST.is_file():
        return {}
    listed = json.loads(MANIFEST.read_text())["examples"]
    return {item["id"]: item for item in listed}


def list_examples():
    return [
        {"id": item["id"], "name": item["name"], "example": True, "questions": item["questions"]}
        for item in _examples().values()
    ]


def get_example(ontology_id):
    """The example as an ontology record, or None for any other id."""
    item = _examples().get(ontology_id)
    if item is None:
        return None
    return {"id": item["id"], "name": item["name"], "path": str(ROOT / item["file"]), "example": True}
