"""Agent chat router with SSE streaming."""
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import json

from backend.agent.core import stream_agent_events

router = APIRouter(prefix="/api/agent", tags=["agent"])


class ChatRequest(BaseModel):
    message: str
    history: Optional[list[dict]] = None


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
