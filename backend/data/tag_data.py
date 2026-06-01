"""Predefined tag themes and features for customer segment reporting."""
from __future__ import annotations

from backend.models.tag_schema import (
    TagTheme, TagGroup, TagFeature, FilterGroup, FilterRule,
)

# ── Tag Feature Definitions ──────────────────────────────

ALL_FEATURES: dict[str, TagFeature] = {}
_FEATURE_DEFS: list[TagFeature] = []  # collected at module level, registered explicitly


def _f(feat: TagFeature) -> TagFeature:
    """Queue a feature for registration (deferred until register_features())."""
    _FEATURE_DEFS.append(feat)
    return feat


def register_features() -> None:
    """Register all queued features into ALL_FEATURES. Idempotent."""
    for feat in _FEATURE_DEFS:
        ALL_FEATURES[feat.id] = feat


# ── Asset features ───────────────────────────────────────

_f(TagFeature(
    id="avg_aum", name="平均AUM", description="客群平均管理资产规模",
    data_type="number", source_field="aum", aggregation="avg",
    chart_type="metric_card", chart_config={"unit": "万元", "format": "money"},
    business_hint="反映客群整体资产实力，是客户价值的核心指标",
    display_order=1,
))

_f(TagFeature(
    id="aum_distribution", name="AUM区间分布", description="客群AUM的区间分布",
    data_type="number", source_field="aum", aggregation="distribution",
    chart_type="histogram",
    chart_config={"bins": [0, 100000, 300000, 1000000, 3000000, 999999999],
                  "bin_labels": ["10万以下", "10-30万", "30-100万", "100-300万", "300万以上"]},
    business_hint="识别客群资产分布是否集中或分散",
    display_order=2,
))

_f(TagFeature(
    id="aum_mom_change", name="AUM环比变化", description="最近一个月AUM环比变化率",
    data_type="number", source_field="aum_history", aggregation="mom_change",
    chart_type="metric_card", chart_config={"unit": "%", "format": "percent"},
    business_hint="资产环比变化反映近期客户资金流向，正值为净流入",
    display_order=3,
))

_f(TagFeature(
    id="aum_yoy_change", name="AUM同比变化", description="最近一个月AUM同比变化率",
    data_type="number", source_field="aum_history", aggregation="yoy_change",
    chart_type="metric_card", chart_config={"unit": "%", "format": "percent"},
    business_hint="资产同比变化反映长期趋势，持续为负需关注",
    display_order=4,
))

_f(TagFeature(
    id="aum_trend", name="AUM趋势", description="近6个月AUM变化趋势",
    data_type="number", source_field="aum_history", aggregation="trend",
    chart_type="line", chart_config={"x_field": "month", "period": "monthly"},
    business_hint="趋势图直观展示资产变化方向，平稳上升为健康信号",
    display_order=5,
))

# ── Demographic features ─────────────────────────────────

_f(TagFeature(
    id="gender_ratio", name="男女比例", description="客群性别构成",
    data_type="enum", source_field="gender", aggregation="enum_count",
    chart_type="pie", chart_config={"top_n": 5},
    business_hint="性别分布影响产品推荐策略，如女性更偏好保险理财",
    display_order=1,
))

_f(TagFeature(
    id="age_distribution", name="年龄分布", description="客群年龄区间分布",
    data_type="number", source_field="birth_date", aggregation="age_distribution",
    chart_type="histogram",
    chart_config={"bins": [0, 25, 35, 45, 55, 65, 100],
                  "bin_labels": ["25岁以下", "25-35岁", "35-45岁", "45-55岁", "55-65岁", "65岁以上"]},
    business_hint="年龄结构决定风险偏好和产品适配性",
    display_order=2,
))

_f(TagFeature(
    id="education_distribution", name="学历分布", description="客群学历构成",
    data_type="enum", source_field="education", aggregation="enum_count",
    chart_type="pie", chart_config={"top_n": 5},
    business_hint="高学历客群更接受线上渠道和复杂金融产品",
    display_order=3,
))

