import sqlite3
import json
import os
from datetime import datetime, timedelta

DB_PATH = os.environ.get("DB_PATH", "conversations.db")

# Discard conversations idle for longer than this
MAX_IDLE_HOURS = 48

# Keep only the last N messages to cap token usage
MAX_MESSAGES = 40


def init_db() -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                phone      TEXT PRIMARY KEY,
                messages   TEXT NOT NULL DEFAULT '[]',
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        """)


def get_conversation(phone: str) -> list:
    with sqlite3.connect(DB_PATH) as conn:
        row = conn.execute(
            "SELECT messages, updated_at FROM conversations WHERE phone = ?", (phone,)
        ).fetchone()

    if not row:
        return []

    messages, updated_at = row
    # Auto-expire stale conversations so Claude starts fresh
    cutoff = datetime.utcnow() - timedelta(hours=MAX_IDLE_HOURS)
    try:
        last = datetime.fromisoformat(updated_at)
    except ValueError:
        last = datetime.utcnow()

    if last < cutoff:
        clear_conversation(phone)
        return []

    return json.loads(messages)


def save_conversation(phone: str, messages: list) -> None:
    trimmed = messages[-MAX_MESSAGES:]
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            INSERT INTO conversations (phone, messages, updated_at)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(phone) DO UPDATE SET
                messages   = excluded.messages,
                updated_at = excluded.updated_at
        """, (phone, json.dumps(trimmed)))


def clear_conversation(phone: str) -> None:
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("DELETE FROM conversations WHERE phone = ?", (phone,))
