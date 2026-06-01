"""Report generator — assemble report with LLM insights and fallbacks."""
from __future__ import annotations

import asyncio
import uuid
from datetime import date, datetime
from typing import Optional

from backend.models.tag_schema import (
    TagTheme, ReportInstance, ReportOverview, ReportRecommendations,
    FeatureGroup, FeatureResult, CorrelationRule,
)
from backend.data.mock_data import get_personal_customers
from backend.data.tag_data import get_theme_by_id, get_all_features
from backend.services.segment_engine import segment_customers, generate_overview
from backend.services.feature_analyzer import analyze_all_features
from backend.services.correlation_engine import discover_correlations
from backend.config import call_deepseek


def _filter_by_role(customers: list[dict], manager_id: str | None, branch_id: str | None) -> list[dict]:
    """Filter customers by role scope before segment analysis."""
    if manager_id:
        return [c for c in customers if c.get("basic_info", {}).get("manager_id") == manager_id]
    if branch_id:
        from backend.data.mock_data import MANAGERS
        branch_name = next((m["branch"] for m in MANAGERS if m["id"] == branch_id), None)
        if branch_name:
            return [c for c in customers if c.get("basic_info", {}).get("branch") == branch_name]
    return customers


# ── Report generation ────────────────────────────────────

async def generate_report(
    theme_id: str,
    user: str = "admin",
    manager_id: str | None = None,
    branch_id: str | None = None,
) -> ReportInstance:
    """Full report generation pipeline with role-based filtering."""
    theme = get_theme_by_id(theme_id)
    if not theme:
        return ReportInstance(status="failed", message=f"主题 {theme_id} 不存在")

    all_customers = _filter_by_role(get_personal_customers(), manager_id, branch_id)

    # Phase ② Segment
    seg = segment_customers(theme, all_customers)
    if not seg:
        return ReportInstance(
            status="empty", theme_id=theme_id, theme_name=theme.name,
            message="未筛选到符合条件的客户",
        )
    overview = generate_overview(seg)

    # Phase ③④ Parallel: feature analysis + correlation
    feature_task = _analyze_features(theme, seg, all_customers)
    correlation_task = _analyze_correlations(seg)
    feature_groups, correlations = await asyncio.gather(feature_task, correlation_task)

    # Phase ④.5: Generate group-level summaries + executive summary (parallel)
    summary_tasks = [_generate_group_summary(g, theme, len(seg)) for g in feature_groups]
    exec_task = _generate_executive_summary(theme, seg, feature_groups, correlations)
    summaries = await asyncio.gather(*summary_tasks, exec_task)
    executive_summary = summaries[-1]

    # Phase ⑤ Marketing recommendations (with fallback)
    recommendations = await _generate_recommendations(theme, seg, feature_groups, correlations)

    report_id = f"RPT-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
    return ReportInstance(
        id=report_id,
        theme_id=theme.id,
        theme_name=theme.name,
        generated_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        generated_by=user,
        data_date=date.today().isoformat(),
        customer_count=len(seg),
        status="completed",
        overview=overview,
        executive_summary=executive_summary,
        feature_analysis=feature_groups,
        correlation_insights=correlations,
        recommendations=recommendations,
    )


# ── Feature analysis with LLM insights ───────────────────

async def _analyze_features(
    theme: TagTheme,
    seg: list[dict],
    all_customers: list[dict],
) -> list[FeatureGroup]:
    """Analyze features and generate LLM insights for Top5."""
    groups = analyze_all_features(theme, seg, all_customers)
    all_features = get_all_features()

    # Generate LLM insights for Top5 features (batched to avoid rate limiting)
    tasks = []
    for g in groups:
        for f in g.features:
            feat_def = all_features.get(f.feature_id)
            if feat_def and f.is_top5:
                tasks.append(_generate_feature_insight(f, feat_def, theme, g.group_name, len(seg)))
            elif feat_def and not f.llm_insight:
                # Non-Top5 features: use business_hint as insight
                f.llm_insight = feat_def.business_hint

    if tasks:
        # Batch LLM calls to avoid rate limiting (max 5 concurrent)
        for i in range(0, len(tasks), 5):
            await asyncio.gather(*tasks[i:i+5])

    return groups


