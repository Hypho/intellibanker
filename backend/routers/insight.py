"""Customer insight report router."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from backend.data.mock_data import get_personal_customers, get_enterprise_customers, BRANCHES, MANAGERS
from backend.config import call_deepseek

router = APIRouter(prefix="/api/insight", tags=["insight"])


class InsightRequest(BaseModel):
    dimension: str = "all"
    branch_id: Optional[str] = None
    manager_id: Optional[str] = None


def _aggregate_overview(personal: list, enterprise: list) -> dict:
    total_aum = sum(c["aum"] for c in personal)
    total_deposits = sum(
        c["deposits"]["current"] + c["deposits"]["term"] + c["deposits"]["large_certificate"]
        for c in personal
    )
    total_loans = sum(c["loans"]["balance"] for c in personal if c["loans"]["balance"] > 0)
    return {
        "total_customers": len(personal),
        "total_enterprise_customers": len(enterprise),
        "total_aum": total_aum,
        "total_deposits": total_deposits,
        "total_loans": total_loans,
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }


def _customer_structure(personal: list) -> dict:
    by_level = {"大众客户": 0, "成长型客户": 0, "中端客户": 0, "高净值客户": 0}
    by_lifecycle = {"新客户": 0, "成熟期": 0, "衰退期": 0, "流失预警": 0}
    for c in personal:
        by_level[c["asset_level"]] = by_level.get(c["asset_level"], 0) + 1
        by_lifecycle[c["lifecycle"]] = by_lifecycle.get(c["lifecycle"], 0) + 1
    return {"by_asset_level": by_level, "by_lifecycle": by_lifecycle}


def _business_metrics(personal: list) -> dict:
    churn_count = sum(1 for c in personal if c["lifecycle"] in ("衰退期", "流失预警"))
    avg_cross_sell = sum(len(c["products"]) for c in personal) / max(len(personal), 1)
    churn_rate = churn_count / max(len(personal), 1)
    return {
        "deposit_churn_rate": round(churn_rate, 4),
        "deposit_growth_rate": round(0.06 + churn_rate * 0.5, 4),
        "loan_conversion_rate": round(sum(1 for c in personal if c["loans"]["balance"] > 0) / max(len(personal), 1), 4),
        "cross_sell_ratio": round(avg_cross_sell, 2),
        "mid_fee_income": int(sum(c["aum"] for c in personal) * 0.0012),
    }


def _key_lists(personal: list) -> dict:
    churn_risk = [
        {
            "id": c["id"],
            "name": c["basic_info"]["name"],
            "aum": c["aum"],
            "lifecycle": c["lifecycle"],
            "churn_probability": c["tags"]["churn_probability"],
        }
        for c in personal
        if c["lifecycle"] in ("衰退期", "流失预警")
    ][:10]

    expiring = [
        {
            "id": c["id"],
            "name": c["basic_info"]["name"],
            "product": c["product_expiring"]["product_type"] if c["product_expiring"] else "定期存款",
            "balance": c["product_expiring"]["balance"] if c["product_expiring"] else c["deposits"]["term"],
            "expire_date": c["product_expiring"]["expire_date"] if c["product_expiring"] else "2025-06-01",
            "days_left": c["product_expiring"]["days_left"] if c["product_expiring"] else 7,
        }
        for c in personal
        if c["product_expiring"] is not None
    ][:10]

    high_value = sorted(personal, key=lambda x: x["aum"], reverse=True)[:10]
    high_value = [
        {
            "id": c["id"],
            "name": c["basic_info"]["name"],
            "aum": c["aum"],
            "asset_level": c["asset_level"],
            "lifecycle": c["lifecycle"],
        }
        for c in high_value
    ]

    return {
        "churn_risk_customers": churn_risk,
        "product_expiring": expiring,
        "high_value_targets": high_value,
    }


def _opportunities(personal: list) -> dict:
    cross_sell_leads = [
        {
            "id": c["id"],
            "name": c["basic_info"]["name"],
            "aum": c["aum"],
            "products_held": len(c["products"]),
            "suggestion": "产品覆盖不足，建议推荐基金或保险",
        }
        for c in personal
        if len(c["products"]) <= 2 and c["aum"] > 50000
    ][:10]

    churn_alerts = [
        {
            "id": c["id"],
            "name": c["basic_info"]["name"],
            "churn_probability": c["tags"]["churn_probability"],
            "signal": c["events"][0]["description"] if c["events"] else "资产下降",
        }
        for c in personal
        if c["tags"]["churn_probability"] > 0.4
    ][:10]

    return {"cross_sell_leads": cross_sell_leads, "churn_alerts": churn_alerts}


def _monthly_trends(personal: list) -> dict:
    """生成近6个月存贷款趋势数据（末月对齐当前快照，历史月份倒推模拟）。"""
    base_deposits = sum(
        c["deposits"]["current"] + c["deposits"]["term"] + c["deposits"]["large_certificate"]
        for c in personal
    )
    base_loans = sum(c["loans"]["balance"] for c in personal if c["loans"]["balance"] > 0)

    import random as _rand
    _rand.seed(42)
    months = ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05"]
    # 生成6个月的随机波动系数
    factors_dep = [_rand.uniform(-0.02, 0.04) for _ in range(6)]
    factors_lon = [_rand.uniform(-0.01, 0.03) for _ in range(6)]
    # 末月 = 当前快照，往前倒推
    dep_points = [base_deposits]
    lon_points = [base_loans]
    for i in range(5, 0, -1):
        dep_points.insert(0, int(dep_points[0] / (1 + factors_dep[i])))
        lon_points.insert(0, int(lon_points[0] / (1 + factors_lon[i])))

    return {"months": months, "deposit_trend": dep_points, "loan_trend": lon_points}


async def _generate_insight_summary(overview: dict, metrics: dict, structure: dict) -> str:
    """用LLM生成管理层可读的洞察摘要。"""
    prompt = f"""请根据以下银行经营数据，生成一段简洁的管理层洞察摘要（150字以内）：

