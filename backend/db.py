"""SQLite storage for uploads, evaluation jobs, and question memory."""

import json
import os
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from backend.memory.intent import classify

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = Path(os.environ.get("ONTOCHECK_DATA", ROOT / "data"))
DB_PATH = DATA_DIR / "ontocheck.db"

_lock = threading.Lock()
_conn = None


def _now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _connect():
    global _conn
    if _conn is None:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        _conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        _conn.row_factory = sqlite3.Row
    return _conn


def init_db():
    with _lock:
        conn = _connect()
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS ontologies (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                name TEXT NOT NULL,
                content_hash TEXT NOT NULL,
                path TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS evaluation_runs (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                ontology_id TEXT NOT NULL,
                checks TEXT NOT NULL,
                status TEXT NOT NULL,
                error TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS evaluation_results (
                run_id TEXT PRIMARY KEY,
                payload TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS questions (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                ontology_id TEXT,
                nl_text TEXT NOT NULL,
                sparql TEXT NOT NULL,
                recall REAL,
                precision REAL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS retrievers (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                name TEXT NOT NULL,
                path TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_ontologies_session
                ON ontologies (session_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_questions_session
                ON questions (session_id, created_at);
            """
        )
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(questions)")}
        for name in QUESTION_COLUMNS:
            if name not in columns:
                conn.execute(f"ALTER TABLE questions ADD COLUMN {name} TEXT")
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_questions_intent ON questions (session_id, intent)"
        )
        # Label questions saved before intents were stored.
        for row in conn.execute("SELECT id, nl_text FROM questions WHERE intent IS NULL").fetchall():
            label = classify(row["nl_text"])
            conn.execute(
                "UPDATE questions SET intent = ?, intent_cue = ? WHERE id = ?",
                (label["intent"], label["cue"], row["id"]),
            )
        conn.commit()


# Added after the first release; init_db adds them to older databases.
# pipeline is JSON: {"retriever": ..., "reasoner": ..., "context": ...}.
QUESTION_COLUMNS = ("intent", "intent_cue", "pipeline", "source")


def _row(row):
    return dict(row) if row is not None else None


def create_ontology(session_id, name, content_hash, path):
    with _lock:
        conn = _connect()
        existing = conn.execute(
            """
            SELECT * FROM ontologies
            WHERE session_id = ? AND content_hash = ?
            """,
            (session_id, content_hash),
        ).fetchone()
        if existing:
            return _row(existing)
        record = {
            "id": str(uuid.uuid4()),
            "session_id": session_id,
            "name": name,
            "content_hash": content_hash,
            "path": str(path),
            "created_at": _now(),
        }
        conn.execute(
            """
            INSERT INTO ontologies (id, session_id, name, content_hash, path, created_at)
            VALUES (:id, :session_id, :name, :content_hash, :path, :created_at)
            """,
            record,
        )
        conn.commit()
        return record


def list_ontologies(session_id):
    with _lock:
        rows = _connect().execute(
            """
            SELECT id, name, content_hash, created_at
            FROM ontologies
            WHERE session_id = ?
            ORDER BY created_at DESC
            """,
            (session_id,),
        ).fetchall()
    return [_row(row) for row in rows]


def get_ontology(session_id, ontology_id):
    with _lock:
        row = _connect().execute(
            """
            SELECT * FROM ontologies
            WHERE session_id = ? AND id = ?
            """,
            (session_id, ontology_id),
        ).fetchone()
    return _row(row)


def create_run(session_id, ontology_id, checks):
    record = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "ontology_id": ontology_id,
        "checks": json.dumps(checks),
        "status": "queued",
        "error": None,
        "created_at": _now(),
        "updated_at": _now(),
    }
    with _lock:
        _connect().execute(
            """
            INSERT INTO evaluation_runs
                (id, session_id, ontology_id, checks, status, error, created_at, updated_at)
            VALUES
                (:id, :session_id, :ontology_id, :checks, :status, :error, :created_at, :updated_at)
            """,
            record,
        )
        _connect().commit()
    record["checks"] = checks
    return record


def update_run(run_id, status, error=None):
    with _lock:
        _connect().execute(
            """
            UPDATE evaluation_runs
            SET status = ?, error = ?, updated_at = ?
            WHERE id = ?
            """,
            (status, error, _now(), run_id),
        )
        _connect().commit()


def save_result(run_id, payload):
    encoded = json.dumps(payload)
    with _lock:
        _connect().execute(
            """
            INSERT INTO evaluation_results (run_id, payload)
            VALUES (?, ?)
            ON CONFLICT(run_id) DO UPDATE SET payload = excluded.payload
            """,
            (run_id, encoded),
        )
        _connect().commit()


def list_runs(session_id):
    with _lock:
        rows = _connect().execute(
            """
            SELECT
                runs.id,
                runs.ontology_id,
                runs.checks,
                runs.status,
                runs.error,
                runs.created_at,
                ontologies.name AS ontology_name,
                evaluation_results.payload
            FROM evaluation_runs AS runs
            LEFT JOIN ontologies
                ON ontologies.id = runs.ontology_id
            LEFT JOIN evaluation_results
                ON evaluation_results.run_id = runs.id
            WHERE runs.session_id = ?
            ORDER BY runs.created_at DESC
            """,
            (session_id,),
        ).fetchall()
    listed = []
    for row in rows:
        record = _row(row)
        payload = record.pop("payload")
        record["checks"] = json.loads(record["checks"])
        record["summary"] = _summarize_payload(
            json.loads(payload) if payload else None
        )
        listed.append(record)
    return listed


def _summarize_payload(payload):
    if not payload:
        return {}
    ontocheck = payload.get("ontocheck") or {}
    foops = payload.get("foops") or {}
    oops = (payload.get("oops") or {}).get("summary") or {}
    scores = [
        item.get("score")
        for item in (payload.get("oquare") or {}).get("characteristics") or []
        if isinstance(item.get("score"), (int, float))
    ]
    return {
        "recall": ontocheck.get("recall"),
        "precision": ontocheck.get("precision"),
        "foops": foops.get("overall"),
        "oops_critical": oops.get("critical"),
        "oops_important": oops.get("important"),
        "oquare": round(sum(scores) / len(scores), 2) if scores else None,
    }


def get_run(session_id, run_id):
    with _lock:
        conn = _connect()
        row = conn.execute(
            """
            SELECT * FROM evaluation_runs
            WHERE session_id = ? AND id = ?
            """,
            (session_id, run_id),
        ).fetchone()
        if row is None:
            return None
        record = _row(row)
        record["checks"] = json.loads(record["checks"])
        result = conn.execute(
            "SELECT payload FROM evaluation_results WHERE run_id = ?",
            (run_id,),
        ).fetchone()
    record["result"] = json.loads(result["payload"]) if result else None
    return record


def upsert_question(
    session_id,
    ontology_id,
    nl_text,
    sparql,
    recall=None,
    precision=None,
    intent=None,
    pipeline=None,
    source="evaluate",
):
    """Save a question once per SPARQL query, or once per text if it has none.

    A question first asked without SPARQL is filled in when it is evaluated.
    Scores already stored are kept when a later save has none.
    """
    sparql = (sparql or "").strip()
    nl_text = (nl_text or "").strip() or "SPARQL query"
    intent = intent or {}
    encoded = json.dumps(pipeline) if pipeline else None
    with _lock:
        conn = _connect()
        existing = None
        if sparql:
            existing = conn.execute(
                "SELECT id FROM questions WHERE session_id = ? AND sparql = ?",
                (session_id, sparql),
            ).fetchone()
        if existing is None:
            existing = conn.execute(
                """
                SELECT id FROM questions
                WHERE session_id = ? AND nl_text = ? AND sparql = ''
                """,
                (session_id, nl_text),
            ).fetchone()
        if existing:
            question_id = existing["id"]
            conn.execute(
                """
                UPDATE questions
                SET ontology_id = ?,
                    nl_text = ?,
                    sparql = CASE WHEN ? = '' THEN sparql ELSE ? END,
                    recall = COALESCE(?, recall),
                    precision = COALESCE(?, precision),
                    intent = COALESCE(?, intent),
                    intent_cue = COALESCE(?, intent_cue),
                    pipeline = COALESCE(?, pipeline),
                    source = ?
                WHERE id = ?
                """,
                (
                    ontology_id,
                    nl_text,
                    sparql,
                    sparql,
                    recall,
                    precision,
                    intent.get("intent"),
                    intent.get("cue"),
                    encoded,
                    source,
                    question_id,
                ),
            )
        else:
            question_id = str(uuid.uuid4())
            conn.execute(
                """
                INSERT INTO questions
                    (id, session_id, ontology_id, nl_text, sparql, recall, precision,
                     created_at, intent, intent_cue, pipeline, source)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    question_id,
                    session_id,
                    ontology_id,
                    nl_text,
                    sparql,
                    recall,
                    precision,
                    _now(),
                    intent.get("intent"),
                    intent.get("cue"),
                    encoded,
                    source,
                ),
            )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM questions WHERE id = ?",
            (question_id,),
        ).fetchone()
    return _question(row)


def _question(row):
    record = _row(row)
    if record is not None:
        record.pop("session_id", None)
        record["pipeline"] = json.loads(record["pipeline"]) if record.get("pipeline") else None
    return record


def list_questions(session_id, intent=None):
    query = """
        SELECT id, ontology_id, nl_text, sparql, recall, precision, created_at,
               intent, intent_cue, pipeline, source
        FROM questions
        WHERE session_id = ?
    """
    params = [session_id]
    if intent:
        query += " AND intent = ?"
        params.append(intent)
    with _lock:
        rows = _connect().execute(query + " ORDER BY created_at DESC", params).fetchall()
    return [_question(row) for row in rows]


def create_retriever(session_id, name, path):
    record = {
        "id": str(uuid.uuid4()),
        "session_id": session_id,
        "name": name,
        "path": str(path),
        "created_at": _now(),
    }
    with _lock:
        _connect().execute(
            """
            INSERT INTO retrievers (id, session_id, name, path, created_at)
            VALUES (:id, :session_id, :name, :path, :created_at)
            """,
            record,
        )
        _connect().commit()
    return record


def list_retrievers(session_id):
    with _lock:
        rows = _connect().execute(
            """
            SELECT id, name, path, created_at FROM retrievers
            WHERE session_id = ?
            ORDER BY created_at DESC
            """,
            (session_id,),
        ).fetchall()
    return [_row(row) for row in rows]
