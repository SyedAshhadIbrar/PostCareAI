"""SQLite persistence for patient cases. ponytail: one table, JSON blob, stdlib only."""

from __future__ import annotations

import json
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

from backend.schemas.case import PostCareCase

DB_PATH = Path(__file__).resolve().parents[2] / "postcare.db"


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS cases (
                case_id TEXT PRIMARY KEY,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                name TEXT NOT NULL
            )
            """
        )


def save_case(case: PostCareCase) -> PostCareCase:
    init_db()
    payload = case.model_dump(mode="json")
    with _connect() as conn:
        conn.execute(
            "INSERT INTO cases (case_id, data, created_at) VALUES (?, ?, ?)",
            (case.case_id, json.dumps(payload), datetime.now(timezone.utc).isoformat()),
        )
    return case


def _load_case(row: sqlite3.Row) -> PostCareCase:
    data = json.loads(row["data"])
    data["created_at"] = row["created_at"]
    return PostCareCase.model_validate(data)


def get_case(case_id: str) -> PostCareCase | None:
    init_db()
    with _connect() as conn:
        row = conn.execute(
            "SELECT data, created_at FROM cases WHERE case_id = ?", (case_id,)
        ).fetchone()
    if not row:
        return None
    return _load_case(row)


def update_case(case: PostCareCase) -> PostCareCase:
    init_db()
    with _connect() as conn:
        conn.execute(
            "UPDATE cases SET data = ? WHERE case_id = ?",
            (json.dumps(case.model_dump(mode="json")), case.case_id),
        )
    return case


_PRIORITY_ORDER = {"high": 0, "needs_review": 1, "routine": 2}


def _case_sort_key(case: PostCareCase) -> tuple:
    reviewed = 1 if case.status == "reviewed" else 0
    priority = _PRIORITY_ORDER.get(case.clinician_priority or "routine", 9)
    return (reviewed, priority, case.created_at or "")


def list_cases() -> list[PostCareCase]:
    init_db()
    with _connect() as conn:
        rows = conn.execute("SELECT data, created_at FROM cases").fetchall()
    cases = [_load_case(row) for row in rows]
    cases.sort(key=_case_sort_key)
    return cases


def new_case_id() -> str:
    return f"PC-{uuid.uuid4().hex[:6].upper()}"


if __name__ == "__main__":
    import sys

    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
    from backend.schemas.case import PostCareCase as _PostCareCase

    init_db()
    sample = _PostCareCase(
        case_id=new_case_id(),
        patient={
            "pain_score": 3,
            "procedure": "appendectomy",
            "post_op_day": 5,
        },
        wound={
            "healing_status": {"positive": False, "score": 0.2, "threshold": 0.5},
            "erythema": {"positive": False, "score": 0.1, "threshold": 0.5},
            "edema": {"positive": False, "score": 0.1, "threshold": 0.5},
            "infection_risk": {"positive": False, "score": 0.1, "threshold": 0.5},
            "urgency": {"positive": False, "score": 0.1, "threshold": 0.5},
            "exudate": {"positive": False, "score": 0.1, "threshold": 0.5},
        },
    )
    save_case(sample)
    loaded = get_case(sample.case_id)
    assert loaded and loaded.case_id == sample.case_id
    print(f"ok: {sample.case_id}")

import hashlib

def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_user(email: str, password: str, role: str, name: str) -> dict | None:
    init_db()
    user_id = f"U-{uuid.uuid4().hex[:8].upper()}"
    pwd_hash = _hash_password(password)
    try:
        with _connect() as conn:
            conn.execute(
                "INSERT INTO users (id, email, password_hash, role, name) VALUES (?, ?, ?, ?, ?)",
                (user_id, email, pwd_hash, role, name)
            )
        return {"id": user_id, "email": email, "role": role, "name": name}
    except sqlite3.IntegrityError:
        return None  # Email already exists

def authenticate_user(email: str, password: str) -> dict | None:
    init_db()
    pwd_hash = _hash_password(password)
    with _connect() as conn:
        row = conn.execute(
            "SELECT id, email, role, name FROM users WHERE email = ? AND password_hash = ?",
            (email, pwd_hash)
        ).fetchone()
        
    if row:
        return dict(row)
    return None


DEMO_USERS = (
    {
        "email": "patient@postcare.test",
        "password": "patient123",
        "role": "patient",
        "name": "Demo Patient",
    },
    {
        "email": "clinician@postcare.test",
        "password": "clinician123",
        "role": "clinician",
        "name": "Dr. Chen",
    },
)


def seed_demo_users() -> None:
    """Create demo logins for patient and clinician flows if missing."""
    for user in DEMO_USERS:
        create_user(user["email"], user["password"], user["role"], user["name"])
