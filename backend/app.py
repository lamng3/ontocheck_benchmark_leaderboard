"""HTTP API and static site for the OntoCheck evaluation workbench."""

import hashlib
import re
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend.db import (
    DATA_DIR,
    create_ontology,
    create_run,
    get_ontology,
    get_run,
    init_db,
    list_ontologies,
    list_runs,
)
from backend.evaluators.ontocheck_runner import score_queries, to_turtle
from backend.jobs import start_evaluation
from backend.memory.retrieval import select_context
from backend.memory.store import list_questions, upsert_question
from nl2sparql import Context, Example, generate

ROOT = Path(__file__).resolve().parents[1]
SESSION_COOKIE = "ontocheck_session"
ALLOWED_SUFFIXES = {".ttl", ".owl", ".rdf", ".xml", ".n3", ".nt", ".jsonld"}
CHECK_NAMES = {"foops", "oops", "oquare"}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024


@asynccontextmanager
async def lifespan(_app):
    init_db()
    (DATA_DIR / "uploads").mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="OntoCheck evaluation workbench", lifespan=lifespan)


@app.middleware("http")
async def attach_session(request: Request, call_next):
    session_id = request.cookies.get(SESSION_COOKIE)
    fresh = False
    if not session_id:
        session_id = str(uuid.uuid4())
        fresh = True
    request.state.session_id = session_id
    response = await call_next(request)
    if fresh:
        response.set_cookie(
            SESSION_COOKIE,
            session_id,
            httponly=True,
            samesite="lax",
            max_age=60 * 60 * 24 * 365,
        )
    return response


class EvaluationRequest(BaseModel):
    ontology_id: str
    checks: list[str]
    questions: list[dict] = Field(default_factory=list)
    domain_prefixes: str = ""


class TranslateRequest(BaseModel):
    ontology_id: str
    nl_text: str
    context: str = ""


class QuestionRequest(BaseModel):
    ontology_id: str
    nl_text: str = ""
    sparql: str = ""


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/")
def home():
    return FileResponse(ROOT / "index.html")


@app.get("/styles.css")
def styles():
    return FileResponse(ROOT / "styles.css", media_type="text/css")


@app.get("/script.js")
def script():
    return FileResponse(ROOT / "script.js", media_type="text/javascript")


@app.get("/api/ontologies")
def read_ontologies(request: Request):
    return {"ontologies": list_ontologies(request.state.session_id)}


@app.post("/api/ontologies")
async def upload_ontology(
    request: Request,
    file: UploadFile = File(...),
    name: str = Form(""),
):
    filename = file.filename or "ontology.ttl"
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail="Upload a Turtle, RDF/XML, JSON-LD, or OWL file.",
        )
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="The ontology file is empty.")
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=400, detail="Ontology files must be 25 MB or smaller."
        )
    digest = hashlib.sha256(raw).hexdigest()
    display_name = (name or filename).strip() or filename
    session_id = request.state.session_id
    existing = _existing_hash(session_id, digest)
    if existing:
        return _public_ontology(existing)

    upload_dir = DATA_DIR / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)
    temp_path = upload_dir / f"incoming-{digest[:12]}{suffix}"
    temp_path.write_bytes(raw)
    turtle_path = upload_dir / f"{digest}.ttl"
    try:
        to_turtle(temp_path, turtle_path)
    except Exception as exc:
        temp_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail=f"Could not read that file as an ontology: {exc}",
        ) from exc
    finally:
        temp_path.unlink(missing_ok=True)

    record = create_ontology(session_id, display_name, digest, turtle_path)
    return _public_ontology(record)


@app.post("/api/evaluations")
def start_run(request: Request, body: EvaluationRequest):
    checks = _valid_checks(body.checks)
    ontology = _owned_ontology(request.state.session_id, body.ontology_id)
    sparqls = []
    for question in body.questions[:200]:
        sparql = (
            question.get("sparql_query") or question.get("sparql") or ""
        ).strip()
        if sparql:
            sparqls.append(sparql)
    prefixes = [
        part.strip()
        for part in re.split(r"[\s,]+", body.domain_prefixes or "")
        if part.strip()
    ]
    run = create_run(request.state.session_id, ontology["id"], checks)
    run["sparql_queries"] = sparqls
    run["domain_prefixes"] = prefixes
    start_evaluation(request.state.session_id, run)
    return {"id": run["id"], "status": "queued"}


