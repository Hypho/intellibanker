"""Report router — theme listing, report generation, export."""
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import json

from backend.data.tag_data import get_all_themes, get_theme_by_id
from backend.services.report_generator import generate_report

router = APIRouter(prefix="/api/report", tags=["report"])


# ── Theme endpoints ──────────────────────────────────────

@router.get("/themes")
async def list_themes():
    """List all available tag themes."""
    themes = get_all_themes()
    return {
        "themes": [
            {
                "id": t.id,
                "name": t.name,
                "description": t.description,
                "customer_type": t.customer_type,
                "tag_groups": [
                    {"id": g.id, "name": g.name, "description": g.description,
                     "feature_count": len(g.feature_ids)}
                    for g in t.tag_groups
                ],
            }
            for t in themes
        ]
    }


@router.get("/themes/{theme_id}")
async def get_theme_detail(theme_id: str):
    """Get a single theme with full detail including feature definitions."""
    theme = get_theme_by_id(theme_id)
    if not theme:
        raise HTTPException(status_code=404, detail=f"主题 {theme_id} 不存在")
    from backend.data.tag_data import get_all_features
    features = get_all_features()
    return {
        "id": theme.id,
        "name": theme.name,
        "description": theme.description,
        "customer_type": theme.customer_type,
        "tag_groups": [
            {
                "id": g.id,
                "name": g.name,
                "description": g.description,
                "features": [
                    {"id": fid, "name": features[fid].name, "chart_type": features[fid].chart_type}
                    for fid in g.feature_ids if fid in features
                ],
            }
            for g in theme.tag_groups
        ],
    }


# ── Report generation ────────────────────────────────────

class GenerateRequest(BaseModel):
    theme_id: str
    user: str = "admin"


@router.post("/generate")
async def generate_report_endpoint(req: GenerateRequest):
    """Generate a report for a tag theme (blocking, ~15-25s)."""
    report = await generate_report(req.theme_id, req.user)
    return report.model_dump()


@router.get("/generate/stream")
async def generate_report_stream(theme_id: str, user: str = "admin"):
    """Generate a report with SSE progress updates."""
    async def event_stream():
        # Phase ②
        yield f"data: {json.dumps({'phase': 'segment', 'message': '正在筛选客群...', 'percent': 10}, ensure_ascii=False)}\n\n"

        try:
            theme = get_theme_by_id(theme_id)
            if not theme:
                yield f"data: {json.dumps({'phase': 'error', 'message': f'主题 {theme_id} 不存在'}, ensure_ascii=False)}\n\n"
                return

            from backend.data.mock_data import get_personal_customers
            from backend.services.segment_engine import segment_customers, generate_overview

            all_customers = get_personal_customers()
            seg = segment_customers(theme, all_customers)
            if not seg:
                yield f"data: {json.dumps({'phase': 'error', 'message': '未筛选到符合条件的客户'}, ensure_ascii=False)}\n\n"
                return

            yield f"data: {json.dumps({'phase': 'segment', 'message': f'筛选到 {len(seg)} 位客户', 'percent': 20}, ensure_ascii=False)}\n\n"

            # Phase ③
            yield f"data: {json.dumps({'phase': 'feature', 'message': '正在分析标签特征...', 'percent': 30}, ensure_ascii=False)}\n\n"

            report = await generate_report(theme_id, user)

            yield f"data: {json.dumps({'phase': 'complete', 'message': '报告生成完成', 'percent': 100, 'report_id': report.id}, ensure_ascii=False)}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'phase': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Report instance endpoints ────────────────────────────

@router.get("/list")
async def list_reports():
    """List generated reports (in-memory, session-scoped for demo)."""
    # In a real system this would query the DB
    return {"reports": [], "message": "报告列表仅在会话期间可用"}


@router.get("/{report_id}")
async def get_report(report_id: str):
    """Get a report instance by ID."""
    # In a real system this would query the DB
    raise HTTPException(status_code=404, detail="报告实例仅在生成时返回，请重新生成")
