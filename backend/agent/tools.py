"""Reusable tools wrapping existing business logic for the LangGraph agent."""
import json

from langchain_core.tools import tool

from backend.data.mock_data import (
    get_personal_customers,
    get_enterprise_customers,
    get_customer,
)


@tool
def list_personal_customers_summary() -> str:
    """获取所有个人客户摘要列表。返回100位个人客户的ID、姓名、资产等级、AUM和生命周期阶段。"""
    customers = get_personal_customers()
    return json.dumps(
        [
            {
                "id": c["id"],
                "name": c["basic_info"]["name"],
                "asset_level": c["asset_level"],
                "aum": c["aum"],
                "lifecycle": c["lifecycle"],
            }
            for c in customers
        ],
        ensure_ascii=False,
    )


@tool
def list_enterprise_customers_summary() -> str:
    """获取所有企业客户摘要列表。返回30位企业客户的ID、名称、行业和信用额度。"""
    enterprises = get_enterprise_customers()
    return json.dumps(
        [
            {
                "id": e["id"],
                "name": e["basic_info"]["name"],
                "industry": e["basic_info"]["industry"],
                "credit_limit": e["financial"]["credit_limit"],
            }
            for e in enterprises
        ],
        ensure_ascii=False,
    )


@tool
def get_customer_detail(customer_type: str, customer_id: str) -> str:
    """获取单个客户的完整详情。customer_type: 'personal' 或 'enterprise'，customer_id: 如 'P001' 或 'E001'。"""
    customer = get_customer(customer_type, customer_id)
    if not customer:
        return json.dumps({"error": f"客户 {customer_id} 不存在"}, ensure_ascii=False)
    return json.dumps(customer, ensure_ascii=False, default=str)


@tool
def get_customer_profile_summary(customer_type: str, customer_id: str) -> str:
    """获取客户画像摘要（资产等级、生命周期、AUM等关键指标）。比get_customer_detail更精简。"""
    from backend.routers.workflow import _build_profile_summary

    customer = get_customer(customer_type, customer_id)
    if not customer:
        return json.dumps({"error": f"客户 {customer_id} 不存在"}, ensure_ascii=False)
    summary = _build_profile_summary(customer_type, customer)
    return json.dumps(summary, ensure_ascii=False, default=str)


@tool
def get_visit_suggestions(customer_type: str, customer_id: str) -> str:
    """获取某客户的拜访建议和推荐产品。返回营销建议列表和推荐产品列表。"""
    from backend.routers.workflow import _generate_suggestions, _recommend_products

    customer = get_customer(customer_type, customer_id)
    if not customer:
        return json.dumps({"error": f"客户 {customer_id} 不存在"}, ensure_ascii=False)
    events = customer.get("events", [])
    suggestions = _generate_suggestions(customer_type, customer, events)
    products = _recommend_products(customer_type, customer)
    return json.dumps(
        {"suggestions": suggestions, "recommended_products": products},
        ensure_ascii=False,
    )


@tool
def get_insight_overview() -> str:
    """获取全行客户洞察概览。返回客户总数、AUM总量、存款余额、客户结构、流失率等经营指标。"""
    from backend.routers.insight import (
        _aggregate_overview,
        _customer_structure,
        _business_metrics,
        _key_lists,
        _opportunities,
    )

    personal = get_personal_customers()
    enterprise = get_enterprise_customers()
    overview = _aggregate_overview(personal, enterprise)
    structure = _customer_structure(personal)
    metrics = _business_metrics(personal)
    key = _key_lists(personal)
    opps = _opportunities(personal)
    return json.dumps(
        {
            "overview": overview,
            "structure": structure,
            "metrics": metrics,
            "key_lists": key,
            "opportunities": opps,
        },
        ensure_ascii=False,
        default=str,
    )


@tool
def get_high_risk_customers() -> str:
    """获取流失预警和衰退期客户名单。返回流失概率最高的客户，用于风险干预。"""
    personal = get_personal_customers()
    at_risk = sorted(
        [c for c in personal if c["lifecycle"] in ("衰退期", "流失预警")],
        key=lambda c: c["tags"]["churn_probability"],
        reverse=True,
    )[:15]
    return json.dumps(
        [
            {
                "id": c["id"],
                "name": c["basic_info"]["name"],
                "aum": c["aum"],
                "lifecycle": c["lifecycle"],
                "churn_probability": c["tags"]["churn_probability"],
                "events": [e["description"] for e in c.get("events", [])],
            }
            for c in at_risk
        ],
        ensure_ascii=False,
    )


@tool
def derive_customer_tags_and_tasks(needs: str, commitments: str, objections: str) -> str:
    """根据拜访记录推导客户标签和后续跟进任务。输入客户需求、承诺和异议文本。"""
    from backend.routers.workflow import _derive_tags, _build_follow_up_tasks

    tags = _derive_tags(needs, commitments, objections)
    tasks = _build_follow_up_tasks(needs, commitments)
    return json.dumps({"tags": tags, "follow_up_tasks": tasks}, ensure_ascii=False)


ALL_TOOLS = [
    list_personal_customers_summary,
    list_enterprise_customers_summary,
    get_customer_detail,
    get_customer_profile_summary,
    get_visit_suggestions,
    get_insight_overview,
    get_high_risk_customers,
    derive_customer_tags_and_tasks,
]