客户概况：个人客户{overview['total_customers']}户，企业客户{overview['total_enterprise_customers']}户
AUM总量：{overview['total_aum']:,}元
存款余额：{overview['total_deposits']:,}元
贷款余额：{overview['total_loans']:,}元
客户结构：高净值{structure['by_asset_level'].get('高净值客户', 0)}户，中端{structure['by_asset_level'].get('中端客户', 0)}户，大众{structure['by_asset_level'].get('大众客户', 0)}户
流失预警客户：{structure['by_lifecycle'].get('流失预警', 0)}户
存款流失率：{metrics['deposit_churn_rate']:.1%}
交叉销售率：{metrics['cross_sell_ratio']:.1f}个/户

要求：突出关键发现和建议行动，语言精炼专业。"""
    try:
        return await call_deepseek(prompt, system="你是银行经营分析专家，擅长用数据驱动决策。", temperature=0.6, max_tokens=300)
    except Exception:
        return ""


@router.get("/report")
async def get_insight_report(
    dimension: str = "all",
    branch_id: Optional[str] = None,
    manager_id: Optional[str] = None,
):
    """Generate customer insight report."""
    personal = get_personal_customers()
    enterprise = get_enterprise_customers()

    if dimension == "branch" and branch_id:
        branch_name = next((m["branch"] for m in MANAGERS if m["id"] == branch_id), None)
        if branch_name:
            personal = [c for c in personal if c["basic_info"]["branch"] == branch_name]
            enterprise = [e for e in enterprise if e["basic_info"].get("branch") == branch_name]

    if dimension == "manager" and manager_id:
        personal = [c for c in personal if c["basic_info"]["manager_id"] == manager_id]

    overview = _aggregate_overview(personal, enterprise)
    structure = _customer_structure(personal)
    metrics = _business_metrics(personal)

    return {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "dimension": dimension,
        "branch_id": branch_id,
        "manager_id": manager_id,
        "overview": overview,
        "customer_structure": structure,
        "business_metrics": metrics,
        "key_lists": _key_lists(personal),
        "opportunities": _opportunities(personal),
        "monthly_trends": _monthly_trends(personal),
        "branches": [{"id": m["id"], "name": m["branch"]} for m in MANAGERS],
        "managers": [{"id": m["id"], "name": m["name"], "branch": m["branch"]} for m in MANAGERS],
    }


@router.get("/ai-summary")
async def get_ai_summary(
    dimension: str = "all",
    branch_id: Optional[str] = None,
    manager_id: Optional[str] = None,
):
    """AI洞察摘要（独立接口，不阻塞主报告加载）。"""
    personal = get_personal_customers()
    enterprise = get_enterprise_customers()

    if dimension == "branch" and branch_id:
        branch_name = next((m["branch"] for m in MANAGERS if m["id"] == branch_id), None)
        if branch_name:
            personal = [c for c in personal if c["basic_info"]["branch"] == branch_name]
            enterprise = [e for e in enterprise if e["basic_info"].get("branch") == branch_name]

    if dimension == "manager" and manager_id:
        personal = [c for c in personal if c["basic_info"]["manager_id"] == manager_id]

    overview = _aggregate_overview(personal, enterprise)
    structure = _customer_structure(personal)
    metrics = _business_metrics(personal)

    summary = await _generate_insight_summary(overview, metrics, structure)
    return {"ai_summary": summary}
