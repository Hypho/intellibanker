"""Mock data for bank marketing demo."""
from __future__ import annotations

import random
from datetime import datetime, timedelta
from typing import List, Dict, Any


# ── 基础配置 ────────────────────────────────────────
BRANCHES = ["太原分行", "大同分行", "临汾分行", "运城分行", "长治分行"]
MANAGERS = [
    {"id": "M001", "name": "李娜", "branch": "太原分行"},
    {"id": "M002", "name": "王鹏", "branch": "太原分行"},
    {"id": "M003", "name": "张静", "branch": "大同分行"},
    {"id": "M004", "name": "刘洋", "branch": "临汾分行"},
    {"id": "M005", "name": "陈凯", "branch": "运城分行"},
]

OCCUPATIONS = ["企业主", "公司职员", "公务员", "个体工商户", "自由职业", "退休人员"]
INDUSTRIES = ["能源", "制造", "贸易", "科技", "建筑", "农业", "金融服务", "交通运输"]
RISK_PREFERENCES = ["保守型", "稳健型", "积极型"]
LIFECYCLES = ["新客户", "成熟期", "衰退期", "流失预警"]
ASSET_LEVELS = ["大众客户", "成长型客户", "中端客户", "高净值客户"]


def _rand_date(start_year: int = 2018, end_year: int = 2024) -> str:
    y = random.randint(start_year, end_year)
    m = random.randint(1, 12)
    d = random.randint(1, 28)
    return f"{y}-{m:02d}-{d:02d}"


def _rand_phone() -> str:
    prefix = random.choice(["138", "139", "186", "187", "135", "136"])
    return prefix + "****" + str(random.randint(1000, 9999))

_ENT_NAMES = [
    "山西华能煤业集团有限公司", "山西焦化能源股份有限公司", "山西钢铁联合股份有限公司",
    "山西电力股份有限公司", "山西建设投资集团有限公司", "山西交通投资集团有限公司",
    "山西航空股份有限公司", "山西文化旅游投资集团有限公司", "山西水利投资集团有限公司",
    "山西农业龙头企业集团", "山西矿业集团有限公司", "山西医药集团有限公司",
    "山西化工集团有限公司", "山西机械制造股份有限公司", "山西电子科技有限公司",
    "山西食品加工集团有限公司", "山西纺织集团有限公司", "山西物流股份有限公司",
    "山西新能源集团有限公司", "山西环保科技股份有限公司", "山西贸易集团有限公司",
    "山西投资集团有限公司", "山西天然气股份有限公司", "山西煤炭运销集团有限公司",
    "山西有色金属集团有限公司", "山西石化集团有限公司", "山西橡胶制品股份有限公司",
    "山西造纸实业有限公司", "山西燃气集团有限公司", "山西资本管理有限公司",
]

def _ENT_NAME(i: int) -> str:
    return _ENT_NAMES[(i - 1) % len(_ENT_NAMES)]


def _rand_amount(low: int, high: int) -> int:
    return random.randint(low, high)