async def _generate_group_summary(group: FeatureGroup, theme: TagTheme, customer_count: int) -> None:
    """Generate a group-level analysis paragraph summarizing all features in the group."""
    feature_summaries = []
    for f in group.features:
        val = _format_chart_value(f.chart_data)
        feature_summaries.append(f"- {f.feature_name}: {val}")
    features_text = "\n".join(feature_summaries)

    prompt = f"""请根据以下{theme.name}客群（{customer_count}人）的「{group.group_name}」分析数据，撰写一段150字左右的综合分析摘要。

分析指标：
{features_text}

要求：
1. 综合概括该维度的整体特征，不要逐个罗列指标
2. 突出与客群价值相关的关键发现
3. 用专业银行分析语言，体现数据驱动的洞察
4. 结尾给出该维度的经营建议（1-2句）"""

    group.group_summary = await _llm_insight(
        prompt, max_tokens=300,
        fallback=f"该客群在{group.group_name}维度呈现以下特征：{features_text[:100]}...",
    )


async def _generate_executive_summary(
    theme: TagTheme, seg: list[dict],
    groups: list[FeatureGroup], correlations: list[CorrelationRule],
) -> str:
    """Generate an executive summary paragraph for the entire report."""
    # Collect key findings
    top_findings = []
    for g in groups:
        for f in g.features:
            if f.is_top5 and f.llm_insight:
                top_findings.append(f"{f.feature_name}: {f.llm_insight[:40]}")

    corr_findings = [r.llm_insight[:40] for r in correlations if r.llm_insight][:3]
    findings_text = "\n".join(f"- {f}" for f in top_findings[:6] + corr_findings)

    prompt = f"""请为{theme.name}客群画像分析报告撰写一段200字左右的执行摘要（报告开头的概述段落）。

客群：{theme.name}（{len(seg)}人）
主题描述：{theme.description}

关键发现：
{findings_text}

要求：
1. 开头说明客群规模和核心特征
2. 中间概括2-3个最重要的发现
3. 结尾给出整体经营策略建议
4. 语言精炼专业，适合管理层阅读"""

    return await _llm_insight(
        prompt, max_tokens=400,
        fallback=f"{theme.name}客群共{len(seg)}人，本报告从多个维度对其画像特征进行了全面分析，旨在为精准营销提供数据支撑。",
    )


async def _generate_feature_insight(
    result: FeatureResult,
    feature_def,
    theme: TagTheme,
    group_name: str,
    customer_count: int,
) -> None:
    """Generate LLM insight for a single feature, with fallback to business_hint."""
    val_str = _format_chart_value(result.chart_data)

    prompt = f"""请根据以下数据，用1-2句简洁的自然语言解读其业务含义。

客群：{theme.name}（{customer_count}人）
分析维度：{group_name}
指标名称：{result.feature_name}
指标值：{val_str}
业务背景：{feature_def.business_hint}

要求：
1. 突出该指标的业务含义
2. 用业务语言而非技术语言
3. 如有明显特征，给出简要建议
4. 控制在80字以内"""

    result.llm_insight = await _llm_insight(prompt, max_tokens=150, fallback=feature_def.business_hint)


# ── Correlation analysis with LLM insights ───────────────

async def _analyze_correlations(seg: list[dict]) -> list[CorrelationRule]:
    """Discover correlations and generate LLM insights."""
    rules = discover_correlations(seg)

    # Generate LLM insights for each rule (batched to avoid rate limiting)
    tasks = [_generate_correlation_insight(r) for r in rules]
    for i in range(0, len(tasks), 3):
        await asyncio.gather(*tasks[i:i+3])

    return rules


async def _generate_correlation_insight(rule: CorrelationRule) -> None:
    """Generate LLM insight for a correlation rule, with template fallback."""
    if rule.type == "enum_enum":
        prompt = f"""发现以下关联规则：

当客户满足「{rule.antecedent}」时，同时满足「{rule.consequent}」的概率是全行平均的 {rule.lift} 倍。
置信度：{rule.confidence:.0%}，支持度：{rule.support:.0%}。

请用50字以内生成洞察文案，要求：
1. 用业务语言描述关联关系
2. 给出一个可操作的营销建议
{"3. 这是一个重要发现（提升度>2），请强调" if rule.lift > 2 else ""}
"""
        fallback = (
            f"发现关联：{rule.antecedent} 的客群中，{rule.consequent} 的比例"
            f"是全行的 {rule.lift} 倍（置信度 {rule.confidence:.0%}）。"
            f"建议针对该组合特征设计专项营销方案。"
        )
    else:
        prompt = f"""发现以下数据特征：

「{rule.antecedent}」客群的{rule.consequent}{rule.direction}全行平均（{rule.ratio}倍）。
该客群占总客群的{rule.support:.0%}。

请用50字以内生成洞察文案，要求：
1. 用业务语言描述差异
2. 给出一个可操作的营销建议"""
        fallback = rule.insight or f"{rule.antecedent}客群的{rule.consequent}{rule.direction}全行平均。"

    rule.llm_insight = await _llm_insight(prompt, max_tokens=100, fallback=fallback)


