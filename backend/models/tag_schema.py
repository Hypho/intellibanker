"""Tag metadata models for customer segment reporting."""
from __future__ import annotations

from pydantic import BaseModel, Field
from typing import Any, Optional


class FilterRule(BaseModel):
    """Leaf-level filter condition."""
    field: str          # dot-notation path: "aum", "basic_info.occupation"
    operator: str       # ">=", "<=", "==", "in", "not_in", "between", "contains"
    value: Any          # threshold or enum values


class FilterGroup(BaseModel):
    """Nested boolean group supporting AND/OR logic."""
    logic: str = "AND"                          # "AND" | "OR"
    rules: list[FilterRule | FilterGroup] = []  # leaves are FilterRule, branches are FilterGroup


class TagGroup(BaseModel):
    """Analysis dimension group (maps to a report chapter section)."""
    id: str                         # "asset"
    name: str                       # "资产实力分析"
    description: str                # "分析客群的资产规模、结构和变化趋势"
    feature_ids: list[str] = []     # associated TagFeature IDs
    chart_layout: str = "grid"      # "grid" | "list"


class TagFeature(BaseModel):
    """Individual tag feature definition with aggregation and visualization config."""
    id: str                         # "avg_aum"
    name: str                       # "平均AUM"
    description: str                # "客群平均管理资产规模"
    data_type: str                  # "number" | "enum" | "boolean"
    source_field: str               # dot-notation: "aum", "products[].type"
    aggregation: str                # "avg" | "sum" | "avg_len" | "distribution"
                                   # "enum_count" | "coverage_ratio" | "deposit_ratio"
                                   # "mom_change" | "yoy_change" | "trend"
                                   # "age_distribution"
    chart_type: str                 # "metric_card" | "bar" | "pie" | "histogram" | "line"
    chart_config: dict = Field(default_factory=dict)
    business_hint: str = ""         # fallback LLM text & context for prompt
    is_top5_candidate: bool = True  # eligible for Top5 significance ranking
    display_order: int = 0          # ordering within TagGroup


class TagTheme(BaseModel):
    """Top-level theme: defines a customer segment and its analysis dimensions."""
    id: str                         # "high_net_worth"
    name: str                       # "高净值客户"
    description: str                # "AUM 100万以上的个人客户"
    customer_type: str = "personal" # "personal" | "enterprise"
    filter_group: FilterGroup       # segment selection rules (nested AND/OR)
    tag_groups: list[TagGroup] = [] # analysis dimension groups
    report_template: str = "standard_v1"
    created_by: str = "system"
    created_at: str = ""


class FeatureResult(BaseModel):
    """Computed result for a single feature against a customer segment."""
    feature_id: str
    feature_name: str
    chart_type: str
    chart_data: dict = Field(default_factory=dict)
    significance_score: float = 0.0
    raw_stats: dict = Field(default_factory=dict)
    llm_insight: str = ""
    is_top5: bool = False


class FeatureGroup(BaseModel):
    """A group of feature results (one report chapter section)."""
    group_id: str
    group_name: str
    features: list[FeatureResult] = []
    top5_features: list[FeatureResult] = []


class CorrelationRule(BaseModel):
    """A discovered association between features."""
    type: str                       # "enum_enum" | "enum_numeric"
    antecedent: str                 # "渠道偏好=手机银行"
    consequent: str                 # "产品类型=基金"
    support: float = 0.0            # P(A∩B)
    lift: float = 0.0               # P(B|A) / P(B)  (enum_enum only)
    confidence: float = 0.0         # P(B|A)  (enum_enum only)
    ratio: float = 0.0              # seg_mean / all_mean  (enum_numeric only)
    direction: str = ""             # "显著高于" | "显著低于"  (enum_numeric only)
    insight: str = ""               # pre-generated insight text
    llm_insight: str = ""           # LLM-generated insight


class ReportOverview(BaseModel):
    """Chapter 2: Customer segment basic overview."""
    total_count: int = 0
    gender_stats: dict = Field(default_factory=dict)
    age_histogram: dict = Field(default_factory=dict)
    region_stats: dict = Field(default_factory=dict)
    occupation_stats: dict = Field(default_factory=dict)
    education_stats: dict = Field(default_factory=dict)
    asset_level_stats: dict = Field(default_factory=dict)
    core_segment: str = ""


class ReportRecommendations(BaseModel):
    """Chapter 5: Marketing recommendations."""
    marketing_directions: list[str] = []
    priority_customers: str = ""
    cross_sell_opportunities: list[str] = []
    marketing_script: str = ""
    raw_text: str = ""


class ReportInstance(BaseModel):
    """Complete report instance."""
    id: str = ""
    theme_id: str = ""
    theme_name: str = ""
    generated_at: str = ""
    generated_by: str = ""
    data_date: str = ""
    customer_count: int = 0
    status: str = "generating"       # "generating" | "completed" | "failed" | "empty"
    message: str = ""

    overview: Optional[ReportOverview] = None
    feature_analysis: list[FeatureGroup] = []
    correlation_insights: list[CorrelationRule] = []
    recommendations: Optional[ReportRecommendations] = None

    export_word_url: Optional[str] = None
    export_pdf_url: Optional[str] = None