# ── 个人客户 ─────────────────────────────────────────
def generate_personal_customers(n: int = 100) -> List[Dict[str, Any]]:
    customers = []
    for i in range(1, n + 1):
        cid = f"P{i:03d}"
        asset_level = random.choices(
            ASSET_LEVELS,
            weights=[50, 30, 15, 5],
            k=1,
        )[0]
        aum_map = {
            "大众客户": _rand_amount(5000, 50000),
            "成长型客户": _rand_amount(50000, 300000),
            "中端客户": _rand_amount(300000, 1000000),
            "高净值客户": _rand_amount(1000000, 8000000),
        }
        aum = aum_map[asset_level]
        manager = random.choice(MANAGERS)
        lifecycle = random.choices(
            LIFECYCLES, weights=[15, 50, 25, 10], k=1
        )[0]

        has_loan = random.random() < 0.3
        fund_hold = random.random() < 0.4
        insurance_hold = random.random() < 0.25

        products = []
        if True:
            products.append({"type": "活期存款", "balance": _rand_amount(10000, 100000)})
        if random.random() < 0.7:
            products.append(
                {"type": "定期存款", "balance": _rand_amount(20000, 300000)}
            )
        if asset_level in ("中端客户", "高净值客户") and random.random() < 0.5:
            products.append(
                {"type": "大额存单", "balance": _rand_amount(100000, 1000000)}
            )
        if fund_hold:
            products.append({"type": "基金", "balance": _rand_amount(10000, 200000)})
        if insurance_hold:
            products.append({"type": "保险", "balance": _rand_amount(5000, 100000)})

        product_expiring = None
        if random.random() < 0.25:
            days_left = random.randint(3, 30)
            exp_date = (
                datetime.now() + timedelta(days=days_left)
            ).strftime("%Y-%m-%d")
            product_expiring = {
                "product_type": random.choice(["定期存款", "理财产品", "大额存单"]),
                "balance": _rand_amount(20000, 300000),
                "expire_date": exp_date,
                "days_left": days_left,
            }

        churn_signal = lifecycle in ("衰退期", "流失预警") or random.random() < 0.1

        events = []
        if product_expiring:
            events.append(
                {
                    "type": "product_expiring",
                    "description": f"{product_expiring['product_type']} {product_expiring['balance']/10000:.0f}万将在 {product_expiring['days_left']} 天后到期",
                    "action": "推荐续存或转大额存单",
                    "priority": "high",
                }
            )
        if churn_signal:
            events.append(
                {
                    "type": "churn_risk",
                    "description": "近30天资产下降超过20%或登录频次骤降",
                    "action": "优先触达，了解原因并针对性关怀",
                    "priority": "high",
                }
            )
        if random.random() < 0.2:
            events.append(
                {
                    "type": "lifecycle_change",
                    "description": "客户生命周期从成长期转入成熟期",
                    "action": "推荐中收产品（基金/保险）",
                    "priority": "medium",
                }
            )
        if random.random() < 0.15:
            events.append(
                {
                    "type": "high_activity",
                    "description": "近7日频繁查看理财产品页面",
                    "action": "主动推送产品方案",
                    "priority": "medium",
                }
            )

        months_active = [
            random.randint(30, 100) for _ in range(6)
        ]  # 活跃度分
        monthly_flow = [
            _rand_amount(-50000, 200000) for _ in range(6)
        ]  # 每月净流入

        contact_history = []
        for _ in range(random.randint(1, 4)):
            contact_history.append(
                {
                    "date": _rand_date(2024, 2025),
                    "channel": random.choice(["企微", "短信", "电话", "网点"]),
                    "content": random.choice(
                        ["产品推荐", "生日问候", "到期提醒", "活动邀约", "需求调研"]
                    ),
                    "response": random.choice(
                        ["有意向", "无意向", "待考虑", "未响应"]
                    ),
                }
            )

        customers.append(
            {
                "id": cid,
                "basic_info": {
                    "name": f"客户{i}",
                    "phone": _rand_phone(),
                    "occupation": random.choice(OCCUPATIONS),
                    "branch": manager["branch"],
                    "manager_id": manager["id"],
                    "manager_name": manager["name"],
                    "account_open_date": _rand_date(2016, 2023),
                },
                "aum": aum,
                "asset_level": asset_level,
                "lifecycle": lifecycle,
                "products": products,
                "product_expiring": product_expiring,
                "events": events,
                "risk_preference": random.choice(RISK_PREFERENCES),
                "deposits": {
                    "current": _rand_amount(5000, 100000),
                    "term": _rand_amount(20000, 300000),
                    "large_certificate": (
                        _rand_amount(100000, 1000000)
                        if asset_level in ("中端客户", "高净值客户")
                        else 0
                    ),
                },
                "loans": {
                    "balance": (
                        _rand_amount(100000, 2000000)
                        if has_loan
                        else 0
                    ),
                    "type": random.choice(["消费贷", "经营贷", "按揭"])
                    if has_loan
                    else None,
                    "status": "正常" if has_loan else "无贷款",
                },
                "financial_behavior": {
                    "monthly_flow_trend": monthly_flow,
                    "activity_scores_6m": months_active,
                    "transfer_frequency": random.choice(
                        ["低", "中", "高"]
                    ),
                    "channel_preference": random.choice(
                        ["手机银行", "网上银行", "网点", "混合"]
                    ),
                    "app_login_days_30": random.randint(0, 30),
                },
                "tags": {
                    "asset_level": asset_level,
                    "lifecycle": lifecycle,
                    "risk_preference": random.choice(RISK_PREFERENCES),
                    "marketing_response": random.choice(
                        ["高响应", "中响应", "低响应", "未触达"]
                    ),
                    "churn_probability": round(
                        random.uniform(0.05, 0.85) if churn_signal else random.uniform(0.01, 0.2),
                        2,
                    ),
                },
                "risk_info": {
                    "credit_rating": random.choice(
                        ["优秀", "良好", "一般", "未知"]
                    ),
                    "overdue_records": "无"
                    if random.random() < 0.85
                    else "1次轻微逾期已结清",
                },
                "contact_history": contact_history,
            }
        )
    return customers


