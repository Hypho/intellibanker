"""Database persistence tests."""
import json
import pytest
from backend.data.db import (
    init_db, save_visit_record, update_visit_record, get_visit_records,
    log_operation, get_operation_logs,
    save_chat_session, get_chat_sessions, get_chat_session, delete_chat_session,
)


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


def test_save_and_get_visit_record():
    rid = save_visit_record(
        task_id="VST-TEST-001", customer_id="P001", customer_type="personal",
        manager_id="M001", stage="before",
        data={"profile_summary": {"name": "张三"}},
    )
    assert rid > 0
    records = get_visit_records(customer_id="P001")
    assert len(records) >= 1
    assert records[0]["task_id"] == "VST-TEST-001"
    assert records[0]["data"]["profile_summary"]["name"] == "张三"


def test_update_visit_record():
    save_visit_record(
        task_id="VST-TEST-002", customer_id="P002", customer_type="personal",
        manager_id="M001", stage="before",
    )
    update_visit_record(
        "VST-TEST-002", stage="after",
        summary="拜访纪要内容",
        tags=[{"tag": "已面访", "value": "true"}],
        follow_up_tasks=[{"task": "电话跟进", "due_days": 3}],
    )
    records = get_visit_records(customer_id="P002")
    assert records[0]["stage"] == "after"
    assert records[0]["summary"] == "拜访纪要内容"
    assert records[0]["tags"][0]["tag"] == "已面访"
    assert records[0]["follow_up_tasks"][0]["task"] == "电话跟进"


def test_log_and_get_operations():
    log_operation(action="GET /api/insight/report", target="/api/insight/report", role="admin")
    log_operation(action="POST /api/workflow/visit", target="/api/workflow/visit", role="manager")
    logs = get_operation_logs()
    assert len(logs) >= 2
    admin_logs = get_operation_logs(role="admin")
    assert all(l["role"] == "admin" for l in admin_logs)


def test_chat_session_crud():
    sid = save_chat_session(
        role="admin",
        messages=[{"role": "user", "content": "你好"}, {"role": "assistant", "content": "你好！"}],
        title="你好",
    )
    assert sid > 0

    sessions = get_chat_sessions("admin")
    assert len(sessions) >= 1
    assert sessions[0]["title"] == "你好"

    session = get_chat_session(sid)
    assert len(session["messages"]) == 2
    assert session["messages"][0]["content"] == "你好"

    # Update
    new_msgs = session["messages"] + [{"role": "user", "content": "查流失客户"}]
    save_chat_session(role="admin", messages=new_msgs, title="你好", session_id=sid)
    updated = get_chat_session(sid)
    assert len(updated["messages"]) == 3

    # Delete
    delete_chat_session(sid)
    assert get_chat_session(sid) is None


def test_chat_session_not_found():
    assert get_chat_session(99999) is None
