"""HTTP API and static site for the OntoCheck evaluation workbench."""

import hashlib
import os
import re
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from backend.db import (
    DATA_DIR,
    create_ontology,
    create_retriever,
    create_run,
    get_ontology,
    get_run,
    init_db,
    list_ontologies,
    list_retrievers,
    list_runs,
)
from backend.evaluators.ontocheck_runner import score_queries, to_turtle
from backend.examples import get_example, list_examples
from backend.jobs import start_evaluation
from backend.memory.intent import classify
from backend.memory.retrieval import select_context
from backend.memory.store import list_questions, upsert_question
from backend.pipeline import OPTIONS, ReasonerError, RetrieverError
from backend.pipeline import run as run_pipeline
from nl2sparql import Context, Example, generate

ROOT = Path(__file__).resolve().parents[1]
SESSION_COOKIE = "ontocheck_session"
ALLOWED_SUFFIXES = {".ttl", ".owl", ".rdf", ".xml", ".n3", ".nt", ".jsonld"}
CHECK_NAMES = {"foops", "oops", "oquare"}
# A public deployment (ONTOCHECK_PUBLIC=1) serves Evaluate to anyone: smaller
# uploads, a cap on evaluations per visitor, and no user code.
PUBLIC = os.environ.get("ONTOCHECK_PUBLIC") == "1"
MAX_UPLOAD_BYTES = (5 if PUBLIC else 25) * 1024 * 1024
RUNS_PER_HOUR = 12
SESSION_HEADER = "x-ontocheck-session"
SESSION_PATTERN = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$")
MAX_SCRIPT_BYTES = 200 * 1024


@asynccontextmanager
async def lifespan(_app):
    init_db()
    (DATA_DIR / "uploads").mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "retrievers").mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="OntoCheck evaluation workbench", lifespan=lifespan)

# The site calls a public deployment from another origin. It sends the session
# as a header, since browsers block third-party cookies.
_origins = [o.strip() for o in os.environ.get("ONTOCHECK_CORS_ORIGINS", "").split(",") if o.strip()]
if _origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_methods=["GET", "POST"],
        allow_headers=["content-type", SESSION_HEADER],
    )


@app.middleware("http")
async def attach_session(request: Request, call_next):
    session_id = request.headers.get(SESSION_HEADER) or request.cookies.get(SESSION_COOKIE)
    if session_id and not SESSION_PATTERN.match(session_id):
        session_id = None
    fresh = False
    if not session_id:
        session_id = str(uuid.uuid4())
        fresh = True
    request.state.session_id = session_id
    response = await call_next(request)
    if fresh and SESSION_HEADER not in request.headers:
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
    pipeline: dict | None = None


class AskRequest(BaseModel):
    ontology_id: str
    nl_text: str
    query: str = ""
    retriever: dict = Field(default_factory=lambda: {"id": "ann", "k": 8})
    reasoner: dict = Field(default_factory=lambda: {"id": "path", "hops": 3})
    context: dict = Field(default_factory=dict)


class IntentRequest(BaseModel):
    text: str