@app.get("/api/evaluations")
def read_runs(request: Request):
    return {"evaluations": list_runs(request.state.session_id)}


@app.get("/api/evaluations/{run_id}")
def read_run(request: Request, run_id: str):
    run = get_run(request.state.session_id, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Evaluation not found.")
    return {
        "id": run["id"],
        "status": run["status"],
        "error": run["error"],
        "checks": run["checks"],
        "result": run["result"] if run["status"] == "complete" else None,
    }


@app.get("/api/questions")
def read_questions(request: Request):
    return {"questions": list_questions(request.state.session_id)}


@app.post("/api/questions/translate")
def translate_question(request: Request, body: TranslateRequest):
    if not body.nl_text.strip():
        raise HTTPException(status_code=400, detail="Enter a question to translate.")
    ontology = _owned_ontology(request.state.session_id, body.ontology_id)
    examples = [
        Example(nl=item["nl_text"], sparql=item["sparql"])
        for item in list_questions(request.state.session_id)[:8]
        if (item.get("sparql") or "").strip()
    ]
    try:
        return generate(
            body.nl_text,
            ontology["path"],
            context=Context(text=body.context, examples=examples),
        )
    except LookupError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502, detail=f"Translation failed: {exc}"
        ) from exc


@app.post("/api/questions/evaluate")
def evaluate_question(request: Request, body: QuestionRequest):
    if not body.sparql.strip():
        raise HTTPException(status_code=400, detail="A SPARQL query is required.")
    ontology = _owned_ontology(request.state.session_id, body.ontology_id)
    report = score_queries(
        ontology["path"],
        [{"nl_text": body.nl_text, "sparql": body.sparql}],
    )
    _remember(request.state.session_id, ontology["id"], report["queries"])
    return report


@app.post("/api/questions/context-evaluate")
def context_evaluate(request: Request, body: QuestionRequest):
    ontology = _owned_ontology(request.state.session_id, body.ontology_id)
    stored = list_questions(request.state.session_id)
    selected = select_context(stored, body.nl_text, body.sparql)
    items = []
    seen = set()
    if body.sparql.strip():
        items.append({"nl_text": body.nl_text, "sparql": body.sparql.strip()})
        seen.add(body.sparql.strip())
    for question in selected:
        if question["sparql"] not in seen:
            items.append(question)
            seen.add(question["sparql"])
    if not items:
        raise HTTPException(
            status_code=400,
            detail="Enter a SPARQL query, or save one, before context evaluation.",
        )
    report = score_queries(ontology["path"], items)
    _remember(request.state.session_id, ontology["id"], report["queries"])
    return report


def _remember(session_id, ontology_id, queries):
    for query in queries:
        sparql = (query.get("sparql") or "").strip()
        if not sparql or query.get("error"):
            continue
        upsert_question(
            session_id,
            ontology_id,
            query.get("nl_text") or "",
            sparql,
            query.get("recall"),
            query.get("precision"),
        )


def _valid_checks(checks):
    selected = []
    for check in checks:
        name = check.strip().lower()
        if name in CHECK_NAMES and name not in selected:
            selected.append(name)
    if not selected:
        raise HTTPException(
            status_code=400,
            detail="Select at least one of FOOPS, OOPS, or OQuaRE.",
        )
    return selected


def _owned_ontology(session_id, ontology_id):
    ontology = get_ontology(session_id, ontology_id)
    if ontology is None:
        raise HTTPException(status_code=404, detail="Choose an uploaded ontology.")
    return ontology


def _existing_hash(session_id, digest):
    for ontology in list_ontologies(session_id):
        if ontology["content_hash"] == digest:
            return get_ontology(session_id, ontology["id"])
    return None


def _public_ontology(record):
    return {
        "id": record["id"],
        "name": record["name"],
        "content_hash": record["content_hash"],
        "created_at": record["created_at"],
    }
