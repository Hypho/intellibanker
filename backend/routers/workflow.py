"""Business process automation router - visit workflow."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

from backend.data.mock_data import get_customer, get_personal_customers
from backend.config import call_deepseek

router = APIRouter(prefix="/api/workflow", tags=["workflow"])


class VisitRequest(BaseModel):
    customer_type: str
    customer_id: str
    manager_id: Optional[str] = None
    stage: str  # "before" | "during" | "after"
    data: dict = {}


# ── In-memory visit session store ──────────────────────
_visit_sessions: dict[str, dict] = {}


# ── /visit (main workflow endpoint) ──────────────────
@router.post("/visit")
async def visit_workflow(req: VisitRequest):
    if req.stage == "before":
        return await visit_before(req)
    elif req.stage == "during":
        return await visit_during(req)
    elif req.stage == "after":
        return await visit_after(req)
    else:
        raise HTTPException(status_code=400, detail="stage must be 'before', 'during', or 'after'")


async def visit_before(req: VisitRequest) -> dict:
    customer = get_customer(req.customer_type, req.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    task_id = f"VST-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    profile_summary = _build_profile_summary(req.customer_type, customer)

    events = customer.get("events", [])
    visit_suggestions = _generate_suggestions(req.customer_type, customer, events)

    _visit_sessions[task_id] = {
        "task_id": task_id,
        "customer_id": req.customer_id,
        "customer_type": req.customer_type,
        "manager_id": req.manager_id,
        "stage": "before",
        "started_at": datetime.now().isoformat(),
        "profile_summary": profile_summary,
        "events": events,
    }

    return {
        "stage": "before",
        "task_id": task_id,
        "customer_id": req.customer_id,
        "customer_name": customer.get("basic_info", {}).get("name") if customer.get("basic_info") else customer.get("basic_info", {}).get("name", ""),
        "profile_summary": profile_summary,
        "events": events,
        "visit_suggestions": visit_suggestions,
        "recommended_products": _recommend_products(req.customer_type, customer),
    }


async def visit_during(req: VisitRequest) -> dict:
    task_id = req.data.get("task_id", "")
    session = _visit_sessions.get(task_id, {})
    notes = req.data.get("notes", "")
    location = req.data.get("location", "")

    started_at = session.get("started_at", datetime.now().isoformat())

    return {
        "stage": "during",
        "task_id": task_id,
        "notes": notes,
        "location": location,
        "started_at": started_at,
        "elapsed_seconds": 0,
        "message": "拜访记录已保存",
    }


async def visit_after(req: VisitRequest) -> dict:
    task_id = req.data.get("task_id", "")
    session = _visit_sessions.get(task_id, {})

    needs = req.data.get("needs", "")
    commitments = req.data.get("commitments", "")
    objections = req.data.get("objections", "")

    customer_type = session.get("customer_type", req.customer_type)
    customer_id = session.get("customer_id", req.customer_id)
    customer = get_customer(customer_type, customer_id)
    customer_name = customer.get("basic_info", {}).get("name") if customer else "未知"

    auto_summary = await _generate_auto_summary(customer_type, customer, needs, commitments, objections)

    tags_updated = _derive_tags(needs, commitments, objections)

    follow_up_tasks = _build_follow_up_tasks(needs, commitments)

    _visit_sessions[task_id] = {
        **session,
        "stage": "after",
        "summary": auto_summary,
        "tags_updated": tags_updated,
        "completed_at": datetime.now().isoformat(),
    }

    return {
        "stage": "after",
        "task_id": task_id,
        "customer_name": customer_name,
        "auto_generated_summary": auto_summary,
        "tags_updated": tags_updated,
        "follow_up_tasks": follow_up_tasks,
    }


def _build_profile_summary(customer_type: str, customer: dict) -> dict:
    if customer_type == "personal":
        return {
            "name": customer["basic_info"]["name"],
            "asset_level": customer["asset_level"],
            "lifecycle": customer["lifecycle"],
            "aum": customer["aum"],
            "risk_preference": customer["risk_preference"],
            "products_count": len(customer.get("products", [])),
            "churn_probability": customer["tags"]["churn_probability"],
            "contact_last": customer["contact_history"][-1] if customer.get("contact_history") else None,
        }
    else:
        fin = customer.get("financial", {})
        return {
            "name": customer["basic_info"]["name"],
            "industry": customer["basic_info"]["industry"],
            "credit_used": fin.get("credit_used", 0),
            "credit_limit": fin.get("credit_limit", 0),
            "deposit_balance": fin.get("deposit_balance", 0),
            "covered_products": customer.get("covered_products", []),
            "sentiment": customer.get("risk", {}).get("sentiment", "中性"),
        }


def _generate_suggestions(customer_type: str, customer: dict, events: list) -> List[str]:
    suggestions = []

    if customer_type == "personal":
        level = customer.get("asset_level", "")
        risk = customer.get("risk_preference", "稳健型")
        if level in ("中端客户", "高净值客户"):
            suggestions.append(f"客户为{level}，风险偏好{risk}，推荐大额存单或定期储蓄产品")
        if customer.get("lifecycle") == "成熟期":
            suggestions.append("客户处于成熟期，可适当推荐中收类产品（基金/保险）")
        for evt in events:
            if evt.get("priority") == "high":
                suggestions.append(f"重要事件：{evt['description']}，{evt['action']}")

    if customer_type == "enterprise":
        for p in customer.get("covered_products", []):
            if p not in ("代发工资", "企业理财"):
                suggestions.append(f"客户已有产品：{p}，可继续深化合作")
        for evt in events:
            if evt.get("priority") == "high":
                suggestions.append(f"重要事件：{evt['description']}，{evt['action']}")

    if not suggestions:
        suggestions = ["持续维护客户关系，关注业务机会"]

    return suggestions


def _recommend_products(customer_type: str, customer: dict) -> List[str]:
    if customer_type == "personal":
        level = customer.get("asset_level", "大众客户")
        if level in ("中端客户", "高净值客户"):
            return ["大额存单", "定期存款", "基金", "保险"]
        return ["定期存款", "理财产品", "国债"]
    else:
        uncovered = customer.get("uncovered_products", [])
        return uncovered[:3] if uncovered else ["流动资金贷款", "票据"]


def _derive_tags(needs: str, commitments: str, objections: str) -> List[dict]:
    tags = [{"tag": "已面访", "value": "true"}]

    loan_keywords = ["贷款", "借款", "融资", "额度"]
    deposit_keywords = ["存款", "存钱", "储蓄", "大额"]
    fund_keywords = ["基金", "理财", "投资"]

    if any(k in needs or k in commitments for k in loan_keywords):
        tags.append({"tag": "贷款意向", "value": "有"})
    if any(k in needs or k in commitments for k in deposit_keywords):
        tags.append({"tag": "存款意向", "value": "高"})
    if any(k in needs or k in commitments for k in fund_keywords):
        tags.append({"tag": "理财意向", "value": "有"})
    if objections:
        tags.append({"tag": "异议待解", "value": "true"})

    return tags


def _build_follow_up_tasks(needs: str, commitments: str) -> List[dict]:
    tasks = []

    if any(k in needs or k in commitments for k in ["贷款", "融资"]):
        tasks.append({"task": "准备贷款方案并发送", "due_days": 3, "priority": "high"})
        tasks.append({"task": "电话跟进确认", "due_days": 7, "priority": "medium"})
    else:
        tasks.append({"task": "发送产品介绍材料", "due_days": 3, "priority": "medium"})

    tasks.append({"task": "下次拜访或电话跟进", "due_days": 14, "priority": "low"})

    return tasks


async def _generate_auto_summary(
    customer_type: str,
    customer: Optional[dict],
    needs: str,
    commitments: str,
    objections: str,
) -> str:
    if customer_type == "personal":
        name = customer["basic_info"]["name"] if customer else "客户"
        level = customer.get("asset_level", "未知") if customer else "未知"
        risk = customer.get("risk_preference", "未知") if customer else "未知"
    else:
        name = customer["basic_info"]["name"] if customer else "企业"
        industry = customer["basic_info"]["industry"] if customer else "未知"

    system_prompt = "你是一个专业的银行客户经理，擅长撰写简洁、结构化的客户拜访纪要。"
    user_prompt = f"""请根据以下拜访信息，生成一段专业的客户拜访纪要：

客户信息：{name}
{f"资产等级：{level}，风险偏好：{risk}" if customer_type == "personal" else f"行业：{industry}"}
客户需求：{needs or "未明确提出"}
客户承诺：{commitments or "未做出承诺"}
客户异议：{objections or "无异议"}

要求：
1. 纪要应简洁、分点列出
2. 包含客户需求、承诺事项、后续跟进计划
3. 使用专业银行术语
4. 中文输出
"""
    try:
        summary = await call_deepseek(user_prompt, system=system_prompt, temperature=0.5, max_tokens=512)
        return summary.strip()
    except Exception:
        return f"客户{name}已面访，需求为{needs or '待明确'}，承诺{commitments or '暂无'}，异议{objections or '无'}，需持续跟进。"


# ── /event-triggers ────────────────────────────────────
@router.get("/event-triggers")
async def get_event_triggers(customer_type: str, customer_id: str):
    """Get pending event triggers for a customer."""
    customer = get_customer(customer_type, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    events = customer.get("events", [])
    return {
        "customer_id": customer_id,
        "customer_type": customer_type,
        "events": events,
        "total": len(events),
    }
