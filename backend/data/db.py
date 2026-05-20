"""SQLite persistence layer for IntelliBanker."""
from __future__ import annotations

import json
import sqlite3
import threading
from datetime import datetime
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).parent / "intellibanker.db"
_local = threading.local()


def _get_conn() -> sqlite3.Connection:
    if not hasattr(_local, "conn") or _local.conn is None:
        _local.conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        _local.conn.row_factory = sqlite3.Row
        _local.conn.execute("PRAGMA journal_mode=WAL")
        _local.conn.execute("PRAGMA foreign_keys=ON")
    return _local.conn


def init_db():
    conn = _get_conn()
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


# ── Visit Records ──────────────────────────────────────

def save_visit_record(
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
    conn = _get_conn()
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


def update_visit_record(task_id: str, stage: str, **kwargs) -> bool:
    conn = _get_conn()
    sets = ["stage = ?"]
    params = [stage]
    for key in ("data", "summary", "tags", "follow_up_tasks"):
        if key in kwargs:
            sets.append(f"{key} = ?")
            params.append(json.dumps(kwargs[key], ensure_ascii=False) if isinstance(kwargs[key], (dict, list)) else kwargs[key])
    params.append(task_id)
    conn.execute(f"UPDATE visit_records SET {', '.join(sets)} WHERE task_id = ?", params)
    conn.commit()
    return True


def get_visit_records(
    customer_id: Optional[str] = None,
    customer_type: Optional[str] = None,
    manager_id: Optional[str] = None,
    limit: int = 50,
) -> list[dict]:
    conn = _get_conn()
    sql = "SELECT * FROM visit_records WHERE 1=1"
    params = []
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
    for key in ("data", "tags", "follow_up_tasks"):
        if key in d and isinstance(d[key], str):
            try:
                d[key] = json.loads(d[key])
            except (json.JSONDecodeError, TypeError):
                pass
    return d


# ── Operation Logs ─────────────────────────────────────

def log_operation(action: str, target: str = "", role: str = "", detail: str = "") -> int:
    conn = _get_conn()
    cur = conn.execute(
        "INSERT INTO operation_logs (action, target, role, detail, created_at) VALUES (?, ?, ?, ?, ?)",
        (action, target, role, detail, datetime.now().isoformat()),
    )
    conn.commit()
    return cur.lastrowid


def get_operation_logs(role: Optional[str] = None, limit: int = 100) -> list[dict]:
    conn = _get_conn()
    if role:
        rows = conn.execute(
            "SELECT * FROM operation_logs WHERE role = ? ORDER BY created_at DESC LIMIT ?",
            (role, limit),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM operation_logs ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]


# ── Chat Sessions ──────────────────────────────────────

def save_chat_session(role: str, messages: list[dict], title: str = "", session_id: Optional[int] = None) -> int:
    conn = _get_conn()
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


def get_chat_sessions(role: str, limit: int = 20) -> list[dict]:
    conn = _get_conn()
    rows = conn.execute(
        "SELECT id, role, title, created_at, updated_at FROM chat_sessions WHERE role = ? ORDER BY updated_at DESC LIMIT ?",
        (role, limit),
    ).fetchall()
    return [dict(r) for r in rows]


def get_chat_session(session_id: int) -> Optional[dict]:
    conn = _get_conn()
    row = conn.execute("SELECT * FROM chat_sessions WHERE id = ?", (session_id,)).fetchone()
    if not row:
        return None
    d = _row_to_dict(row)
    if isinstance(d.get("messages"), str):
        try:
            d["messages"] = json.loads(d["messages"])
        except (json.JSONDecodeError, TypeError):
            d["messages"] = []
    return d


def delete_chat_session(session_id: int) -> bool:
    conn = _get_conn()
    conn.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
    conn.commit()
    return True
