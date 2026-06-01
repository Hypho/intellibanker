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


# ── Aggregation registry ─────────────────────────────────

def _agg_avg(seg, all_vals, cfg):
    numeric = [v for v in seg if isinstance(v, (int, float))]
    all_num = [v for v in all_vals if isinstance(v, (int, float))]
    return ({"value": round(mean(numeric), 2), "benchmark": round(mean(all_num), 2) if all_num else 0},
            {"mean": round(mean(numeric), 2) if numeric else 0, "count": len(numeric)})


def _agg_avg_len(seg, all_vals, cfg):
    seg_lens = [len(v) if isinstance(v, (list, dict)) else 0 for v in seg]
    all_lens = [len(v) if isinstance(v, (list, dict)) else 0 for v in all_vals]
    return ({"value": round(mean(seg_lens), 2), "benchmark": round(mean(all_lens), 2) if all_lens else 0},
            {"mean": round(mean(seg_lens), 2) if seg_lens else 0, "count": len(seg_lens)})


def _agg_distribution(seg, all_vals, cfg):
    numeric = [v for v in seg if isinstance(v, (int, float))]
    return (_build_histogram(numeric, cfg.get("bins", 5), cfg.get("bin_labels", [])),
            {"mean": round(mean(numeric), 2) if numeric else 0, "count": len(numeric)})


def _agg_age_distribution(seg, all_vals, cfg):
    today = date.today()
    ages = []
    for v in seg:
        if v:
            try:
                bd = datetime.strptime(str(v), "%Y-%m-%d").date()
                ages.append(today.year - bd.year - ((today.month, today.day) < (bd.month, bd.day)))
            except ValueError:
                pass
    return (_build_histogram(ages, cfg.get("bins", [0,25,35,45,55,65,100]), cfg.get("bin_labels", [])),
            {"mean": round(mean(ages), 1) if ages else 0, "count": len(ages)})


def _agg_enum_count(seg, all_vals, cfg):
    counter = Counter(v for v in seg if v is not None)
    total = sum(counter.values()) or 1
    top_n = cfg.get("top_n", 10)
    items = counter.most_common(top_n)
    return ({"labels": [str(k) for k, _ in items], "values": [v for _, v in items],
             "percentages": [round(v / total * 100, 1) for _, v in items]},
            {"total": total, "unique": len(counter)})


def _agg_coverage_ratio(seg, all_vals, cfg):
    total = len(seg) or 1
    covered = sum(1 for v in seg if isinstance(v, (int, float)) and v > 0)
    all_total = len(all_vals) or 1
    all_covered = sum(1 for v in all_vals if isinstance(v, (int, float)) and v > 0)
    return ({"value": round(covered / total * 100, 1), "benchmark": round(all_covered / all_total * 100, 1)},
            {"covered": covered, "total": total})


def _agg_deposit_ratio(seg, all_vals, cfg):
    ratios = [v.get("current", 0) + v.get("term", 0) + v.get("large_certificate", 0)
              for v in seg if isinstance(v, dict)]
    val = mean(ratios) if ratios else 0
    return {"value": round(val, 2)}, {"mean": round(val, 2), "count": len(ratios)}


def _agg_change(seg, all_vals, cfg):
    mode = cfg.get("_mode", "mom")
    changes = _calc_aum_changes(seg, mode=mode)
    val = mean(changes) if changes else 0
    return ({"value": round(val * 100, 2), "benchmark": 0},
            {"mean": round(val * 100, 2), "count": len(changes)})


def _agg_trend(seg, all_vals, cfg):
    trend = _aggregate_aum_trend(seg)
    return trend, {"months": len(trend.get("labels", []))}


AGGREGATORS = {
    "avg": _agg_avg,
    "avg_len": _agg_avg_len,
    "distribution": _agg_distribution,
    "age_distribution": _agg_age_distribution,
    "enum_count": _agg_enum_count,
    "coverage_ratio": _agg_coverage_ratio,
    "deposit_ratio": _agg_deposit_ratio,
    "mom_change": lambda seg, all_v, cfg: _agg_change(seg, all_v, {**cfg, "_mode": "mom"}),
    "yoy_change": lambda seg, all_v, cfg: _agg_change(seg, all_v, {**cfg, "_mode": "yoy"}),
    "trend": _agg_trend,
}


def _aggregate(seg_values: list, all_values: list, feature: TagFeature) -> tuple[dict, dict]:
    """Dispatch to the registered aggregator for this feature's aggregation type."""
    fn = AGGREGATORS.get(feature.aggregation)
    if fn:
        return fn(seg_values, all_values, feature.chart_config)
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
