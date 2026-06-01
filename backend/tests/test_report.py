"""Tests for the report P0 pipeline: tag schema, segment engine, feature analyzer."""
import copy
import pytest
from backend.models.tag_schema import FilterGroup, FilterRule
from backend.data.tag_data import get_all_themes, get_theme_by_id, get_all_features
from backend.services.segment_engine import segment_customers, generate_overview
from backend.services.feature_analyzer import analyze_all_features


@pytest.fixture
def sample_customers():
    """Minimal customer list for testing."""
    return [
        {
            "id": "P001", "gender": "男", "birth_date": "1985-03-15",
            "education": "本科", "marital_status": "已婚", "province": "北京市",
            "aum": 1500000, "asset_level": "高净值客户", "lifecycle": "成熟期",
            "salary_account": True, "monthly_salary": 25000,
            "monthly_transaction_count": 20, "community": "和平里社区",
            "business_district": "王府井商圈",
            "aum_history": {"2025-12": 1400000, "2026-01": 1420000, "2026-02": 1450000,
                           "2026-03": 1480000, "2026-04": 1500000, "2026-05": 1500000},
            "products": [{"type": "活期存款", "balance": 50000}, {"type": "基金", "balance": 200000}],
            "deposits": {"current": 50000, "term": 300000, "large_certificate": 500000},
            "loans": {"balance": 0},
            "tags": {"churn_probability": 0.1},
            "events": [],
            "financial_behavior": {"channel_preference": "手机银行", "app_login_days_30": 22},
            "basic_info": {"occupation": "企业主", "name": "张伟", "branch": "东城支行"},
        },
        {
            "id": "P002", "gender": "女", "birth_date": "1990-08-20",
            "education": "硕士", "marital_status": "未婚", "province": "上海市",
            "aum": 2000000, "asset_level": "高净值客户", "lifecycle": "成熟期",
            "salary_account": False, "monthly_salary": 0,
            "monthly_transaction_count": 8, "community": "陆家嘴社区",
            "business_district": "陆家嘴商圈",
            "aum_history": {"2025-12": 1800000, "2026-01": 1850000, "2026-02": 1900000,
                           "2026-03": 1920000, "2026-04": 1950000, "2026-05": 2000000},
            "products": [{"type": "活期存款", "balance": 100000}, {"type": "定期存款", "balance": 500000},
                         {"type": "保险", "balance": 300000}],
            "deposits": {"current": 100000, "term": 500000, "large_certificate": 0},
            "loans": {"balance": 500000},
            "tags": {"churn_probability": 0.05},
            "events": [{"type": "test"}],
            "financial_behavior": {"channel_preference": "网点", "app_login_days_30": 5},
            "basic_info": {"occupation": "公司职员", "name": "王芳", "branch": "东城支行"},
        },
        {
            "id": "P003", "gender": "男", "birth_date": "1978-11-01",
            "education": "大专", "marital_status": "已婚", "province": "北京市",
            "aum": 80000, "asset_level": "大众客户", "lifecycle": "衰退期",
            "salary_account": True, "monthly_salary": 6000,
            "monthly_transaction_count": 3, "community": "望京社区",
            "business_district": "望京商圈",
            "aum_history": {"2025-12": 100000, "2026-01": 95000, "2026-02": 90000,
                           "2026-03": 88000, "2026-04": 85000, "2026-05": 80000},
            "products": [{"type": "活期存款", "balance": 30000}],
            "deposits": {"current": 30000, "term": 0, "large_certificate": 0},
            "loans": {"balance": 0},
            "tags": {"churn_probability": 0.7},
            "events": [{"type": "churn"}, {"type": "deposit_drop"}],
            "financial_behavior": {"channel_preference": "网点", "app_login_days_30": 0},
            "basic_info": {"occupation": "退休人员", "name": "李强", "branch": "西城支行"},
        },
    ]


# ── Tag schema tests ─────────────────────────────────────

def test_themes_loaded():
    themes = get_all_themes()
    assert len(themes) == 3
    ids = {t.id for t in themes}
    assert ids == {"high_net_worth", "salary_customer", "churn_risk"}


def test_features_loaded():
    features = get_all_features()
    assert len(features) >= 20
    assert "avg_aum" in features
    assert "aum_trend" in features


