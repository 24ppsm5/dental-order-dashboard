import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from linebot.v3 import WebhookHandler
from linebot.v3.exceptions import InvalidSignatureError
from linebot.v3.messaging import Configuration, ApiClient, MessagingApi
from linebot.v3.webhooks import MessageEvent
from pydantic import BaseModel

from app.db import get_or_create_thread, init_db, upsert_resolution
from app.line_handler import handle_event
from app.search import search_messages

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

CHANNEL_SECRET = os.getenv("LINE_CHANNEL_SECRET", "")
CHANNEL_ACCESS_TOKEN = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "")

handler = WebhookHandler(CHANNEL_SECRET)
app = FastAPI(title="LINE Archive", version="0.1.0")


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/callback")
async def callback(request: Request) -> dict:
    if not CHANNEL_SECRET:
        raise HTTPException(500, "LINE_CHANNEL_SECRET is not set")

    signature = request.headers.get("X-Line-Signature", "")
    body = (await request.body()).decode("utf-8")

    try:
        handler.handle(body, signature)
    except InvalidSignatureError as exc:
        raise HTTPException(400, "Invalid signature") from exc

    return {"ok": True}


@handler.add(MessageEvent)
def on_message(event) -> None:
    handle_event(event)


class ResolutionIn(BaseModel):
    line_user_id: str
    summary: str
    tags: str | None = None


@app.post("/api/resolutions")
def save_resolution(payload: ResolutionIn) -> dict:
    thread_id = get_or_create_thread(payload.line_user_id)
    upsert_resolution(thread_id, payload.summary, payload.tags)
    return {"thread_id": thread_id, "ok": True}


@app.get("/api/search")
def api_search(q: str = Query(..., min_length=1), limit: int = Query(20, ge=1, le=100)) -> dict:
    hits = search_messages(q, limit=limit)
    return {"query": q, "count": len(hits), "results": hits}
