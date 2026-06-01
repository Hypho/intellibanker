"""Feature analyzer — compute statistics and significance for tag features."""
from __future__ import annotations

from collections import Counter
from datetime import date, datetime
from statistics import mean, stdev
from typing import Any

from backend.models.tag_schema import (
    TagFeature, TagGroup, TagTheme, FeatureResult, FeatureGroup,
)
from backend.data.tag_data import get_all_features, get_feature_by_id
from backend.services.segment_engine import _get_nested_field


# ── Main analysis entry point ────────────────────────────

def analyze_all_features(
    theme: TagTheme,
    seg_customers: list[dict],
    all_customers: list[dict],
) -> list[FeatureGroup]:
    """Analyze all features grouped by TagGroup for the report Chapter 3."""
    all_features = get_all_features()
    groups = []

    for tg in theme.tag_groups:
        results = []
        for fid in tg.feature_ids:
            feat = all_features.get(fid)
            if not feat:
                continue
            result = analyze_single_feature(seg_customers, feat, all_customers)
            results.append(result)

        # Select Top5 by significance
        candidates = [r for r in results if all_features[r.feature_id].is_top5_candidate]
        candidates.sort(key=lambda r: r.significance_score, reverse=True)
        top5_ids = {r.feature_id for r in candidates[:5]}
        for r in results:
            r.is_top5 = r.feature_id in top5_ids

        groups.append(FeatureGroup(
            group_id=tg.id,
            group_name=tg.name,
            features=results,
            top5_features=[r for r in results if r.is_top5],
        ))

    return groups


def analyze_single_feature(
    seg_customers: list[dict],
    feature: TagFeature,
    all_customers: list[dict],
) -> FeatureResult:
    """Compute statistics for a single feature against the segment."""
    seg_values = _extract_values(seg_customers, feature.source_field)
    all_values = _extract_values(all_customers, feature.source_field)

    chart_data, raw_stats = _aggregate(seg_values, all_values, feature)

    significance = _calc_significance(seg_values, all_values, feature)

    return FeatureResult(
        feature_id=feature.id,
        feature_name=feature.name,
        chart_type=feature.chart_type,
        chart_data=chart_data,
        significance_score=round(significance, 4),
        raw_stats=raw_stats,
    )


# ── Value extraction ─────────────────────────────────────

def _extract_values(customers: list[dict], source_field: str) -> list[Any]:
    """Extract raw values from customers, handling nested fields and arrays."""
    values = []
    for c in customers:
        if "[]." in source_field:
            # Array field: "products[].type" → extract type from each product
            base, sub_field = source_field.split("[].", 1)
            arr = _get_nested_field(c, base)
            if isinstance(arr, list):
                for item in arr:
                    if isinstance(item, dict):
                        values.append(item.get(sub_field))
                    else:
                        values.append(item)
        elif source_field == "aum_history":
            values.append(c.get("aum_history", {}))
        else:
            values.append(_get_nested_field(c, source_field))
    return values


# ── Aggregation ──────────────────────────────────────────

def _aggregate(seg_values: list, all_values: list, feature: TagFeature) -> tuple[dict, dict]:
    """Compute aggregation and return (chart_data, raw_stats)."""
    agg = feature.aggregation

    if agg == "avg":
        numeric = [v for v in seg_values if isinstance(v, (int, float))]
        val = mean(numeric) if numeric else 0
        all_numeric = [v for v in all_values if isinstance(v, (int, float))]
        benchmark = mean(all_numeric) if all_numeric else 0
        return {"value": round(val, 2), "benchmark": round(benchmark, 2)}, \
               {"mean": round(val, 2), "count": len(numeric)}

    if agg == "avg_len":
        lengths = [len(v) if isinstance(v, (list, dict)) else 0 for v in seg_values]
        val = mean(lengths) if lengths else 0
        all_lengths = [len(v) if isinstance(v, (list, dict)) else 0 for v in all_values]
        benchmark = mean(all_lengths) if all_lengths else 0
        return {"value": round(val, 2), "benchmark": round(benchmark, 2)}, \
               {"mean": round(val, 2), "count": len(lengths)}

    if agg == "distribution":
        numeric = [v for v in seg_values if isinstance(v, (int, float))]
        bins = feature.chart_config.get("bins", 5)
        labels = feature.chart_config.get("bin_labels", [])
        hist = _build_histogram(numeric, bins, labels)
        return hist, {"mean": round(mean(numeric), 2) if numeric else 0, "count": len(numeric)}

    if agg == "age_distribution":
        today = date.today()
        ages = []
        for v in seg_values:
            if v:
                try:
                    bd = datetime.strptime(str(v), "%Y-%m-%d").date()
                    ages.append(today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day)))
                except ValueError:
                    pass
        bins = feature.chart_config.get("bins", [0, 25, 35, 45, 55, 65, 100])
        labels = feature.chart_config.get("bin_labels", [])
        hist = _build_histogram(ages, bins, labels)
        return hist, {"mean": round(mean(ages), 1) if ages else 0, "count": len(ages)}

    if agg == "enum_count":
        counter = Counter(v for v in seg_values if v is not None)
        total = sum(counter.values()) or 1
        top_n = feature.chart_config.get("top_n", 10)
        sorted_items = counter.most_common(top_n)
        chart = {"labels": [str(k) for k, _ in sorted_items],
                 "values": [v for _, v in sorted_items],
                 "percentages": [round(v / total * 100, 1) for _, v in sorted_items]}
        return chart, {"total": total, "unique": len(counter)}

    if agg == "coverage_ratio":
        # Percentage of customers where the value is > 0
        total = len(seg_values) or 1
        covered = sum(1 for v in seg_values if isinstance(v, (int, float)) and v > 0)
        val = covered / total * 100
        all_total = len(all_values) or 1
        all_covered = sum(1 for v in all_values if isinstance(v, (int, float)) and v > 0)
        benchmark = all_covered / all_total * 100
        return {"value": round(val, 1), "benchmark": round(benchmark, 1)}, \
               {"covered": covered, "total": total}

    if agg == "deposit_ratio":
        # deposits / aum ratio
        ratios = []
        for v in seg_values:
            if isinstance(v, dict):
                total_dep = v.get("current", 0) + v.get("term", 0) + v.get("large_certificate", 0)
                # Need aum from same customer - approximate from value
                ratios.append(total_dep)
        val = mean(ratios) if ratios else 0
        return {"value": round(val, 2)}, {"mean": round(val, 2), "count": len(ratios)}

    if agg == "mom_change":
        # Month-over-month change from aum_history
        changes = _calc_aum_changes(seg_values, mode="mom")
        val = mean(changes) if changes else 0
        return {"value": round(val * 100, 2), "benchmark": 0}, \
               {"mean": round(val * 100, 2), "count": len(changes)}

    if agg == "yoy_change":
        changes = _calc_aum_changes(seg_values, mode="yoy")
        val = mean(changes) if changes else 0
        return {"value": round(val * 100, 2), "benchmark": 0}, \
               {"mean": round(val * 100, 2), "count": len(changes)}

    if agg == "trend":
        # Aggregate aum_history across all customers
        trend = _aggregate_aum_trend(seg_values)
        return trend, {"months": len(trend.get("labels", []))}

    return {}, {}