_f(TagFeature(
    id="marital_distribution", name="婚姻状况", description="客群婚姻状况构成",
    data_type="enum", source_field="marital_status", aggregation="enum_count",
    chart_type="pie", chart_config={"top_n": 5},
    business_hint="已婚客群家庭金融需求更丰富，保险和教育金需求上升",
    display_order=4,
))

_f(TagFeature(
    id="region_distribution", name="地域分布", description="客群省份分布",
    data_type="enum", source_field="province", aggregation="enum_count",
    chart_type="bar", chart_config={"sort": "desc", "limit": 10},
    business_hint="地域集中度影响线下活动和社区营销的选址",
    display_order=5,
))

_f(TagFeature(
    id="occupation_distribution", name="职业分布", description="客群职业构成",
    data_type="enum", source_field="basic_info.occupation", aggregation="enum_count",
    chart_type="pie", chart_config={"top_n": 5},
    business_hint="职业结构影响收入稳定性和产品需求",
    display_order=6,
))

_f(TagFeature(
    id="asset_level_ratio", name="资产等级占比", description="客群资产等级构成",
    data_type="enum", source_field="asset_level", aggregation="enum_count",
    chart_type="pie", chart_config={"top_n": 5},
    business_hint="资产等级是客户分层经营的基础维度",
    display_order=7,
))

# ── Product features ─────────────────────────────────────

_f(TagFeature(
    id="product_count", name="平均持有产品数", description="客群平均持有产品种类数",
    data_type="number", source_field="products", aggregation="avg_len",
    chart_type="metric_card", chart_config={"unit": "个", "format": "int"},
    business_hint="产品覆盖度反映客户粘性，交叉销售的核心指标",
    display_order=1,
))

_f(TagFeature(
    id="product_type_distribution", name="产品类型持有率", description="各产品类型的持有情况",
    data_type="enum", source_field="products[].type", aggregation="enum_count",
    chart_type="bar", chart_config={"sort": "desc", "limit": 10},
    business_hint="识别产品渗透率缺口，指导交叉销售方向",
    display_order=2,
))

_f(TagFeature(
    id="deposit_ratio", name="存款结构占比", description="存款占AUM的比例",
    data_type="number", source_field="deposits", aggregation="deposit_ratio",
    chart_type="metric_card", chart_config={"unit": "%", "format": "percent"},
    business_hint="存款占比高说明客户偏保守，可推荐大额存单或结构性存款",
    display_order=3,
))

_f(TagFeature(
    id="loan_ratio", name="贷款覆盖率", description="持有贷款的客户占比",
    data_type="number", source_field="loans.balance", aggregation="coverage_ratio",
    chart_type="metric_card", chart_config={"unit": "%", "format": "percent"},
    business_hint="贷款覆盖率低说明有信贷拓展空间",
    display_order=4,
))

# ── Behavior features ────────────────────────────────────

_f(TagFeature(
    id="transaction_frequency", name="月均交易笔数", description="客群月均交易笔数",
    data_type="number", source_field="monthly_transaction_count", aggregation="avg",
    chart_type="metric_card", chart_config={"unit": "笔", "format": "int"},
    business_hint="交易频率反映客户活跃度，低频客户需激活",
    display_order=1,
))

_f(TagFeature(
    id="channel_preference", name="渠道偏好", description="客户主要交易渠道",
    data_type="enum", source_field="financial_behavior.channel_preference", aggregation="enum_count",
    chart_type="pie", chart_config={"top_n": 5},
    business_hint="渠道偏好决定触达方式，手机银行用户可推送线上活动",
    display_order=2,
))

_f(TagFeature(
    id="app_activity", name="手机银行活跃度", description="近30天手机银行登录天数",
    data_type="number", source_field="financial_behavior.app_login_days_30", aggregation="avg",
    chart_type="metric_card", chart_config={"unit": "天", "format": "int"},
    business_hint="App活跃度是数字化经营的基础指标",
    display_order=3,
))

