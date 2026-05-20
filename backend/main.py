"""FastAPI main entry."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import insight, profile, workflow, agent
# flake8: noqa

app = FastAPI(
    title="银行智能营销平台",
    description="Demo API - 客户洞察 / 客户画像 / 业务流程自动化",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(insight.router)
app.include_router(profile.router)
app.include_router(workflow.router)
app.include_router(agent.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
