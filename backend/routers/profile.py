"""Customer profile router."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

from backend.data.mock_data import get_customer
from backend.config import call_deepseek

router = APIRouter(prefix="/api/profile", tags=["profile"])


def _calc_age(birth_date_str: str, today: date) -> int:
    """Compute age from birth_date string."""
    if not birth_date_str:
        return 0
    try:
        bd = datetime.strptime(birth_date_str, "%Y-%m-%d").date()
        return today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
    except ValueError:
        return 0


@router.get("/list/personal")
async def list_personal_profiles(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    asset_level: Optional[str] = None,
    lifecycle: Optional[str] = None,
    manager_id: Optional[str] = None,
):
    """List personal customers with optional filters."""
    from backend.data.mock_data import get_personal_customers

    customers = get_personal_customers()
    today = date.today()

    if manager_id:
        customers = [c for c in customers if c.get("basic_info", {}).get("manager_id") == manager_id]

    if search:
        s = search.lower()
        customers = [
            c for c in customers
            if s in c["basic_info"]["name"].lower() or s in c["id"].lower()
        ]
    if asset_level:
        customers = [c for c in customers if c["asset_level"] == asset_level]
    if lifecycle:
        customers = [c for c in customers if c["lifecycle"] == lifecycle]

    total = len(customers)
    start = (page - 1) * page_size
    end = start + page_size
    page_customers = customers[start:end]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "data": [
            {
                "id": c["id"],
                "name": c["basic_info"]["name"],
                "gender": c.get("gender", ""),
                "age": _calc_age(c.get("birth_date", ""), today),
                "asset_level": c["asset_level"],
                "lifecycle": c["lifecycle"],
                "aum": c["aum"],
                "branch": c["basic_info"]["branch"],
                "manager_name": c["basic_info"]["manager_name"],
                "has_expiring": c["product_expiring"] is not None,
                "churn_probability": c["tags"]["churn_probability"],
            }
            for c in page_customers
        ],
    }


@router.get("/list/enterprise")
async def list_enterprise_profiles(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    industry: Optional[str] = None,
):
    """List enterprise customers with optional filters."""
    from backend.data.mock_data import get_enterprise_customers

    customers = get_enterprise_customers()

    if search:
        s = search.lower()
        customers = [
            c for c in customers
            if s in c["basic_info"]["name"].lower() or s in c["id"].lower()
        ]
    if industry:
        customers = [c for c in customers if c["basic_info"]["industry"] == industry]

    total = len(customers)
    start = (page - 1) * page_size
    end = start + page_size
    page_customers = customers[start:end]

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "data": [
            {
                "id": c["id"],
                "name": c["basic_info"]["name"],
                "industry": c["basic_info"]["industry"],
                "credit_used": c["financial"]["credit_used"],
                "credit_limit": c["financial"]["credit_limit"],
                "deposit_balance": c["financial"]["deposit_balance"],
                "sentiment": c["risk"]["sentiment"],
            }
            for c in page_customers
        ],
    }


@router.get("/{customer_type}/{customer_id}")
async def get_profile(customer_type: str, customer_id: str):
    """Get customer profile by type and ID."""
    if customer_type not in ("personal", "enterprise"):
        raise HTTPException(status_code=400, detail="customer_type must be 'personal' or 'enterprise'")

    customer = get_customer(customer_type, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")

    if customer_type == "personal":
        return _format_personal_profile(customer)
    else:
        return _format_enterprise_profile(customer)


@router.get("/{customer_type}/{customer_id}/ai-narrative")
async def get_ai_narrative(customer_type: str, customer_id: str):
    """AI画像叙事（独立接口，不阻塞主画像加载）。"""
    if customer_type not in ("personal", "enterprise"):
        raise HTTPException(status_code=400, detail="customer_type must be 'personal' or 'enterprise'")

    customer = get_customer(customer_type, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer {customer_id} not found")

    if customer_type == "personal":
        narrative = await _generate_personal_narrative(customer)
    else:
        narrative = await _generate_enterprise_narrative(customer)

    return {"ai_narrative": narrative}


async def _generate_personal_narrative(c: dict) -> str:
    """用LLM生成个人客户画像叙事。"""
    name = c["basic_info"]["name"]
    aum = c["aum"]
    level = c.get("asset_level", "未知")
    lifecycle = c.get("lifecycle", "未知")
    churn = c.get("tags", {}).get("churn_probability", 0)
    products = len(c.get("products", []))
    deposits = c.get("deposits", {})
    total_deposit = deposits.get("current", 0) + deposits.get("term", 0) + deposits.get("large_certificate", 0)
    loans = c.get("loans", {})
    loan_balance = loans.get("balance", 0)
    events = c.get("events", [])
    high_events = [e for e in events if e.get("priority") == "high"]

    prompt = f"""请根据以下客户数据，生成一段简洁的客户画像摘要（100字以内）：

