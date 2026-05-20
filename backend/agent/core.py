"""LangGraph agent core - graph definition and streaming runner."""
from __future__ import annotations

import json
from typing import AsyncIterator

from langchain.agents import create_agent
from langchain_openai import ChatOpenAI

from backend.config import config
from backend.agent.tools import ALL_TOOLS

SYSTEM_PROMPT = """你是 IntelliBanker 银行智能营销平台的 AI 助手。
你可以帮助用户分析客户数据、查询客户画像、获取经营洞察、生成拜访建议等。

可用工具说明：
- list_personal_customers_summary / list_enterprise_customers_summary：查看客户列表
- get_customer_detail：查看客户完整信息
- get_customer_profile_summary：查看客户画像摘要
- get_visit_suggestions：获取拜访建议和推荐产品
- get_insight_overview：获取全行经营数据概览
- get_high_risk_customers：查看流失预警客户
- derive_customer_tags_and_tasks：根据拜访内容推导标签和任务

请用中文回答，语言专业简洁。如果用户的问题可以用数据回答，请先查询数据再分析。"""


def _build_llm() -> ChatOpenAI:
    return ChatOpenAI(
        model=config.DEEPSEEK_MODEL,
        api_key=config.DEEPSEEK_API_KEY or "sk-placeholder",
        base_url=config.DEEPSEEK_BASE_URL,
        temperature=0.3,
        streaming=True,
    )


def build_agent_graph():
    """Build the LangGraph ReAct agent graph. Returns None if API key is missing."""
    if not config.DEEPSEEK_API_KEY:
        return None
    llm = _build_llm()
    return create_agent(
        model=llm,
        tools=ALL_TOOLS,
        system_prompt=SYSTEM_PROMPT,
    )


_agent_graph = None


def get_agent_graph():
    global _agent_graph
    if _agent_graph is None:
        _agent_graph = build_agent_graph()
    return _agent_graph


def reset_agent_graph():
    """Reset the singleton (used in tests)."""
    global _agent_graph
    _agent_graph = None


async def stream_agent_events(
    user_message: str,
    history: list[dict] | None = None,
) -> AsyncIterator[dict]:
    """Stream structured events from the agent graph.

    Yields dicts with 'event' and 'data' keys:
    - {"event": "tool_call", "data": {"name": "...", "args": "..."}}
    - {"event": "tool_result", "data": {"name": "...", "content": "..."}}
    - {"event": "answer", "data": {"content": "..."}}
    - {"event": "error", "data": {"message": "..."}}
    """
    graph = get_agent_graph()
    if graph is None:
        yield {
            "event": "error",
            "data": {"message": "DEEPSEEK_API_KEY 未配置，请在 .env 文件中设置后重启服务。"},
        }
        return

    messages = []
    if history:
        for msg in history[-10:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": user_message})

    try:
        async for event in graph.astream_events({"messages": messages}, version="v2"):
            kind = event.get("event", "")
            name = event.get("name", "")

            if kind == "on_chat_model_stream":
                chunk = event.get("data", {}).get("chunk")
                if chunk and hasattr(chunk, "content") and chunk.content:
                    yield {"event": "answer", "data": {"content": chunk.content}}

            elif kind == "on_tool_start":
                yield {
                    "event": "tool_call",
                    "data": {
                        "name": name,
                        "args": json.dumps(
                            event.get("data", {}).get("input", {}),
                            ensure_ascii=False,
                        ),
                    },
                }

            elif kind == "on_tool_end":
                output = event.get("data", {}).get("output", "")
                if isinstance(output, str) and len(output) > 500:
                    output = output[:500] + "..."
                yield {
                    "event": "tool_result",
                    "data": {"name": name, "content": str(output)},
                }

    except Exception as e:
        yield {"event": "error", "data": {"message": f"Agent 执行出错: {e}"}}
