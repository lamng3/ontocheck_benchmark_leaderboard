"""The Ask pipeline in the browser, under Pyodide.

Runs the same modules as the backend (backend.pipeline, backend.memory) and
nl2sparql's prompt, repair, and validation stages. JavaScript makes every
model call, so nothing here needs network access. Each function takes and
returns JSON strings.
"""

import json
import re
from pathlib import Path

from rdflib import BNode, Graph, URIRef

from backend.memory.intent import classify
from backend.pipeline import run
from backend.pipeline.graph import label_of, load
from nl2sparql.generate import Context, Example, build_prompt
from nl2sparql.ontology import load_vocabulary
from nl2sparql.stages import apply_stages
from nl2sparql.validate import parse_error, prepare_draft, repair_prompt

GRAPHS = Path("/home/pyodide/graphs")
FORMATS = {".ttl": "turtle", ".owl": "xml", ".rdf": "xml", ".xml": "xml", ".n3": "n3", ".nt": "nt", ".jsonld": "json-ld"}


def add_graph(key, text, suffix):
    """Store an ontology as Turtle and return its path and size."""
    GRAPHS.mkdir(parents=True, exist_ok=True)
    graph = Graph()
    graph.parse(data=text, format=FORMATS.get(suffix.lower(), "turtle"))
    path = GRAPHS / f"{re.sub(r'[^A-Za-z0-9_-]+', '-', key)}.ttl"
    graph.serialize(path, format="turtle")
    return json.dumps({"path": str(path), "triples": len(graph)})


def intent(text):
    return json.dumps(classify(text))


def ask(path, question, saved, retriever, reasoner, context, query):
    """Retrieve, reason, and build context. The agent's model call is left to JavaScript."""
    reasoner = json.loads(reasoner)
    wants_model = reasoner.get("id") == "agent"
    label = classify(question)
    result = run(
        path,
        question,
        label["intent"],
        json.loads(saved),
        json.loads(retriever),
        {"id": "none"} if wants_model else reasoner,
        json.loads(context),
        query=query,
    )
    if wants_model:
        result["reasoning"] = None
        result["model_prompt"] = (
            "Answer the question using only the ontology context below. Name the "
            "ontology terms you rely on. Say so if the context is not enough.\n\n"
            f"Context:\n{result['context']['text']}\n\nQuestion: {question}"
        )
    return json.dumps({"intent": label, **result})


def _context(text, examples):
    return Context(
        text=text,
        examples=[Example(nl=item["nl_text"], sparql=item["sparql"]) for item in json.loads(examples)[:8] if item.get("sparql")],
    )


def translation_prompt(path, question, context_text, examples):
    return build_prompt(question, load_vocabulary(path), _context(context_text, examples))


def finish_translation(path, reply, context_text, examples):
    """Clean the model's reply. On a parse error, also return the repair prompt."""
    sparql = apply_stages(prepare_draft(reply), load_vocabulary(path), _context(context_text, examples))
    error = parse_error(sparql)
    return json.dumps({"sparql": sparql, "error": error, "repair_prompt": repair_prompt(sparql, error) if error else ""})


def run_query(path, sparql, limit=50):
    graph, terms = load(path)
    result = graph.query(sparql)
    names = [str(name) for name in (result.vars or [])]
    rows = []
    for row in result:
        if len(rows) >= limit:
            break
        values = row if isinstance(row, tuple) else [row]
        rows.append([label_of(terms, value) if isinstance(value, (URIRef, BNode)) else ("" if value is None else str(value)) for value in values])
    return json.dumps({"vars": names, "rows": rows, "count": len(result)})
