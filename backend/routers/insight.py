"""Customer insight report router."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from backend.data.mock_data import get_personal_customers, get_enterprise_customers, BRANCHES, MANAGERS

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
            enterprise = [e for e in enterprise if e["id"][:1] == "E"]  # 简化：全量企业

    if dimension == "manager" and manager_id:
        personal = [c for c in personal if c["basic_info"]["manager_id"] == manager_id]

    return {
        "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "dimension": dimension,
        "branch_id": branch_id,
        "manager_id": manager_id,
        "overview": _aggregate_overview(personal, enterprise),
        "customer_structure": _customer_structure(personal),
        "business_metrics": _business_metrics(personal),
        "key_lists": _key_lists(personal),
        "opportunities": _opportunities(personal),
        "branches": [{"id": m["id"], "name": m["branch"]} for m in MANAGERS],
        "managers": [{"id": m["id"], "name": m["name"], "branch": m["branch"]} for m in MANAGERS],
    }