# ── Marketing recommendations ────────────────────────────

TEMPLATE_RECOMMENDATIONS = {
    "高净值客户": ReportRecommendations(
        marketing_directions=[
            "专属理财顾问一对一服务，推荐大额存单和定制理财方案",
            "高端客户专属活动邀约（高尔夫、红酒品鉴等），增强粘性",
        ],
        priority_customers="资产集中度高但产品覆盖不足的客户，重点推荐基金和保险",
        cross_sell_opportunities=["基金定投", "高端保险", "家族信托"],
        marketing_script="尊敬的客户，感谢您一直以来的信任与支持。根据您的资产配置情况，我们为您定制了一套专属理财方案，兼顾收益与安全，期待与您详细沟通。",
    ),
    "default": ReportRecommendations(
        marketing_directions=[
            "根据客户资产等级匹配适配产品，提升交叉销售率",
            "通过线上线下结合的方式增加客户触达频次",
        ],
        priority_customers="产品覆盖度低且活跃度下降的客户",
        cross_sell_opportunities=["定期存款", "理财产品", "手机银行签约"],
        marketing_script="您好，我们注意到您近期的账户活跃情况，特为您推荐几款适合的理财产品，助您财富稳健增长。",
    ),
}


async def _generate_recommendations(
    theme: TagTheme,
    seg: list[dict],
    groups: list[FeatureGroup],
    correlations: list[CorrelationRule],
) -> ReportRecommendations:
    """Generate marketing recommendations with LLM, fallback to template."""
    # Build summary for LLM
    top5_summary = []
    for g in groups:
        for f in g.features:
            if f.is_top5:
                val = f.chart_data.get("value", "")
                top5_summary.append(f"- {f.feature_name}: {val}")
    top5_text = "\n".join(top5_summary[:10]) or "暂无显著特征"

    corr_text = "\n".join(
        f"- {r.llm_insight}" for r in correlations if r.llm_insight
    ) or "暂无关联洞察"

    prompt = f"""请基于以下客群画像，生成营销运营建议。

客群：{theme.name}（{len(seg)}人）
主题描述：{theme.description}

核心特征：
{top5_text}

关联洞察：
{corr_text}

请严格按以下JSON格式输出（不要输出其他内容）：
{{"marketing_directions": ["方向1", "方向2"], "priority_customers": "需要重点跟进的客户特征描述", "cross_sell_opportunities": ["产品1", "产品2"], "marketing_script": "一段100字以内的营销话术"}}"""

    try:
        response = await call_deepseek(
            prompt, system="你是银行营销策略专家。", max_tokens=500, temperature=0.6,
        )
        # Parse JSON response, stripping markdown fences if present
        import json
        text = response.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        data = json.loads(text)
        return ReportRecommendations(
            marketing_directions=data.get("marketing_directions", []),
            priority_customers=data.get("priority_customers", ""),
            cross_sell_opportunities=data.get("cross_sell_opportunities", []),
            marketing_script=data.get("marketing_script", ""),
            raw_text=response,
        )
    except Exception:
        # Fallback: use template based on dominant asset level
        from backend.services.segment_engine import _count_by
        levels = _count_by(seg, "asset_level")
        dominant = max(levels, key=levels.get) if levels else "default"
        return TEMPLATE_RECOMMENDATIONS.get(dominant, TEMPLATE_RECOMMENDATIONS["default"])


# ── Helpers ──────────────────────────────────────────────

async def _llm_insight(prompt: str, max_tokens: int = 150, fallback: str = "") -> str:
    """Unified LLM call with system role, retry, and empty fallback."""
    for attempt in range(2):
        try:
            result = await call_deepseek(
                prompt, system="你是银行数据分析专家。", max_tokens=max_tokens, temperature=0.5,
            )
            text = result.strip()
            if text:
                return text
        except Exception:
            pass
    return fallback


def _format_chart_value(chart_data: dict, separator: str = ", ") -> str:
    """Format chart_data as a human-readable string for LLM prompts."""
    if "value" in chart_data:
        v = chart_data["value"]
        return f"{v:,.1f}" if isinstance(v, float) else str(v)
    if "labels" in chart_data and "values" in chart_data:
        pairs = list(zip(chart_data["labels"], chart_data["values"]))[:5]
        return separator.join(f"{l}={v}" for l, v in pairs)
    return str(chart_data)
