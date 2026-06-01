"""Agent endpoint and tool tests."""
import json
import pytest
from httpx import AsyncClient, ASGITransport

from backend.main import app
from backend.agent.tools import ALL_TOOLS


def test_tools_are_registered():
    assert len(ALL_TOOLS) == 8
    names = [t.name for t in ALL_TOOLS]
    assert "list_personal_customers_summary" in names
    assert "get_insight_overview" in names
    assert "get_high_risk_customers" in names


def test_tool_list_personal_returns_json():
    from backend.agent.tools import list_personal_customers_summary

    result = list_personal_customers_summary.invoke({})
    data = json.loads(result)
    assert len(data) >= 100
    assert "id" in data[0]
    assert "name" in data[0]
    assert data[0]["id"].startswith("P")


def test_tool_list_enterprise_returns_json():
    from backend.agent.tools import list_enterprise_customers_summary

    result = list_enterprise_customers_summary.invoke({})
    data = json.loads(result)
    assert len(data) >= 30
    assert data[0]["id"].startswith("E")


def test_tool_get_customer_detail():
    from backend.agent.tools import get_customer_detail

    result = get_customer_detail.invoke({"customer_type": "personal", "customer_id": "P001"})
    data = json.loads(result)
    assert data["id"] == "P001"
    assert "basic_info" in data


def test_tool_get_customer_detail_not_found():
    from backend.agent.tools import get_customer_detail

    result = get_customer_detail.invoke({"customer_type": "personal", "customer_id": "PXXX"})
    data = json.loads(result)
    assert "error" in data


def test_tool_profile_summary():
    from backend.agent.tools import get_customer_profile_summary

    result = get_customer_profile_summary.invoke({"customer_type": "personal", "customer_id": "P001"})
    data = json.loads(result)
    assert "name" in data
    assert "aum" in data


def test_tool_visit_suggestions():
    from backend.agent.tools import get_visit_suggestions

    result = get_visit_suggestions.invoke({"customer_type": "personal", "customer_id": "P001"})
    data = json.loads(result)
    assert "suggestions" in data
    assert "recommended_products" in data


def test_tool_insight_overview():
    from backend.agent.tools import get_insight_overview

    result = get_insight_overview.invoke({})
    data = json.loads(result)
    assert "overview" in data
    assert "metrics" in data
    assert "structure" in data
    assert data["overview"]["total_customers"] >= 100


def test_tool_high_risk_customers():
    from backend.agent.tools import get_high_risk_customers

    result = get_high_risk_customers.invoke({})
    data = json.loads(result)
    assert isinstance(data, list)
    if data:
        assert "churn_probability" in data[0]


def test_tool_derive_tags_and_tasks():
    from backend.agent.tools import derive_customer_tags_and_tasks

    result = derive_customer_tags_and_tasks.invoke(
        {"needs": "需要贷款50万", "commitments": "下周提交材料", "objections": ""}
    )
    data = json.loads(result)
    assert "tags" in data
    assert "follow_up_tasks" in data


@pytest.mark.asyncio
async def test_agent_chat_endpoint_returns_sse():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/agent/chat", json={"message": "你好", "history": []})
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]


@pytest.mark.asyncio
async def test_agent_chat_no_api_key(monkeypatch):
    from backend.config import config

    monkeypatch.setattr(config, "DEEPSEEK_API_KEY", "")
    import backend.agent.core as core

    core.reset_agent_graph()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/agent/chat", json={"message": "你好"})
    assert resp.status_code == 200
    body = resp.text
    assert "DEEPSEEK_API_KEY" in body

    core.reset_agent_graph()
