"""Report router — theme listing, report generation, export."""
import json
import urllib.parse
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse, Response
from pydantic import BaseModel
from typing import Optional

from backend.data.tag_data import get_all_themes, get_theme_by_id
from backend.data.db import get_conn, save_report, get_report, list_reports as db_list_reports
from backend.services.report_generator import generate_report
from backend.services.export_service import export_word, export_pdf, ExportConfig

router = APIRouter(prefix="/api/report", tags=["report"])


def _cache_report(report) -> None:
    """Persist report to SQLite."""
    conn = get_conn()
    try:
        save_report(
            conn,
            report_id=report.id,
            theme_id=report.theme_id,
            theme_name=report.theme_name,
            user_name=report.generated_by,
            data_date=report.data_date,
            customer_count=report.customer_count,
            status=report.status,
            report_json=json.dumps(report.model_dump(mode="json"), ensure_ascii=False),
        )
    finally:
        conn.close()


def _load_report(report_id: str):
    """Load report from SQLite, return ReportInstance or None."""
    from backend.models.tag_schema import ReportInstance
    conn = get_conn()
    try:
        row = get_report(conn, report_id)
    finally:
        conn.close()
    if not row or not row.get("report_json"):
        return None
    return ReportInstance(**row["report_json"])


# ── Theme endpoints ──────────────────────────────────────

@router.get("/themes")
async def themes_list():
    """List all available tag themes."""
    themes = get_all_themes()
    return {
        "themes": [
            {
                "id": t.id, "name": t.name, "description": t.description,
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
async def theme_detail(theme_id: str):
    """Get a single theme with full detail including feature definitions."""
    theme = get_theme_by_id(theme_id)
    if not theme:
        raise HTTPException(status_code=404, detail=f"主题 {theme_id} 不存在")
    from backend.data.tag_data import get_all_features
    features = get_all_features()
    return {
        "id": theme.id, "name": theme.name, "description": theme.description,
        "customer_type": theme.customer_type,
        "tag_groups": [
            {
                "id": g.id, "name": g.name, "description": g.description,
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
    manager_id: Optional[str] = None
    branch_id: Optional[str] = None


@router.post("/generate")
async def generate_report_endpoint(req: GenerateRequest):
    """Generate a report (blocking, ~15-25s)."""
    report = await generate_report(
        req.theme_id, req.user,
        manager_id=req.manager_id, branch_id=req.branch_id,
    )
    if report.status == "completed":
        _cache_report(report)
    return report.model_dump()


@router.get("/generate/stream")
async def generate_report_stream(
    theme_id: str, user: str = "admin",
    manager_id: Optional[str] = None, branch_id: Optional[str] = None,
):
    """Generate a report with SSE progress. Caches result on completion."""
    async def event_stream():
        yield f"data: {json.dumps({'phase': 'segment', 'message': '正在筛选客群...', 'percent': 10}, ensure_ascii=False)}\n\n"
        try:
            theme = get_theme_by_id(theme_id)
            if not theme:
                yield f"data: {json.dumps({'phase': 'error', 'message': f'主题 {theme_id} 不存在'}, ensure_ascii=False)}\n\n"
                return

            yield f"data: {json.dumps({'phase': 'feature', 'message': '正在分析标签特征与关联...', 'percent': 30}, ensure_ascii=False)}\n\n"

            report = await generate_report(theme_id, user, manager_id=manager_id, branch_id=branch_id)

            if report.status == "completed":
                _cache_report(report)

            yield f"data: {json.dumps({'phase': 'complete', 'message': '报告生成完成', 'percent': 100, 'report_id': report.id}, ensure_ascii=False)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'phase': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_stream(), media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Report instance endpoints ────────────────────────────

@router.get("/list")
async def reports_list():
    """List generated reports from DB."""
    conn = get_conn()
    try:
        rows = db_list_reports(conn)
    finally:
        conn.close()
    return {"reports": rows}


@router.get("/{report_id}")
async def get_report_endpoint(report_id: str):
    """Get a report by ID from DB."""
    report = _load_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在或已过期，请重新生成")
    return report.model_dump()


# ── Export endpoints ─────────────────────────────────────

class ExportRequest(BaseModel):
    desensitize: bool = True


@router.post("/{report_id}/export/word")
async def export_word_endpoint(report_id: str, req: ExportRequest = ExportRequest()):
    """Export report as Word document."""
    report = _load_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在，请重新生成")
    docx_bytes = export_word(report, ExportConfig(desensitize=req.desensitize))
    filename = f"{report.theme_name}客群画像分析报告_{report.data_date}.docx"
    encoded = urllib.parse.quote(filename)
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded}"},
    )


@router.post("/{report_id}/export/pdf")
async def export_pdf_endpoint(report_id: str, req: ExportRequest = ExportRequest()):
    """Export report as PDF (falls back to HTML if weasyprint not installed)."""
    report = _load_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="报告不存在，请重新生成")
    pdf_bytes = export_pdf(report, ExportConfig(desensitize=req.desensitize))
    filename = f"{report.theme_name}客群画像分析报告_{report.data_date}"
    encoded = urllib.parse.quote(filename)
    is_pdf = pdf_bytes[:4] == b"%PDF"
    if is_pdf:
        return Response(content=pdf_bytes, media_type="application/pdf",
                        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded}.pdf"})
    else:
        return Response(content=pdf_bytes, media_type="text/html",
                        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{encoded}.html"})
