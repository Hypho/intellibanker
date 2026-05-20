"""API endpoint tests."""
import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_insight_report_overview(client):
    async with client as c:
        resp = await c.get("/api/insight/report?dimension=all")
    assert resp.status_code == 200
    data = resp.json()
    assert "overview" in data
    assert "key_lists" in data
    assert data["overview"]["total_customers"] > 0


@pytest.mark.asyncio
async def test_insight_report_branch(client):
    async with client as c:
        resp = await c.get("/api/insight/report?dimension=branch&branch_id=M001")
    assert resp.status_code == 200
    data = resp.json()
    assert "overview" in data


@pytest.mark.asyncio
async def test_insight_report_manager(client):
    async with client as c:
        resp = await c.get("/api/insight/report?dimension=manager&manager_id=M001")
    assert resp.status_code == 200
    data = resp.json()
    assert "overview" in data


@pytest.mark.asyncio
async def test_profile_list(client):
    async with client as c:
        resp = await c.get("/api/profile/list/personal?page=1&page_size=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "data" in data
    assert len(data["data"]) <= 5


@pytest.mark.asyncio
async def test_profile_detail(client):
    async with client as c:
        list_resp = await c.get("/api/profile/list/personal?page=1&page_size=1")
        customer_id = list_resp.json()["data"][0]["id"]
        resp = await c.get(f"/api/profile/personal/{customer_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "basic_info" in data
    assert "aum" in data


@pytest.mark.asyncio
async def test_enterprise_list(client):
    async with client as c:
        resp = await c.get("/api/profile/list/enterprise?page=1&page_size=5")
    assert resp.status_code == 200
    data = resp.json()
    assert "data" in data


@pytest.mark.asyncio
async def test_event_triggers(client):
    # First get a customer ID
    async with client as c:
        list_resp = await c.get("/api/profile/list/personal?page=1&page_size=1")
        customer_id = list_resp.json()["data"][0]["id"]
        resp = await c.get(f"/api/workflow/event-triggers?customer_type=personal&customer_id={customer_id}")
    assert resp.status_code == 200
    data = resp.json()
    assert "events" in data


@pytest.mark.asyncio
async def test_visit_workflow_before(client):
    async with client as c:
        list_resp = await c.get("/api/profile/list/personal?page=1&page_size=1")
        customer_id = list_resp.json()["data"][0]["id"]
        resp = await c.post("/api/workflow/visit", json={
            "customer_type": "personal",
            "customer_id": customer_id,
            "manager_id": "M001",
            "stage": "before",
            "data": {},
        })
    assert resp.status_code == 200
    data = resp.json()
    assert "task_id" in data
    assert "customer_name" in data
