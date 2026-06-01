"""SQLite persistence layer for IntelliBanker."""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent / "intellibanker.db"


def get_conn() -> sqlite3.Connection:
    """Create a fresh connection. Caller is responsible for closing it."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_conn()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS visit_records (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id     TEXT NOT NULL,
            customer_id TEXT NOT NULL,
            customer_type TEXT NOT NULL,
            manager_id  TEXT,
            stage       TEXT NOT NULL,
            data        TEXT DEFAULT '{}',
            summary     TEXT,
            tags        TEXT DEFAULT '[]',
            follow_up_tasks TEXT DEFAULT '[]',
            created_at  TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS operation_logs (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            action    TEXT NOT NULL,
            target    TEXT,
            role      TEXT,
            detail    TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS chat_sessions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            role        TEXT NOT NULL,
            title       TEXT,
            messages    TEXT DEFAULT '[]',
            created_at  TEXT NOT NULL,
            updated_at  TEXT NOT NULL
        );
    """)
    conn.commit()
    conn.close()


# ── Visit Records ──────────────────────────────────────

def save_visit_record(
    conn: sqlite3.Connection,
    task_id: str,
    customer_id: str,
    customer_type: str,
    manager_id: Optional[str],
    stage: str,
    data: Optional[dict] = None,
    summary: Optional[str] = None,
    tags: Optional[list] = None,
    follow_up_tasks: Optional[list] = None,
) -> int:
    cur = conn.execute(
        """INSERT INTO visit_records
           (task_id, customer_id, customer_type, manager_id, stage, data, summary, tags, follow_up_tasks, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            task_id, customer_id, customer_type, manager_id, stage,
            json.dumps(data or {}, ensure_ascii=False),
            summary,
            json.dumps(tags or [], ensure_ascii=False),
            json.dumps(follow_up_tasks or [], ensure_ascii=False),
            datetime.now().isoformat(),
        ),
    )
    conn.commit()
    return cur.lastrowid


def update_visit_record(conn: sqlite3.Connection, task_id: str, stage: str, **kwargs) -> bool:
    sets = ["stage = ?"]
    params: list = [stage]
    for key in ("data", "summary", "tags", "follow_up_tasks"):
        if key in kwargs:
            sets.append(f"{key} = ?")
            params.append(json.dumps(kwargs[key], ensure_ascii=False) if isinstance(kwargs[key], (dict, list)) else kwargs[key])
    params.append(task_id)
    cur = conn.execute(f"UPDATE visit_records SET {', '.join(sets)} WHERE task_id = ?", params)
    conn.commit()
    return cur.rowcount > 0


def get_visit_record(conn: sqlite3.Connection, task_id: str) -> Optional[dict]:
    row = conn.execute("SELECT * FROM visit_records WHERE task_id = ? ORDER BY created_at DESC LIMIT 1", (task_id,)).fetchone()
    return _row_to_dict(row) if row else None


def get_visit_records(
    conn: sqlite3.Connection,
    customer_id: Optional[str] = None,
    customer_type: Optional[str] = None,
    manager_id: Optional[str] = None,
    limit: int = 50,
) -> list[dict]:
    sql = "SELECT * FROM visit_records WHERE 1=1"
    params: list = []
    if customer_id:
        sql += " AND customer_id = ?"
        params.append(customer_id)
    if customer_type:
        sql += " AND customer_type = ?"
        params.append(customer_type)
    if manager_id:
        sql += " AND manager_id = ?"
        params.append(manager_id)
    sql += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    rows = conn.execute(sql, params).fetchall()
    return [_row_to_dict(r) for r in rows]


def _row_to_dict(row: sqlite3.Row) -> dict:
    d = dict(row)
    for key in ("data", "tags", "follow_up_tasks", "messages"):
        if key in d and isinstance(d[key], str):
            try:
                d[key] = json.loads(d[key])
            except (json.JSONDecodeError, TypeError):
                pass
    return d


# ── Operation Logs ─────────────────────────────────────

def log_operation(conn: sqlite3.Connection, action: str, target: str = "", role: str = "", detail: str = "") -> int:
    cur = conn.execute(
        "INSERT INTO operation_logs (action, target, role, detail, created_at) VALUES (?, ?, ?, ?, ?)",
        (action, target, role, detail, datetime.now().isoformat()),
    )
    conn.commit()
    return cur.lastrowid


def get_operation_logs(conn: sqlite3.Connection, role: Optional[str] = None, limit: int = 100) -> list[dict]:
    sql = "SELECT * FROM operation_logs WHERE 1=1"
    params: list = []
    if role:
        sql += " AND role = ?"
        params.append(role)
    sql += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    rows = conn.execute(sql, params).fetchall()
    return [dict(r) for r in rows]


# ── Chat Sessions ──────────────────────────────────────

def save_chat_session(conn: sqlite3.Connection, role: str, messages: list[dict], title: str = "", session_id: Optional[int] = None) -> int:
    now = datetime.now().isoformat()
    messages_json = json.dumps(messages, ensure_ascii=False)

    if session_id:
        conn.execute(
            "UPDATE chat_sessions SET messages = ?, title = ?, updated_at = ? WHERE id = ?",
            (messages_json, title or None, now, session_id),
        )
        conn.commit()
        return session_id
    else:
        cur = conn.execute(
            "INSERT INTO chat_sessions (role, title, messages, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
            (role, title or None, messages_json, now, now),
        )
        conn.commit()
        return cur.lastrowid


def get_chat_sessions(conn: sqlite3.Connection, role: str, limit: int = 20) -> list[dict]:
    rows = conn.execute(
        "SELECT id, role, title, created_at, updated_at FROM chat_sessions WHERE role = ? ORDER BY updated_at DESC LIMIT ?",
        (role, limit),
    ).fetchall()
    return [dict(r) for r in rows]


def get_chat_session(conn: sqlite3.Connection, session_id: int) -> Optional[dict]:
    row = conn.execute("SELECT * FROM chat_sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        return None
    return _row_to_dict(row)


def delete_chat_session(conn: sqlite3.Connection, session_id: int) -> bool:
    conn.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
    conn.commit()
    return True
