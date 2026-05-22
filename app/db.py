import json
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any

from app.config import DATA_DIR, DB_PATH


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def init_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS threads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                line_user_id TEXT NOT NULL UNIQUE,
                display_name TEXT,
                status TEXT NOT NULL DEFAULT 'open',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                thread_id INTEGER NOT NULL,
                direction TEXT NOT NULL,
                message_type TEXT NOT NULL,
                body TEXT,
                raw_json TEXT,
                line_message_id TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (thread_id) REFERENCES threads(id)
            );

            CREATE TABLE IF NOT EXISTS resolutions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                thread_id INTEGER NOT NULL UNIQUE,
                summary TEXT NOT NULL,
                tags TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (thread_id) REFERENCES threads(id)
            );

            CREATE INDEX IF NOT EXISTS idx_messages_thread
                ON messages(thread_id);
            CREATE INDEX IF NOT EXISTS idx_messages_created
                ON messages(created_at);
            """
        )
        conn.execute(
            """
            CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
                body,
                content='messages',
                content_rowid='id'
            );
            """
        )
        conn.execute(
            """
            CREATE TRIGGER IF NOT EXISTS messages_ai AFTER INSERT ON messages BEGIN
                INSERT INTO messages_fts(rowid, body) VALUES (new.id, COALESCE(new.body, ''));
            END;
            """
        )
        conn.execute(
            """
            CREATE TRIGGER IF NOT EXISTS messages_ad AFTER DELETE ON messages BEGIN
                INSERT INTO messages_fts(messages_fts, rowid, body)
                VALUES ('delete', old.id, COALESCE(old.body, ''));
            END;
            """
        )
        conn.execute(
            """
            CREATE TRIGGER IF NOT EXISTS messages_au AFTER UPDATE ON messages BEGIN
                INSERT INTO messages_fts(messages_fts, rowid, body)
                VALUES ('delete', old.id, COALESCE(old.body, ''));
                INSERT INTO messages_fts(rowid, body) VALUES (new.id, COALESCE(new.body, ''));
            END;
            """
        )


@contextmanager
def connect():
    init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def get_or_create_thread(line_user_id: str) -> int:
    with connect() as conn:
        row = conn.execute(
            "SELECT id FROM threads WHERE line_user_id = ?",
            (line_user_id,),
        ).fetchone()
        if row:
            conn.execute(
                "UPDATE threads SET updated_at = ? WHERE id = ?",
                (_utc_now(), row["id"]),
            )
            return int(row["id"])

        now = _utc_now()
        cur = conn.execute(
            """
            INSERT INTO threads (line_user_id, status, created_at, updated_at)
            VALUES (?, 'open', ?, ?)
            """,
            (line_user_id, now, now),
        )
        return int(cur.lastrowid)


def insert_message(
    *,
    thread_id: int,
    direction: str,
    message_type: str,
    body: str | None,
    raw: dict[str, Any],
    line_message_id: str | None = None,
) -> int:
    with connect() as conn:
        cur = conn.execute(
            """
            INSERT INTO messages (
                thread_id, direction, message_type, body, raw_json,
                line_message_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                thread_id,
                direction,
                message_type,
                body,
                json.dumps(raw, ensure_ascii=False),
                line_message_id,
                _utc_now(),
            ),
        )
        return int(cur.lastrowid)


def upsert_resolution(thread_id: int, summary: str, tags: str | None = None) -> None:
    now = _utc_now()
    with connect() as conn:
        existing = conn.execute(
            "SELECT id FROM resolutions WHERE thread_id = ?",
            (thread_id,),
        ).fetchone()
        if existing:
            conn.execute(
                """
                UPDATE resolutions
                SET summary = ?, tags = ?, updated_at = ?
                WHERE thread_id = ?
                """,
                (summary, tags, now, thread_id),
            )
        else:
            conn.execute(
                """
                INSERT INTO resolutions (thread_id, summary, tags, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (thread_id, summary, tags, now, now),
            )
        conn.execute(
            "UPDATE threads SET status = 'resolved', updated_at = ? WHERE id = ?",
            (now, thread_id),
        )
