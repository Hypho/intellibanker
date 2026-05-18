"""Customer profile router."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from backend.data.mock_data import get_customer

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.get("/list/personal")
async def list_personal_profiles(
    page: int = 1,
    page_size: int = 20,
    search: Optional[str] = None,
    asset_level: Optional[str] = None,
    lifecycle: Optional[str] = None,
):
    """List personal customers with optional filters."""
    from backend.data.mock_data import get_personal_customers

    customers = get_personal_customers()

    if search:
        customers = [
            c for c in customers
            if search in c["basic_info"]["name"] or search in c["id"]
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
        customers = [
            c for c in customers
            if search in c["basic_info"]["name"] or search in c["id"]
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
