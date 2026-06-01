"""FastAPI main entry."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
import sqlite3

from backend.routers import insight, profile, workflow, agent, report
from backend.data.db import init_db, get_conn, log_operation, get_operation_logs
# flake8: noqa

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app):
    init_db()
    yield


app = FastAPI(
    title="银行智能营销平台",
    description="Demo API - 客户洞察 / 客户画像 / 业务流程自动化",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── DB dependency ──────────────────────────────────────

def get_db():
    """Per-request SQLite connection, closed after response."""
    conn = get_conn()
    try:
        yield conn
    finally:
        conn.close()


# Make get_db available as a dependency for routers
app.state.get_db = get_db


# ── Audit middleware ───────────────────────────────────

class OperationLogMiddleware(BaseHTTPMiddleware):
    """Log POST API calls to SQLite with business context."""

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.method == "POST" and request.url.path.startswith("/api/"):
            conn = get_conn()
            try:
                role = request.headers.get("X-Role", "")
                log_operation(
                    conn,
                    action=f"{request.method} {request.url.path}",
                    target=request.url.path,
                    role=role,
                    detail=f"role={role}, status={response.status_code}",
                )
            except Exception:
                logger.exception("Failed to write operation log")
            finally:
                conn.close()
        return response


app.add_middleware(OperationLogMiddleware)

app.include_router(insight.router)
app.include_router(profile.router)
app.include_router(workflow.router)
app.include_router(agent.router)
app.include_router(report.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/logs")
async def get_logs(role: str = "", limit: int = 100):
    """Get operation logs."""
    conn = get_conn()
    try:
        return {"logs": get_operation_logs(conn, role or None, limit)}
    finally:
        conn.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