_f(TagFeature(
    id="salary_amount", name="代发工资金额", description="月均代发工资金额",
    data_type="number", source_field="monthly_salary", aggregation="avg",
    chart_type="metric_card", chart_config={"unit": "元", "format": "money"},
    business_hint="代发工资是稳定负债来源，金额越高客户粘性越强",
    display_order=4,
))

# ── Community features ───────────────────────────────────

_f(TagFeature(
    id="community_distribution", name="社区分布", description="客群所属社区",
    data_type="enum", source_field="community", aggregation="enum_count",
    chart_type="bar", chart_config={"sort": "desc", "limit": 10},
    business_hint="社区分布指导线下社区营销活动的选址和资源配置",
    display_order=1,
))

_f(TagFeature(
    id="business_district", name="商圈分布", description="客群所属商圈",
    data_type="enum", source_field="business_district", aggregation="enum_count",
    chart_type="bar", chart_config={"sort": "desc", "limit": 10},
    business_hint="商圈分布决定商户合作和场景金融的拓展方向",
    display_order=2,
))

# ── Risk features ────────────────────────────────────────

_f(TagFeature(
    id="churn_probability", name="平均流失概率", description="客群平均流失概率",
    data_type="number", source_field="tags.churn_probability", aggregation="avg",
    chart_type="metric_card", chart_config={"unit": "%", "format": "percent"},
    business_hint="流失概率高于30%的客群需立即启动挽留策略",
    display_order=1,
    is_top5_candidate=False,  # 高危主题自身用，不参与 Top5
))

_f(TagFeature(
    id="lifecycle_distribution", name="生命周期分布", description="客群生命周期阶段构成",
    data_type="enum", source_field="lifecycle", aggregation="enum_count",
    chart_type="pie", chart_config={"top_n": 5},
    business_hint="生命周期分布反映客群健康度，衰退期占比过高需预警",
    display_order=2,
))

_f(TagFeature(
    id="event_count", name="平均触发事件数", description="客群人均触发事件数",
    data_type="number", source_field="events", aggregation="avg_len",
    chart_type="metric_card", chart_config={"unit": "个", "format": "int"},
    business_hint="事件数多说明客户有较多营销触点机会",
    display_order=3,
))

# ── Extended features ────────────────────────────────────

_f(TagFeature(
    id="household_size_distribution", name="家庭规模分布", description="客群家庭人口数分布",
    data_type="enum", source_field="household_size", aggregation="enum_count",
    chart_type="pie", chart_config={"top_n": 6},
    business_hint="家庭规模影响保险需求和教育金规划，大家庭更需要家庭保障方案",
    display_order=1,
    is_top5_candidate=False,
))

_f(TagFeature(
    id="salary_level_distribution", name="代发工资水平分布", description="代发工资客户的薪资区间分布",
    data_type="number", source_field="monthly_salary", aggregation="distribution",
    chart_type="histogram",
    chart_config={"bins": [0, 3000, 5000, 8000, 15000, 30000, 999999],
                  "bin_labels": ["3千以下", "3-5千", "5-8千", "8千-1.5万", "1.5-3万", "3万以上"]},
    business_hint="工资水平决定消费能力和理财需求层级",
    display_order=2,
    is_top5_candidate=False,
))

_f(TagFeature(
    id="loan_type_distribution", name="贷款类型分布", description="有贷客户的贷款产品类型分布",
    data_type="enum", source_field="loans.type", aggregation="enum_count",
    chart_type="pie", chart_config={"top_n": 5},
    business_hint="贷款类型反映客户资金需求特征，按揭客户有长期维护价值",
    display_order=1,
    is_top5_candidate=False,
))

