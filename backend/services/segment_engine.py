"""Customer segment engine — filter customers by tag theme rules."""
from __future__ import annotations

from datetime import date, datetime
from typing import Any

from backend.models.tag_schema import TagTheme, FilterGroup, FilterRule, ReportOverview


def segment_customers(theme: TagTheme, all_customers: list[dict]) -> list[dict]:
    """Return customers matching the theme's filter_group."""
    return [c for c in all_customers if _match_group(c, theme.filter_group)]


def _match_group(customer: dict, group: FilterGroup) -> bool:
    """Recursively evaluate a FilterGroup (AND/OR nested boolean tree)."""
    results = []
    for rule in group.rules:
        if isinstance(rule, FilterGroup):
            results.append(_match_group(customer, rule))
        else:
            results.append(_match_rule(customer, rule))
    if group.logic == "OR":
        return any(results)
    return all(results)  # AND (default)


def _match_rule(customer: dict, rule: FilterRule) -> bool:
    """Evaluate a single leaf-level filter rule."""
    value = _get_nested_field(customer, rule.field)
    if value is None:
        return False
    try:
        match rule.operator:
            case ">=":   return value >= rule.value
            case "<=":   return value <= rule.value
            case "==":   return value == rule.value
            case "!=":   return value != rule.value
            case "in":   return value in rule.value
            case "not_in": return value not in rule.value
            case "between": return rule.value[0] <= value <= rule.value[1]
            case "contains": return rule.value in value
    except (TypeError, ValueError):
        return False
    return False


def _get_nested_field(obj: dict, field_path: str) -> Any:
    """Resolve dot-notation field path like 'basic_info.occupation'."""
    parts = field_path.split(".")
    current = obj
    for part in parts:
        if isinstance(current, dict):
            current = current.get(part)
        else:
            return None
        if current is None:
            return None
    return current


# ── Overview generation ──────────────────────────────────

def generate_overview(customers: list[dict]) -> ReportOverview:
    """Generate Chapter 2: customer segment basic overview."""
    today = date.today()
    ages = []
    for c in customers:
        bd_str = c.get("birth_date")
        if bd_str:
            try:
                bd = datetime.strptime(bd_str, "%Y-%m-%d").date()
                age = today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day))
                ages.append(age)
            except ValueError:
                pass

    return ReportOverview(
        total_count=len(customers),
        gender_stats=_count_by(customers, "gender"),
        age_histogram=_build_age_histogram(ages),
        region_stats=_count_by(customers, "province"),
        occupation_stats=_count_by(customers, "basic_info.occupation"),
        education_stats=_count_by(customers, "education"),
        asset_level_stats=_count_by(customers, "asset_level"),
        core_segment=_identify_core_segment(customers),
    )


def _count_by(customers: list[dict], field: str) -> dict[str, int]:
    """Count customers by a field value."""
    counts: dict[str, int] = {}
    for c in customers:
        val = _get_nested_field(c, field)
        key = str(val) if val is not None else "未知"
        counts[key] = counts.get(key, 0) + 1
    return counts


def _build_age_histogram(ages: list[int]) -> dict:
    """Build age distribution histogram with standard banking brackets."""
    bins = [(0, 25), (25, 35), (35, 45), (45, 55), (55, 65), (65, 200)]
    labels = ["25岁以下", "25-35岁", "35-45岁", "45-55岁", "55-65岁", "65岁以上"]
    result = {label: 0 for label in labels}
    for age in ages:
        for (lo, hi), label in zip(bins, labels):
            if lo <= age < hi:
                result[label] += 1
                break
    return {"labels": labels, "values": [result[l] for l in labels]}


def _identify_core_segment(customers: list[dict]) -> str:
    """Identify the largest sub-segment by asset_level."""
    counts = _count_by(customers, "asset_level")
    if not counts:
        return ""
    return max(counts, key=counts.get)
