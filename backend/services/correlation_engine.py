"""Correlation engine — discover non-trivial associations between tag features."""
from __future__ import annotations

from collections import Counter
from itertools import combinations
from statistics import mean
from typing import Any

from backend.models.tag_schema import TagFeature, CorrelationRule
from backend.data.tag_data import get_all_features
from backend.services.segment_engine import _get_nested_field
from backend.services.feature_analyzer import _extract_values, _distribution


# ── Mutually exclusive groups (skip intra-group correlations) ──

MUTUALLY_EXCLUSIVE_GROUPS: list[set[str]] = [
    {"asset_level_ratio", "avg_aum", "aum_distribution"},
    {"churn_probability", "lifecycle_distribution"},
    {"product_count", "product_type_distribution"},
    {"aum_mom_change", "aum_yoy_change", "aum_trend"},
]


def _in_same_exclusive_group(id1: str, id2: str) -> bool:
    for group in MUTUALLY_EXCLUSIVE_GROUPS:
        if id1 in group and id2 in group:
            return True
    return False


# ── Main entry point ─────────────────────────────────────

def discover_correlations(
    seg_customers: list[dict],
    all_features: dict[str, TagFeature] | None = None,
) -> list[CorrelationRule]:
    """Discover non-trivial correlations in the customer segment."""
    if all_features is None:
        all_features = get_all_features()

    enum_features = [f for f in all_features.values()
                     if f.data_type == "enum" and not f.source_field.endswith("[]")]
    numeric_features = [f for f in all_features.values()
                        if f.data_type == "number" and f.aggregation in ("avg", "avg_len")]

    rules: list[CorrelationRule] = []

    # Enum-enum: Lift
    rules.extend(_discover_enum_enum(seg_customers, enum_features))
    # Enum-numeric: mean ratio
    rules.extend(_discover_enum_numeric(seg_customers, enum_features, numeric_features))

    # Sort by strength, return top 5
    rules.sort(key=lambda r: max(r.lift, r.ratio, 0), reverse=True)
    return rules[:5]


# ── Enum-Enum (Lift) ─────────────────────────────────────

def _discover_enum_enum(
    customers: list[dict],
    enum_features: list[TagFeature],
) -> list[CorrelationRule]:
    rules = []
    n = len(customers) or 1

    for f1, f2 in combinations(enum_features, 2):
        if _in_same_exclusive_group(f1.id, f2.id):
            continue
        vals1 = _extract_values(customers, f1.source_field)
        vals2 = _extract_values(customers, f2.source_field)

        for v1 in {v for v in vals1 if v is not None}:
            for v2 in {v for v in vals2 if v is not None}:
                count_a = sum(1 for v in vals1 if v == v1)
                count_b = sum(1 for v in vals2 if v == v2)
                count_ab = sum(1 for a, b in zip(vals1, vals2) if a == v1 and b == v2)

                support = count_ab / n
                p_a = count_a / n
                p_b = count_b / n
                lift = (count_ab / n) / (p_a * p_b) if p_a > 0 and p_b > 0 else 0

                if lift >= 1.3 and support >= 0.03:
                    confidence = count_ab / count_a if count_a > 0 else 0
                    rules.append(CorrelationRule(
                        type="enum_enum",
                        antecedent=f"{f1.name}={v1}",
                        consequent=f"{f2.name}={v2}",
                        support=round(support, 3),
                        lift=round(lift, 2),
                        confidence=round(confidence, 3),
                    ))
    return rules


# ── Enum-Numeric (Mean Ratio) ────────────────────────────

def _discover_enum_numeric(
    customers: list[dict],
    enum_features: list[TagFeature],
    numeric_features: list[TagFeature],
) -> list[CorrelationRule]:
    rules = []

    for ef in enum_features:
        for nf in numeric_features:
            if _in_same_exclusive_group(ef.id, nf.id):
                continue
            all_vals = _extract_values(customers, nf.source_field)
            numeric_all = [v for v in all_vals if isinstance(v, (int, float))]
            if len(numeric_all) < 2:
                continue
            all_mean = mean(numeric_all)
            if all_mean == 0:
                continue

            enum_vals = _extract_values(customers, ef.source_field)
            for v in {ev for ev in enum_vals if ev is not None}:
                seg = [c for c, ev in zip(customers, enum_vals) if ev == v]
                if len(seg) < 2:
                    continue
                seg_numeric = _extract_values(seg, nf.source_field)
                seg_nums = [x for x in seg_numeric if isinstance(x, (int, float))]
                if not seg_nums:
                    continue
                seg_mean = mean(seg_nums)
                ratio = seg_mean / all_mean

                if ratio > 1.5 or ratio < 0.67:
                    direction = "显著高于" if ratio > 1 else "显著低于"
                    rules.append(CorrelationRule(
                        type="enum_numeric",
                        antecedent=f"{ef.name}={v}",
                        consequent=nf.name,
                        support=round(len(seg) / len(customers), 3),
                        ratio=round(ratio, 2),
                        direction=direction,
                        insight=f"{v}客群的{nf.name}{direction}全行平均（{ratio:.1f}倍）",
                    ))
    return rules