_f(TagFeature(
    id="contact_response_distribution", name="触达响应分布", description="客户触达响应情况分布",
    data_type="enum", source_field="contact_history.response", aggregation="enum_count",
    chart_type="pie", chart_config={"top_n": 5},
    business_hint="触达响应率衡量营销有效性，低响应客户需调整触达策略",
    display_order=1,
    is_top5_candidate=False,
))

_f(TagFeature(
    id="last_transaction_recency", name="最近交易距今", description="客户最近交易距今天数分布",
    data_type="number", source_field="last_transaction_days", aggregation="avg",
    chart_type="metric_card", chart_config={"unit": "天", "format": "int"},
    business_hint="交易距今越久说明客户活跃度越低，超过30天需激活",
    display_order=2,
    is_top5_candidate=False,
))

_f(TagFeature(
    id="large_transaction_ratio", name="大额交易占比", description="大额交易（>5万）占总交易的比例",
    data_type="number", source_field="large_transaction_ratio", aggregation="avg",
    chart_type="metric_card", chart_config={"unit": "%", "format": "percent"},
    business_hint="大额交易占比高的客户资金实力强，适合推荐高端理财",
    display_order=3,
    is_top5_candidate=False,
))

# ── Enterprise-specific features ─────────────────────────

_f(TagFeature(
    id="ent_industry_distribution", name="行业分布", description="企业客户的行业构成",
    data_type="enum", source_field="basic_info.industry", aggregation="enum_count",
    chart_type="pie", chart_config={"top_n": 8},
    business_hint="行业分布决定信贷政策方向和风险集中度",
    display_order=1,
))

_f(TagFeature(
    id="ent_credit_utilization", name="平均授信使用", description="企业客户平均授信使用额度",
    data_type="number", source_field="financial.credit_used", aggregation="avg",
    chart_type="metric_card", chart_config={"unit": "万元", "format": "money"},
    business_hint="授信使用额度反映企业资金需求强度，高使用率需关注还款风险",
    display_order=2,
))

_f(TagFeature(
    id="ent_sentiment_distribution", name="舆情分布", description="企业客户舆情情感分布",
    data_type="enum", source_field="risk.sentiment", aggregation="enum_count",
    chart_type="pie", chart_config={"top_n": 3},
    business_hint="舆情负面的企业需加强风险监控，正面企业可拓展合作",
    display_order=3,
))

_f(TagFeature(
    id="ent_employee_scale", name="员工规模分布", description="企业客户员工规模区间分布",
    data_type="number", source_field="basic_info.employee_count", aggregation="distribution",
    chart_type="histogram",
    chart_config={"bins": [0, 50, 200, 500, 1000, 9999],
                  "bin_labels": ["50人以下", "50-200人", "200-500人", "500-1000人", "1000人以上"]},
    business_hint="员工规模影响代发工资和对公结算业务潜力",
    display_order=4,
))

_f(TagFeature(
    id="ent_annual_revenue", name="年营收分布", description="企业客户年营收区间分布",
    data_type="number", source_field="financial.annual_revenue", aggregation="distribution",
    chart_type="histogram",
    chart_config={"bins": [0, 10000000, 50000000, 100000000, 500000000, 9999999999],
                  "bin_labels": ["1千万以下", "1-5千万", "5千万-1亿", "1-5亿", "5亿以上"]},
    business_hint="年营收规模决定企业客户价值层级和产品适配性",
    display_order=5,
))

_f(TagFeature(
    id="ent_product_coverage", name="产品覆盖度", description="企业客户平均持有产品数",
    data_type="number", source_field="covered_products", aggregation="avg_len",
    chart_type="metric_card", chart_config={"unit": "个", "format": "int"},
    business_hint="产品覆盖度越高客户粘性越强，低于2个有交叉销售空间",
    display_order=6,
))

_f(TagFeature(
    id="ent_deposit_balance", name="平均存款沉淀", description="企业客户平均存款余额",
    data_type="number", source_field="financial.deposit_balance", aggregation="avg",
    chart_type="metric_card", chart_config={"unit": "万元", "format": "money"},
    business_hint="存款沉淀是对公负债业务的核心指标，高沉淀企业是优质客户",
    display_order=7,
))