def test_theme_lookup():
    t = get_theme_by_id("high_net_worth")
    assert t is not None
    assert t.name == "高净值客户"
    assert get_theme_by_id("nonexistent") is None


# ── Segment engine tests ─────────────────────────────────

def test_segment_high_net_worth(sample_customers):
    theme = get_theme_by_id("high_net_worth")
    seg = segment_customers(theme, sample_customers)
    ids = {c["id"] for c in seg}
    assert ids == {"P001", "P002"}  # aum >= 1000000


def test_segment_salary_customer(sample_customers):
    theme = get_theme_by_id("salary_customer")
    seg = segment_customers(theme, sample_customers)
    ids = {c["id"] for c in seg}
    assert ids == {"P001", "P003"}  # salary_account == True


def test_segment_churn_risk_or_logic(sample_customers):
    """Test that the churn_risk theme uses OR logic correctly."""
    theme = get_theme_by_id("churn_risk")
    seg = segment_customers(theme, sample_customers)
    ids = {c["id"] for c in seg}
    assert "P003" in ids  # lifecycle == "衰退期"


def test_segment_empty_result(sample_customers):
    """Segment with impossible filter returns empty."""
    theme = copy.deepcopy(get_theme_by_id("high_net_worth"))
    theme.filter_group = FilterGroup(logic="AND", rules=[
        FilterRule(field="aum", operator=">=", value=999999999),
    ])
    seg = segment_customers(theme, sample_customers)
    assert len(seg) == 0


def test_overview_generation(sample_customers):
    overview = generate_overview(sample_customers)
    assert overview.total_count == 3
    assert overview.gender_stats["男"] == 2
    assert overview.gender_stats["女"] == 1
    assert overview.core_segment == "高净值客户"  # 2 out of 3


# ── Feature analyzer tests ───────────────────────────────

def test_feature_analysis_high_net_worth(sample_customers):
    theme = get_theme_by_id("high_net_worth")
    seg = segment_customers(theme, sample_customers)
    groups = analyze_all_features(theme, seg, sample_customers)

    assert len(groups) == len(theme.tag_groups)
    # Check that features were computed
    asset_group = next(g for g in groups if g.group_id == "asset")
    assert len(asset_group.features) > 0
    # Check avg_aum
    avg_aum = next(f for f in asset_group.features if f.feature_id == "avg_aum")
    assert avg_aum.chart_data["value"] == pytest.approx(1750000, abs=1)  # (1500000+2000000)/2
    assert avg_aum.significance_score > 0


def test_top5_selection(sample_customers):
    theme = get_theme_by_id("high_net_worth")
    seg = segment_customers(theme, sample_customers)
    groups = analyze_all_features(theme, seg, sample_customers)

    for g in groups:
        top5 = g.top5_features
        # Each group should have at most 5 top features
        assert len(top5) <= 5
        # All top5 should be marked
        for f in top5:
            assert f.is_top5 is True


def test_enum_count(sample_customers):
    theme = get_theme_by_id("high_net_worth")
    seg = segment_customers(theme, sample_customers)
    groups = analyze_all_features(theme, seg, sample_customers)

    demo_group = next(g for g in groups if g.group_id == "demographic")
    gender_feat = next(f for f in demo_group.features if f.feature_id == "gender_ratio")
    assert "男" in gender_feat.chart_data["labels"]
    assert "女" in gender_feat.chart_data["labels"]


def test_aum_trend(sample_customers):
    theme = get_theme_by_id("high_net_worth")
    seg = segment_customers(theme, sample_customers)
    groups = analyze_all_features(theme, seg, sample_customers)

    asset_group = next(g for g in groups if g.group_id == "asset")
    trend = next(f for f in asset_group.features if f.feature_id == "aum_trend")
    assert len(trend.chart_data["labels"]) == 6
    assert len(trend.chart_data["values"]) == 6


def test_mom_change(sample_customers):
    theme = get_theme_by_id("high_net_worth")
    seg = segment_customers(theme, sample_customers)
    groups = analyze_all_features(theme, seg, sample_customers)

    asset_group = next(g for g in groups if g.group_id == "asset")
    mom = next(f for f in asset_group.features if f.feature_id == "aum_mom_change")
    # P001: (1500000-1500000)/1500000 = 0, P002: (2000000-1950000)/1950000 ≈ 2.56%
    assert mom.chart_data["value"] > 0  # positive (P002's growth dominates)
