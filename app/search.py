from app.db import connect


def search_messages(query: str, limit: int = 20) -> list[dict]:
    q = query.strip()
    if not q:
        return []

    with connect() as conn:
        rows = conn.execute(
            """
            SELECT
                m.id,
                m.body,
                m.direction,
                m.message_type,
                m.created_at,
                t.line_user_id,
                t.id AS thread_id,
                r.summary AS resolution_summary,
                r.tags AS resolution_tags
            FROM messages_fts fts
            JOIN messages m ON m.id = fts.rowid
            JOIN threads t ON t.id = m.thread_id
            LEFT JOIN resolutions r ON r.thread_id = t.id
            WHERE messages_fts MATCH ?
            ORDER BY rank
            LIMIT ?
            """,
            (q, limit),
        ).fetchall()

    return [dict(row) for row in rows]