@app.get("/api/health")
def health():
    return {"ok": True, "hosted": PUBLIC, "max_upload_mb": MAX_UPLOAD_BYTES // (1024 * 1024)}


@app.get("/")
def home():
    return FileResponse(ROOT / "index.html")


@app.get("/styles.css")
def styles():
    return FileResponse(ROOT / "styles.css", media_type="text/css")


@app.get("/script.js")
def script():
    return FileResponse(ROOT / "script.js", media_type="text/javascript")


@app.get("/benchmark-frameworks.json")
def benchmark_frameworks():
    return FileResponse(ROOT / "benchmark-frameworks.json", media_type="application/json")


@app.get("/ontocheck-results.json")
def ontocheck_results():
    return FileResponse(ROOT / "ontocheck-results.json", media_type="application/json")


@app.get("/examples/{name}")
def example_file(name: str):
    path = ROOT / "examples" / Path(name).name
    if not path.is_file():
        raise HTTPException(status_code=404, detail="No such example.")
    return FileResponse(path)


@app.get("/pipeline-options.json")
def pipeline_options():
    return FileResponse(ROOT / "pipeline-options.json", media_type="application/json")


@app.get("/api/ontologies")
def read_ontologies(request: Request):
    return {"ontologies": list_ontologies(request.state.session_id), "examples": list_examples()}


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
            status_code=400, detail=f"Ontology files must be {MAX_UPLOAD_BYTES // (1024 * 1024)} MB or smaller."
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
    if PUBLIC:
        _check_run_quota(request.state.session_id)
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
    runs = list_runs(request.state.session_id)
    for run in runs:
        example = get_example(run["ontology_id"])
        if example and not run.get("ontology_name"):
            run["ontology_name"] = example["name"]
    return {"evaluations": runs}


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
def read_questions(request: Request, intent: str = ""):
    return {"questions": list_questions(request.state.session_id, intent or None)}


@app.post("/api/intent")
def read_intent(body: IntentRequest):
    return classify(body.text)


@app.get("/api/pipeline")
def read_pipeline(request: Request):
    """Pipeline options, with whether each one can run on this backend."""
    ready = {
        "neo4j": bool(os.environ.get("NEO4J_URI")) and not PUBLIC,
        "scripts": os.environ.get("ONTOCHECK_ALLOW_SCRIPTS") == "1" and not PUBLIC,
        "ollama": True,
        "planned": False,
    }
    def mark(option):
        need = option.get("requires")
        return {**option, "available": ready.get(need, True) if need else True}
    return {
        **OPTIONS,
        "retrievers": [mark(item) for item in OPTIONS["retrievers"]],
        "reasoners": [mark(item) for item in OPTIONS["reasoners"]],
        "scripts": [
            {"id": item["id"], "name": item["name"], "created_at": item["created_at"]}
            for item in list_retrievers(request.state.session_id)
        ],
    }


@app.post("/api/retrievers")
async def upload_retriever(request: Request, file: UploadFile = File(...)):
    if PUBLIC:
        raise HTTPException(status_code=403, detail="Uploaded retrievers run only on a local backend.")
    filename = Path(file.filename or "retriever.py").name
    if not filename.endswith(".py"):
        raise HTTPException(status_code=400, detail="Upload a Python file (.py).")
    raw = await file.read()
    if not raw or len(raw) > MAX_SCRIPT_BYTES:
        raise HTTPException(status_code=400, detail="Retriever scripts must be 1 byte to 200 KB.")
    if b"def retrieve" not in raw:
        raise HTTPException(status_code=400, detail="The script must define retrieve(question, graph, k).")
    path = DATA_DIR / "retrievers" / f"{hashlib.sha256(raw).hexdigest()[:16]}.py"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(raw)
    record = create_retriever(request.state.session_id, filename, path)
    return {"id": record["id"], "name": record["name"], "created_at": record["created_at"]}


@app.post("/api/ask")
def ask(request: Request, body: AskRequest):
    """Retrieve, reason, and assemble context, then save the question."""
    if not body.nl_text.strip():
        raise HTTPException(status_code=400, detail="Enter a question.")
    session_id = request.state.session_id
    ontology = _owned_ontology(session_id, body.ontology_id)
    intent = classify(body.nl_text)
    script_path = None
    if body.retriever.get("id") == "script":
        scripts = {item["id"]: item for item in list_retrievers(session_id)}
        chosen = scripts.get(body.retriever.get("script_id") or "")
        script_path = chosen["path"] if chosen else None
    try:
        result = run_pipeline(
            ontology["path"],
            body.nl_text,
            intent["intent"],
            list_questions(session_id),
            body.retriever,
            body.reasoner,
            body.context,
            query=body.query,
            script_path=script_path,
        )
    except (RetrieverError, ReasonerError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    pipeline = _pipeline_record(body.retriever, body.reasoner, body.context)
    upsert_question(session_id, ontology["id"], body.nl_text, "", intent=intent, pipeline=pipeline, source="ask")
    return {"intent": intent, **result}


@app.post("/api/questions/translate")
def translate_question(request: Request, body: TranslateRequest):
    if not body.nl_text.strip():
        raise HTTPException(status_code=400, detail="Enter a question to translate.")
    ontology = _owned_ontology(request.state.session_id, body.ontology_id)
    upsert_question(
        request.state.session_id,
        ontology["id"],
        body.nl_text,
        "",
        intent=classify(body.nl_text),
        source="translate",
    )
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
    _remember(request.state.session_id, ontology["id"], report["queries"], body.pipeline)
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
    _remember(request.state.session_id, ontology["id"], report["queries"], body.pipeline)
    return report


def _pipeline_record(retriever, reasoner, context):
    """What to store with a question: settings only, not the user's notes."""
    return {
        "retriever": {key: value for key, value in retriever.items() if key != "query"},
        "reasoner": reasoner,
        "context": {key: value for key, value in context.items() if key != "notes_text"},
    }


def _remember(session_id, ontology_id, queries, pipeline=None):
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
            intent=classify(query.get("nl_text") or ""),
            pipeline=pipeline,
        )


def _check_run_quota(session_id):
    """One evaluation at a time per visitor, and a few per hour."""
    runs = list_runs(session_id)
    if any(run["status"] in ("queued", "running") for run in runs):
        raise HTTPException(status_code=429, detail="Your previous evaluation is still running. Wait for it to finish.")
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    if sum(1 for run in runs if run["created_at"] >= cutoff) >= RUNS_PER_HOUR:
        raise HTTPException(status_code=429, detail=f"This server runs up to {RUNS_PER_HOUR} evaluations per visitor per hour. Try again later.")


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
    ontology = get_example(ontology_id) or get_ontology(session_id, ontology_id)
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
