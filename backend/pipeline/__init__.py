"""Ask pipeline: knowledge graph -> retriever -> reasoner -> context."""

import json
from pathlib import Path

from backend.memory.retrieval import rank_questions
from backend.pipeline.graph import load, schema_summary
from backend.pipeline.reasoners import ReasonerError, reason
from backend.pipeline.retrievers import RetrieverError, retrieve

OPTIONS_PATH = Path(__file__).resolve().parents[2] / "pipeline-options.json"
OPTIONS = json.loads(OPTIONS_PATH.read_text())

__all__ = ["OPTIONS", "ReasonerError", "RetrieverError", "build_context", "run"]


def build_context(config, question, intent, saved, graph=None, terms=None, hits=(), reasoning=None):
    """Assemble the sections the user switched on, in a fixed order."""
    sections = []
    if config.get("retrieved", True) and hits:
        lines = [f"{hit['label']} ({hit['kind']}) <{hit['iri']}>" if hit["iri"] else hit["label"] for hit in hits]
        sections.append({"id": "retrieved", "title": "Retrieved terms", "text": "\n".join(lines)})
    if config.get("reasoning", True) and reasoning and reasoning.get("text") and reasoning["kind"] != "answer":
        sections.append({"id": "reasoning", "title": "Reasoner output", "text": reasoning["text"]})
    if config.get("saved", True) and saved:
        pool = [item for item in saved if item.get("intent") == intent] if config.get("same_intent") else saved
        ranked = [item for score, item in rank_questions(pool, question, "") if score > 0 or len(pool) <= 3]
        picked = ranked[: int(config.get("saved_k", 5))]
        if picked:
            text = "\n\n".join(
                f"Q: {item['nl_text']}" + (f"\nSPARQL: {item['sparql']}" if item.get("sparql") else "") for item in picked
            )
            sections.append({"id": "saved", "title": f"Saved questions ({len(picked)})", "text": text})
    if config.get("schema") and graph is not None:
        sections.append({"id": "schema", "title": "Schema summary", "text": schema_summary(graph, terms)})
    notes = (config.get("notes_text") or "").strip()
    if config.get("notes", True) and notes:
        sections.append({"id": "notes", "title": "Your notes", "text": notes})

    budget = int(config.get("max_chars", 6000))
    text = ""
    for section in sections:
        block = f"## {section['title']}\n{section['text']}\n\n"
        if len(text) + len(block) > budget:
            section["truncated"] = True
            text += block[: max(budget - len(text), 0)]
            break
        text += block
    return {"sections": sections, "text": text.strip(), "chars": len(text.strip())}


def run(ontology_path, question, intent, saved, retriever, reasoner, context, query="", script_path=None):
    graph, terms = load(ontology_path)
    hits = retrieve(
        retriever.get("id", "ann"),
        question,
        graph,
        terms,
        k=retriever.get("k", 8),
        query=query,
        script_path=script_path,
    )
    reasoner_id = reasoner.get("id", "path")
    reasoning = None
    if reasoner_id != "agent":
        reasoning = reason(reasoner_id, graph, terms, hits, hops=reasoner.get("hops", 3))
    built = build_context(context, question, intent, saved, graph, terms, hits, reasoning)
    if reasoner_id == "agent":
        # The agent reads the context the other stages produced.
        reasoning = reason("agent", graph, terms, hits, question=question, context_text=built["text"], model=reasoner.get("model", ""))
    return {"retrieved": hits, "reasoning": reasoning, "context": built}
