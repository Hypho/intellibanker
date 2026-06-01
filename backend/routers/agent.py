"""Agent chat router with SSE streaming + session persistence."""
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import json

from backend.agent.core import stream_agent_events
from backend.data.db import (
    get_conn, save_chat_session, get_chat_sessions, get_chat_session, delete_chat_session,
)

router = APIRouter(prefix="/api/agent", tags=["agent"])


class ChatRequest(BaseModel):
    message: str
    history: Optional[list[dict]] = None


class ChatSaveRequest(BaseModel):
    role: str
    session_id: Optional[int] = None
    title: str = ""
    messages: list[dict] = []


@router.post("/chat")
async def chat(req: ChatRequest):
    """SSE streaming chat endpoint for the intelligent assistant."""

    async def event_stream():
        async for event in stream_agent_events(req.message, req.history):
            yield f"event: {event['event']}\ndata: {json.dumps(event['data'], ensure_ascii=False)}\n\n"
        yield "event: done\ndata: {}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/chat/save")
async def save_chat(req: ChatSaveRequest):
    """Save or update a chat session."""
    title = req.title or next(
        (m["content"][:50] for m in req.messages if m.get("role") == "user" and m.get("content")), ""
    )
    conn = get_conn()
    try:
        session_id = save_chat_session(
            conn, role=req.role, messages=req.messages, title=title, session_id=req.session_id,
        )
    finally:
        conn.close()
    return {"session_id": session_id, "title": title}


@router.get("/chat/sessions")
async def list_chat_sessions(role: str = "admin"):
    """List chat sessions for a role."""
    conn = get_conn()
    try:
        sessions = get_chat_sessions(conn, role)
    finally:
        conn.close()
    return {"sessions": sessions}


@router.get("/chat/sessions/{session_id}")
async def load_chat_session(session_id: int):
    """Load a specific chat session."""
    conn = get_conn()
    try:
        session = get_chat_session(conn, session_id)
    finally:
        conn.close()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.delete("/chat/sessions/{session_id}")
async def remove_chat_session(session_id: int):
    """Delete a chat session."""
    conn = get_conn()
    try:
        delete_chat_session(conn, session_id)
    finally:
        conn.close()
    return {"ok": True}
