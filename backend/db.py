"""SQLite storage for uploads, evaluation jobs, and question memory."""

import json
import os
import sqlite3
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

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
            CREATE INDEX IF NOT EXISTS idx_ontologies_session
                ON ontologies (session_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_questions_session
                ON questions (session_id, created_at);
            """
        )
        conn.commit()


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


def upsert_question(session_id, ontology_id, nl_text, sparql, recall, precision):
    sparql = sparql.strip()
    nl_text = (nl_text or "").strip() or "SPARQL query"
    with _lock:
        conn = _connect()
        existing = conn.execute(
            """
            SELECT id FROM questions
            WHERE session_id = ? AND sparql = ?
            """,
            (session_id, sparql),
        ).fetchone()
        if existing:
            conn.execute(
                """
                UPDATE questions
                SET ontology_id = ?, nl_text = ?, recall = ?, precision = ?
                WHERE id = ?
                """,
                (ontology_id, nl_text, recall, precision, existing["id"]),
            )
            conn.commit()
            question_id = existing["id"]
        else:
            question_id = str(uuid.uuid4())
            conn.execute(
                """
                INSERT INTO questions
                    (id, session_id, ontology_id, nl_text, sparql, recall, precision, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
                ),
            )
            conn.commit()
        row = conn.execute(
            "SELECT * FROM questions WHERE id = ?",
            (question_id,),
        ).fetchone()
    return _row(row)


def list_questions(session_id):
    with _lock:
        rows = _connect().execute(
            """
            SELECT id, ontology_id, nl_text, sparql, recall, precision, created_at
            FROM questions
            WHERE session_id = ?
            ORDER BY created_at DESC
            """,
            (session_id,),
        ).fetchall()
    return [_row(row) for row in rows]