# ── Significance scoring ─────────────────────────────────

def _calc_significance(seg_values: list, all_values: list, feature: TagFeature) -> float:
    """Calculate significance score (0-1) using Z-score for numeric, proportion diff for enum."""
    if feature.aggregation in ("mom_change", "yoy_change"):
        numeric = [v for v in seg_values if isinstance(v, dict)]
        changes = _calc_aum_changes(numeric, mode="mom" if feature.aggregation == "mom_change" else "yoy")
        if not changes:
            return 0.0
        seg_mean = mean(changes)
        return min(abs(seg_mean) / 0.1, 1.0)  # 10% change = max significance

    if feature.data_type == "number":
        numeric = [v for v in seg_values if isinstance(v, (int, float))]
        all_numeric = [v for v in all_values if isinstance(v, (int, float))]
        if len(numeric) < 2 or len(all_numeric) < 2:
            return 0.0
        seg_mean = mean(numeric)
        all_mean = mean(all_numeric)
        all_std = stdev(all_numeric)
        if all_std == 0:
            return 0.0
        z_score = abs(seg_mean - all_mean) / all_std
        return min(z_score / 3.0, 1.0)

    if feature.data_type == "enum":
        seg_dist = _distribution(seg_values)
        all_dist = _distribution(all_values)
        all_keys = set(seg_dist) | set(all_dist)
        if not all_keys:
            return 0.0
        max_diff = max(abs(seg_dist.get(k, 0) - all_dist.get(k, 0)) for k in all_keys)
        return min(max_diff / 0.5, 1.0)

    return 0.0


def _distribution(values: list) -> dict[str, float]:
    """Calculate normalized distribution (proportions) for enum values."""
    counter = Counter(str(v) for v in values if v is not None)
    total = sum(counter.values()) or 1
    return {k: v / total for k, v in counter.items()}


# ── Helpers ──────────────────────────────────────────────

def _build_histogram(values: list[float], bins, labels: list[str]) -> dict:
    """Build histogram from numeric values."""
    if not isinstance(bins, list):
        # bins is an integer → auto-range
        if not values:
            return {"labels": [], "values": []}
        lo, hi = min(values), max(values)
        step = (hi - lo) / bins if hi > lo else 1
        bins = [lo + i * step for i in range(bins + 1)]

    counts = [0] * (len(bins) - 1)
    for v in values:
        for i in range(len(bins) - 1):
            if bins[i] <= v < bins[i + 1]:
                counts[i] += 1
                break
        else:
            if v >= bins[-1]:
                counts[-1] += 1

    if not labels:
        labels = [f"{bins[i]:,.0f}-{bins[i+1]:,.0f}" for i in range(len(bins) - 1)]

    return {"labels": labels, "values": counts}


def _calc_aum_changes(histories: list[dict], mode: str = "mom") -> list[float]:
    """Calculate month-over-month or year-over-year AUM change rates."""
    changes = []
    for h in histories:
        if not isinstance(h, dict) or len(h) < 2:
            continue
        sorted_months = sorted(h.keys())
        if mode == "mom" and len(sorted_months) >= 2:
            prev, curr = h[sorted_months[-2]], h[sorted_months[-1]]
            if prev > 0:
                changes.append((curr - prev) / prev)
        elif mode == "yoy" and len(sorted_months) >= 6:
            prev, curr = h[sorted_months[-6]], h[sorted_months[-1]]
            if prev > 0:
                changes.append((curr - prev) / prev)
    return changes


def _aggregate_aum_trend(histories: list[dict]) -> dict:
    """Aggregate individual AUM histories into a segment-level trend."""
    if not histories:
        return {"labels": [], "values": []}
    # Collect all months
    all_months = set()
    for h in histories:
        if isinstance(h, dict):
            all_months.update(h.keys())
    months = sorted(all_months)
    if not months:
        return {"labels": [], "values": []}
    # Average AUM per month
    values = []
    for m in months:
        vals = [h[m] for h in histories if isinstance(h, dict) and m in h]
        values.append(round(mean(vals)) if vals else 0)
    return {"labels": months, "values": values}
