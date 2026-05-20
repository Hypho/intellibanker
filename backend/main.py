"""FastAPI main entry."""
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from backend.routers import insight, profile, workflow, agent
from backend.data.db import init_db, log_operation
# flake8: noqa


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


class OperationLogMiddleware(BaseHTTPMiddleware):
    """Log non-GET API calls to SQLite."""

    _SKIP = {"/health", "/docs", "/openapi.json", "/favicon.ico"}

    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        path = request.url.path
        if request.method == "POST" and path.startswith("/api/") and path not in self._SKIP:
            try:
                role = request.headers.get("X-Role", "")
                log_operation(
                    action=f"{request.method} {path}",
                    target=path,
                    role=role,
                    detail=f"status={response.status_code}",
                )
            except Exception:
                pass
        return response


app.add_middleware(OperationLogMiddleware)

app.include_router(insight.router)
app.include_router(profile.router)
app.include_router(workflow.router)
app.include_router(agent.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/api/logs")
async def get_logs(role: str = "", limit: int = 100):
    """Get operation logs."""
    from backend.data.db import get_operation_logs
    return {"logs": get_operation_logs(role or None, limit)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