客户：{name}
AUM：{aum:,}元
资产等级：{level}
生命周期：{lifecycle}
流失概率：{churn:.0%}
持有产品数：{products}
存款合计：{total_deposit:,}元
贷款余额：{loan_balance:,}元
高优事件：{'; '.join(e['description'] for e in high_events[:3]) or '无'}

要求：用一两句话概括客户价值、风险和营销建议。"""
    try:
        return await call_deepseek(prompt, system="你是银行客户经理助手，擅长客户画像分析。", temperature=0.5, max_tokens=200)
    except Exception:
        return ""


async def _generate_enterprise_narrative(c: dict) -> str:
    """用LLM生成企业客户画像叙事。"""
    name = c["basic_info"]["name"]
    industry = c["basic_info"].get("industry", "未知")
    fin = c.get("financial", {})
    credit_limit = fin.get("credit_limit", 0)
    credit_used = fin.get("credit_used", 0)
    deposit = fin.get("deposit_balance", 0)
    covered = len(c.get("covered_products", []))
    uncovered = len(c.get("uncovered_products", []))
    sentiment = c.get("risk", {}).get("sentiment", "中性")

    prompt = f"""请根据以下企业客户数据，生成一段简洁的画像摘要（100字以内）：

企业：{name}
行业：{industry}
授信额度：{credit_limit:,}元，已用：{credit_used:,}元
存款沉淀：{deposit:,}元
已覆盖产品：{covered}个，未覆盖：{uncovered}个
风险情绪：{sentiment}

要求：概括企业合作现状和业务机会。"""
    try:
        return await call_deepseek(prompt, system="你是银行对公客户经理助手，擅长企业客户分析。", temperature=0.5, max_tokens=200)
    except Exception:
        return ""


def _format_personal_profile(c: dict) -> dict:
    events = c.get("events", [])
    high_priority_events = [e for e in events if e.get("priority") == "high"]
    medium_priority_events = [e for e in events if e.get("priority") == "medium"]

    return {
        "type": "personal",
        "id": c["id"],
        "basic_info": c["basic_info"],
        "aum": c["aum"],
        "asset_level": c["asset_level"],
        "lifecycle": c["lifecycle"],
        "products": c["products"],
        "product_expiring": c.get("product_expiring"),
        "events": events,
        "high_priority_events": high_priority_events,
        "medium_priority_events": medium_priority_events,
        "deposits": c["deposits"],
        "loans": c["loans"],
        "financial_behavior": c["financial_behavior"],
        "tags": c["tags"],
        "risk_info": c["risk_info"],
        "contact_history": c["contact_history"],
    }


def _format_enterprise_profile(c: dict) -> dict:
    events = c.get("events", [])
    return {
        "type": "enterprise",
        "id": c["id"],
        "basic_info": c["basic_info"],
        "financial": c["financial"],
        "risk": c["risk"],
        "financial_behavior": c["financial_behavior"],
        "key_persons": c["key_persons"],
        "events": events,
        "covered_products": c["covered_products"],
        "uncovered_products": c["uncovered_products"],
        "suggestions": c["suggestions"],
    }