# ── 企业客户 ─────────────────────────────────────────
def generate_enterprise_customers(n: int = 30) -> List[Dict[str, Any]]:
    enterprises = []
    for i in range(1, n + 1):
        eid = f"E{i:03d}"
        industry = random.choice(INDUSTRIES)
        credit_limit = _rand_amount(500000, 20000000)
        credit_used = int(credit_limit * random.uniform(0.2, 0.8))
        deposit_balance = _rand_amount(100000, 5000000)
        has_payroll = random.random() < 0.6
        sentiment = random.choices(
            ["正面", "中性", "负面"], weights=[60, 30, 10], k=1
        )[0]

        events = []
        if random.random() < 0.2:
            events.append(
                {
                    "type": "sentiment_positive",
                    "description": f"企业近期中标政府项目，舆情正面",
                    "action": "可推进供应链金融或现金管理业务",
                    "priority": "high",
                }
            )
        if credit_used / credit_limit > 0.7:
            events.append(
                {
                    "type": "credit_high_usage",
                    "description": f"授信额度使用率超过70%",
                    "action": "关注还款风险，可适度增信",
                    "priority": "medium",
                }
            )
        if random.random() < 0.2:
            events.append(
                {
                    "type": "business_change",
                    "description": "工商信息变更（经营地址/注册资本变动）",
                    "action": "重新评估企业资质",
                    "priority": "high",
                }
            )

        covered = random.sample(
            ["流动资金贷款", "固定资产贷款", "票据", "保函", "代发工资", "企业理财"],
            k=random.randint(1, 3),
        )
        all_products = [
            "流动资金贷款",
            "固定资产贷款",
            "票据",
            "保函",
            "代发工资",
            "企业理财",
            "供应链金融",
            "现金管理",
            "国际结算",
        ]
        uncovered = [p for p in all_products if p not in covered]

        enterprise = {
            "id": eid,
            "basic_info": {
                "name": _ENT_NAME(i),
                "industry": industry,
                "registered_capital": _rand_amount(1000000, 100000000),
                "actual_controller": f"王总{i}",
                "group": f"某集团{chr(65+i%5)}"
                if random.random() < 0.4
                else None,
                "employee_count": _rand_amount(20, 2000),
                "established_date": _rand_date(2000, 2020),
            },
            "financial": {
                "credit_limit": credit_limit,
                "credit_used": credit_used,
                "credit_available": credit_limit - credit_used,
                "deposit_balance": deposit_balance,
                "other_bank_loans": (
                    f"约{_rand_amount(100, 5000)}万"
                    if random.random() < 0.7
                    else "他行无贷款"
                ),
                "annual_revenue": _rand_amount(5000000, 200000000),
            },
            "risk": {
                "credit_report": random.choice(["正常", "正常", "正常", "关注"]),
                "litigation_count": random.randint(0, 3),
                "litigation_amount": (
                    _rand_amount(10000, 500000)
                    if random.random() < 0.3
                    else 0
                ),
                "sentiment": sentiment,
            },
            "financial_behavior": {
                "settlement_activity": random.choice(
                    ["活跃", "一般", "不活跃"]
                ),
                "payroll_employees": (
                    _rand_amount(10, 500) if has_payroll else 0
                ),
                "annual_bill_amount": (
                    _rand_amount(100000, 5000000)
                    if random.random() < 0.5
                    else 0
                ),
                "cross_border": random.random() < 0.2,
            },
            "key_persons": [
                {
                    "name": f"王总{i}",
                    "role": "实际控制人",
                    "phone": _rand_phone(),
                },
                {
                    "name": f"财务负责人{i}",
                    "role": "财务负责人",
                    "phone": _rand_phone(),
                },
            ],
            "events": events,
            "covered_products": covered,
            "uncovered_products": uncovered,
            "suggestions": _build_suggestions(covered, uncovered, sentiment),
        }
        enterprises.append(enterprise)
    return enterprises


def _build_suggestions(covered: List[str], uncovered: List[str], sentiment: str) -> List[str]:
    suggestions = []
    if "供应链金融" in uncovered and sentiment == "正面":
        suggestions.append("推荐供应链金融产品，依托核心企业增信")
    if "现金管理" in uncovered:
        suggestions.append("推荐现金管理服务，提升企业资金收益率")
    if "代发工资" not in covered:
        suggestions.append("可拓展代发工资业务，稳定对公存款")
    if "企业理财" not in covered:
        suggestions.append("推荐企业理财产品，盘活闲置资金")
    if "票据" in uncovered:
        suggestions.append("推荐银行承兑汇票业务，降低融资成本")
    if not suggestions:
        suggestions.append("持续维护客户关系，关注业务合作机会")
    return suggestions


# ── 全局缓存 ─────────────────────────────────────────
_personal_cache: List[Dict[str, Any]] | None = None
_enterprise_cache: List[Dict[str, Any]] | None = None


def get_personal_customers() -> List[Dict[str, Any]]:
    global _personal_cache
    if _personal_cache is None:
        _personal_cache = generate_personal_customers(100)
    return _personal_cache


def get_enterprise_customers() -> List[Dict[str, Any]]:
    global _enterprise_cache
    if _enterprise_cache is None:
        _enterprise_cache = generate_enterprise_customers(30)
    return _enterprise_cache


def get_customer(type_: str, id_: str) -> Dict[str, Any] | None:
    if type_ == "personal":
        for c in get_personal_customers():
            if c["id"] == id_:
                return c
    elif type_ == "enterprise":
        for c in get_enterprise_customers():
            if c["id"] == id_:
                return c
    return None
