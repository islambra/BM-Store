from __future__ import annotations

import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.config import DB_PATH


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'active'
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            );

            CREATE TABLE IF NOT EXISTS handoffs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                reason TEXT NOT NULL,
                summary TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id)
            );
            """
        )


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_conversation() -> str:
    conversation_id = str(uuid.uuid4())
    stamp = now_iso()
    with _connect() as conn:
        conn.execute(
            "INSERT INTO conversations (id, created_at, updated_at, status) VALUES (?, ?, ?, 'active')",
            (conversation_id, stamp, stamp),
        )
    return conversation_id


def conversation_exists(conversation_id: str) -> bool:
    with _connect() as conn:
        row = conn.execute("SELECT id FROM conversations WHERE id = ?", (conversation_id,)).fetchone()
    return row is not None


def get_conversation(conversation_id: str) -> Optional[dict]:
    with _connect() as conn:
        row = conn.execute("SELECT * FROM conversations WHERE id = ?", (conversation_id,)).fetchone()
        if not row:
            return None
        messages = conn.execute(
            "SELECT role, content, created_at FROM messages WHERE conversation_id = ? ORDER BY id ASC",
            (conversation_id,),
        ).fetchall()
        handoff = conn.execute(
            "SELECT reason, summary, created_at FROM handoffs WHERE conversation_id = ? ORDER BY id DESC LIMIT 1",
            (conversation_id,),
        ).fetchone()
    data = dict(row)
    data["messages"] = [dict(m) for m in messages]
    data["handoff"] = dict(handoff) if handoff else None
    return data


def add_message(conversation_id: str, role: str, content: str) -> None:
    stamp = now_iso()
    with _connect() as conn:
        conn.execute(
            "INSERT INTO messages (conversation_id, role, content, created_at) VALUES (?, ?, ?, ?)",
            (conversation_id, role, content, stamp),
        )
        conn.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ?",
            (stamp, conversation_id),
        )


def list_history(conversation_id: str) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY id ASC",
            (conversation_id,),
        ).fetchall()
    return [dict(row) for row in rows]


def mark_handoff(conversation_id: str, reason: str, summary: str) -> dict:
    stamp = now_iso()
    with _connect() as conn:
        conn.execute(
            "INSERT INTO handoffs (conversation_id, reason, summary, created_at) VALUES (?, ?, ?, ?)",
            (conversation_id, reason, summary, stamp),
        )
        conn.execute(
            "UPDATE conversations SET status = 'handed_off', updated_at = ? WHERE id = ?",
            (stamp, conversation_id),
        )
    return {"reason": reason, "summary": summary, "created_at": stamp}


def list_handoffs(limit: int = 50) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            """
            SELECT h.id, h.conversation_id, h.reason, h.summary, h.created_at, c.status
            FROM handoffs h
            JOIN conversations c ON c.id = h.conversation_id
            ORDER BY h.id DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]
