from linebot.v3.webhooks import (
    FollowEvent,
    MessageEvent,
    TextMessageContent,
    UnfollowEvent,
)

from app.db import get_or_create_thread, insert_message


def _user_id(event) -> str | None:
    if event.source and event.source.user_id:
        return event.source.user_id
    return None


def handle_event(event) -> None:
    user_id = _user_id(event)
    if not user_id:
        return

    thread_id = get_or_create_thread(user_id)

    if isinstance(event, MessageEvent):
        msg = event.message
        body: str | None = None
        if isinstance(msg, TextMessageContent):
            body = msg.text

        insert_message(
            thread_id=thread_id,
            direction="inbound",
            message_type=msg.type,
            body=body,
            raw=msg.as_json_dict(),
            line_message_id=getattr(msg, "id", None),
        )
        return

    if isinstance(event, (FollowEvent, UnfollowEvent)):
        insert_message(
            thread_id=thread_id,
            direction="system",
            message_type=event.type,
            body=None,
            raw=event.as_json_dict(),
        )