# ── Predefined Tag Themes ────────────────────────────────

THEMES: list[TagTheme] = [
    TagTheme(
        id="high_net_worth",
        name="高净值客户",
        description="AUM 100万以上的个人客户",
        customer_type="personal",
        filter_group=FilterGroup(logic="AND", rules=[
            FilterRule(field="aum", operator=">=", value=1000000),
        ]),
        tag_groups=[
            TagGroup(id="asset", name="资产实力分析",
                     description="分析客群的资产规模、结构和变化趋势",
                     feature_ids=["avg_aum", "aum_distribution", "aum_mom_change",
                                  "aum_yoy_change", "aum_trend", "deposit_ratio", "loan_ratio"]),
            TagGroup(id="demographic", name="客群基础特征",
                     description="分析客群的人口统计学特征",
                     feature_ids=["gender_ratio", "age_distribution", "education_distribution",
                                  "marital_distribution", "region_distribution",
                                  "occupation_distribution", "asset_level_ratio"]),
            TagGroup(id="product", name="产品持有分析",
                     description="分析客群的产品覆盖和持仓结构",
                     feature_ids=["product_count", "product_type_distribution"]),
            TagGroup(id="behavior", name="行为偏好分析",
                     description="分析客群的交易行为和渠道偏好",
                     feature_ids=["transaction_frequency", "channel_preference", "app_activity"]),
            TagGroup(id="community", name="社区场景分析",
                     description="分析客群的社区和商圈分布",
                     feature_ids=["community_distribution", "business_district"]),
        ],
    ),

    TagTheme(
        id="salary_customer",
        name="代发工资客户",
        description="开通代发工资业务的个人客户",
        customer_type="personal",
        filter_group=FilterGroup(logic="AND", rules=[
            FilterRule(field="salary_account", operator="==", value=True),
        ]),
        tag_groups=[
            TagGroup(id="income", name="收入特征分析",
                     description="分析代发工资客户的收入水平和稳定性",
                     feature_ids=["salary_amount", "aum_distribution", "deposit_ratio"]),
            TagGroup(id="demographic", name="客群基础特征",
                     description="分析客群的人口统计学特征",
                     feature_ids=["gender_ratio", "age_distribution", "occupation_distribution",
                                  "region_distribution"]),
            TagGroup(id="product", name="产品持有分析",
                     description="分析代发客户的产品覆盖情况",
                     feature_ids=["product_count", "product_type_distribution", "loan_ratio"]),
            TagGroup(id="behavior", name="活跃度分析",
                     description="分析代发客户的交易和渠道行为",
                     feature_ids=["transaction_frequency", "channel_preference", "app_activity"]),
        ],
    ),

    TagTheme(
        id="churn_risk",
        name="流失预警客户",
        description="处于衰退期或流失预警阶段的个人客户",
        customer_type="personal",
        filter_group=FilterGroup(logic="OR", rules=[
            FilterRule(field="lifecycle", operator="==", value="衰退期"),
            FilterRule(field="lifecycle", operator="==", value="流失预警"),
        ]),
        tag_groups=[
            TagGroup(id="asset", name="资产变化分析",
                     description="分析流失风险客户的资产变化趋势",
                     feature_ids=["avg_aum", "aum_mom_change", "aum_yoy_change",
                                  "aum_trend", "deposit_ratio"]),
            TagGroup(id="risk", name="风险特征分析",
                     description="分析流失风险客户的风险指标",
                     feature_ids=["churn_probability", "lifecycle_distribution", "event_count"]),
            TagGroup(id="demographic", name="客群基础特征",
                     description="分析流失客群的人口统计学特征",
                     feature_ids=["gender_ratio", "age_distribution", "asset_level_ratio",
                                  "region_distribution"]),
            TagGroup(id="behavior", name="行为衰减分析",
                     description="分析流失客群的行为活跃度下降情况",
                     feature_ids=["transaction_frequency", "channel_preference", "app_activity"]),
            TagGroup(id="contact", name="触达历史",
                     description="分析流失客群的社区和产品覆盖",
                     feature_ids=["community_distribution", "product_count"]),
        ],
    ),

    # ── 新增：年轻客群 ──
    TagTheme(
        id="young_customers",
        name="年轻客群",
        description="35岁以下的年轻个人客户",
        customer_type="personal",
        filter_group=FilterGroup(logic="AND", rules=[
            FilterRule(field="birth_date", operator=">=", value="1991-01-01"),
        ]),
        tag_groups=[
            TagGroup(id="demographic", name="基础画像",
                     description="分析年轻客群的人口统计特征",
                     feature_ids=["gender_ratio", "age_distribution", "education_distribution",
                                  "marital_distribution", "household_size_distribution"]),
            TagGroup(id="asset", name="资产特征",
                     description="分析年轻客群的资产规模和结构",
                     feature_ids=["avg_aum", "aum_distribution", "deposit_ratio",
                                  "aum_mom_change", "aum_trend"]),
            TagGroup(id="behavior", name="行为偏好",
                     description="分析年轻客群的交易和渠道行为",
                     feature_ids=["transaction_frequency", "channel_preference",
                                  "app_activity", "large_transaction_ratio"]),
            TagGroup(id="product", name="产品与社区",
                     description="分析年轻客群的产品持有和社区分布",
                     feature_ids=["product_count", "product_type_distribution",
                                  "community_distribution", "business_district"]),
        ],
    ),

    # ── 新增：代发工资客群（增强版）──
    TagTheme(
        id="salary_customer",
        name="代发工资客户",
        description="开通代发工资业务的个人客户",
        customer_type="personal",
        filter_group=FilterGroup(logic="AND", rules=[
            FilterRule(field="salary_account", operator="==", value=True),
        ]),
        tag_groups=[
            TagGroup(id="income", name="收入特征分析",
                     description="分析代发工资客户的收入水平和稳定性",
                     feature_ids=["salary_amount", "salary_level_distribution",
                                  "aum_distribution", "deposit_ratio"]),
            TagGroup(id="demographic", name="客群基础特征",
                     description="分析客群的人口统计学特征",
                     feature_ids=["gender_ratio", "age_distribution", "occupation_distribution",
                                  "region_distribution", "household_size_distribution"]),
            TagGroup(id="product", name="产品持有分析",
                     description="分析代发客户的产品覆盖情况",
                     feature_ids=["product_count", "product_type_distribution",
                                  "loan_ratio", "loan_type_distribution"]),
            TagGroup(id="behavior", name="活跃度分析",
                     description="分析代发客户的交易和渠道行为",
                     feature_ids=["transaction_frequency", "channel_preference",
                                  "app_activity", "last_transaction_recency"]),
            TagGroup(id="community", name="社区场景",
                     description="分析代发客户的社区和商圈分布",
                     feature_ids=["community_distribution", "business_district"]),
        ],
    ),

    # ── 新增：流失预警客群（增强版）──
    TagTheme(
        id="churn_risk",
        name="流失预警客户",
        description="处于衰退期或流失预警阶段的个人客户",
        customer_type="personal",
        filter_group=FilterGroup(logic="OR", rules=[
            FilterRule(field="lifecycle", operator="==", value="衰退期"),
            FilterRule(field="lifecycle", operator="==", value="流失预警"),
        ]),
        tag_groups=[
            TagGroup(id="asset", name="资产变化分析",
                     description="分析流失风险客户的资产变化趋势",
                     feature_ids=["avg_aum", "aum_mom_change", "aum_yoy_change",
                                  "aum_trend", "deposit_ratio"]),
            TagGroup(id="risk", name="风险特征分析",
                     description="分析流失风险客户的风险指标",
                     feature_ids=["churn_probability", "lifecycle_distribution",
                                  "event_count", "last_transaction_recency"]),
            TagGroup(id="demographic", name="客群基础特征",
                     description="分析流失客群的人口统计学特征",
                     feature_ids=["gender_ratio", "age_distribution", "asset_level_ratio",
                                  "region_distribution", "occupation_distribution"]),
            TagGroup(id="behavior", name="行为衰减分析",
                     description="分析流失客群的行为活跃度下降情况",
                     feature_ids=["transaction_frequency", "channel_preference",
                                  "app_activity", "large_transaction_ratio"]),
            TagGroup(id="contact", name="触达与社区",
                     description="分析流失客群的触达响应和社区覆盖",
                     feature_ids=["contact_response_distribution", "community_distribution",
                                  "product_count"]),
        ],
    ),

    # ── 新增：大中型企业客户 ──
    TagTheme(
        id="large_enterprise",
        name="大中型企业客户",
        description="员工200人以上或年营收5000万以上的企业客户",
        customer_type="enterprise",
        filter_group=FilterGroup(logic="OR", rules=[
            FilterRule(field="basic_info.employee_count", operator=">=", value=200),
            FilterRule(field="financial.annual_revenue", operator=">=", value=50000000),
        ]),
        tag_groups=[
            TagGroup(id="overview", name="企业规模概览",
                     description="分析大中型企业的规模和行业分布",
                     feature_ids=["ent_industry_distribution", "ent_employee_scale",
                                  "ent_annual_revenue"]),
            TagGroup(id="financial", name="金融业务分析",
                     description="分析企业的授信使用和产品覆盖",
                     feature_ids=["ent_credit_utilization", "ent_product_coverage",
                                  "ent_deposit_balance"]),
            TagGroup(id="risk", name="风险与舆情",
                     description="分析企业的风险状况和舆情",
                     feature_ids=["ent_sentiment_distribution", "churn_probability",
                                  "event_count"]),
            TagGroup(id="behavior", name="业务行为",
                     description="分析企业的交易和渠道行为",
                     feature_ids=["transaction_frequency", "channel_preference",
                                  "app_activity"]),
        ],
    ),

    # ── 新增：制造业企业客户 ──
    TagTheme(
        id="manufacturing_enterprise",
        name="制造业企业客户",
        description="所属行业为制造业的企业客户",
        customer_type="enterprise",
        filter_group=FilterGroup(logic="AND", rules=[
            FilterRule(field="basic_info.industry", operator="==", value="制造"),
        ]),
        tag_groups=[
            TagGroup(id="overview", name="企业规模概览",
                     description="分析制造业企业的规模和结构",
                     feature_ids=["ent_industry_distribution", "ent_employee_scale",
                                  "ent_annual_revenue"]),
            TagGroup(id="financial", name="金融需求分析",
                     description="分析制造业企业的金融业务需求",
                     feature_ids=["ent_credit_utilization", "ent_product_coverage",
                                  "ent_deposit_balance"]),
            TagGroup(id="risk", name="风险评估",
                     description="分析制造业企业的风险和舆情",
                     feature_ids=["ent_sentiment_distribution", "churn_probability"]),
        ],
    ),
]


def get_all_features() -> dict[str, TagFeature]:
    """Return all registered feature definitions."""
    return ALL_FEATURES.copy()


def get_feature_by_id(feature_id: str) -> TagFeature | None:
    """Look up a feature by ID."""
    return ALL_FEATURES.get(feature_id)


def get_all_themes() -> list[TagTheme]:
    """Return all predefined themes."""
    return THEMES.copy()


def get_theme_by_id(theme_id: str) -> TagTheme | None:
    """Look up a theme by ID."""
    return next((t for t in THEMES if t.id == theme_id), None)


# Auto-register on import (backward compat). Can also be called explicitly at startup.
register_features()
