"""Mock data for bank marketing demo."""
from __future__ import annotations

import random
from datetime import datetime, timedelta
from typing import List, Dict, Any


# ── 基础配置 ────────────────────────────────────────
BRANCHES = ["东城支行", "西城支行", "南城支行", "北城支行", "开发区支行"]
MANAGERS = [
    {"id": "M001", "name": "李娜", "branch": "东城支行"},
    {"id": "M002", "name": "王鹏", "branch": "东城支行"},
    {"id": "M003", "name": "张静", "branch": "西城支行"},
    {"id": "M004", "name": "刘洋", "branch": "南城支行"},
    {"id": "M005", "name": "陈凯", "branch": "北城支行"},
    {"id": "M006", "name": "赵峰", "branch": "开发区支行"},
]

OCCUPATIONS = ["企业主", "公司职员", "公务员", "个体工商户", "自由职业", "退休人员"]
INDUSTRIES = ["能源", "制造", "贸易", "科技", "建筑", "农业", "金融服务", "交通运输"]
RISK_PREFERENCES = ["保守型", "稳健型", "积极型"]
LIFECYCLES = ["新客户", "成熟期", "衰退期", "流失预警"]
ASSET_LEVELS = ["大众客户", "成长型客户", "中端客户", "高净值客户"]

# ── 真实姓名库 ──────────────────────────────────────
PERSONAL_NAMES = [
    "张伟", "王芳", "李强", "赵敏", "刘洋", "陈静", "杨军", "黄丽",
    "周磊", "吴秀英", "徐建国", "孙丽华", "马志远", "朱红梅", "胡建华",
    "郭文杰", "何晓燕", "林志强", "罗雅琴", "梁永康", "宋丽萍", "唐建军",
    "韩雪梅", "冯国庆", "董文静", "程浩然", "曹慧敏", "袁志刚", "邓丽君",
    "许建明", "傅晓峰", "沈春华", "曾祥瑞", "彭雅芬", "吕志豪", "苏秀兰",
    "卢文博", "蒋丽娟", "蔡建华", "贾晓红", "丁志远", "魏文静", "薛永康",
    "叶丽萍", "阎建国", "余红梅", "潘浩然", "杜慧敏", "戴志刚", "夏丽君",
    "钟建明", "汪晓峰", "田春华", "任祥瑞", "范雅芬", "石志豪", "廖秀兰",
    "姚文博", "谭丽娟", "邹建华", "熊晓红", "金志远", "陆文静", "郝永康",
    "孔丽萍", "白建国", "崔红梅", "秦浩然", "江慧敏", "史志刚", "顾丽君",
    "侯建明", "龙晓峰", "万春华", "段祥瑞", "雷雅芬", "钱志豪", "汤秀兰",
    "尹文博", "黎丽娟", "易建华", "常晓红", "武志远", "乔文静", "贺永康",
    "赖丽萍", "龚建国", "文红梅", "庞浩然", "纪慧敏", "羊志刚", "那丽君",
    "瞿建明", "全晓峰", "褚春华", "池祥瑞", "桑雅芬", "桂志豪", "牛秀兰",
    "温文博", "庄丽娟", "柴建华", "祝晓红", "查志远", "单文静", "柯永康",
    "房丽萍", "戚建国", "解红梅", "强浩然", "苗慧敏", "凌志刚", "毕丽君",
    "诸建明", "郎晓峰", "屈春华", "路祥瑞", "童雅芬", "颜志豪",
]

CONTROLLER_NAMES = [
    "陈志远", "林雅琴", "张建华", "李国强", "王丽萍", "刘文博", "赵晓红",
    "孙浩然", "杨慧敏", "周志刚", "吴丽君", "徐建明", "马晓峰", "朱春华",
    "胡祥瑞", "郭雅芬", "何志豪", "罗秀兰", "梁文博", "宋丽娟", "唐建华",
    "韩晓红", "冯志远", "董文静", "程永康", "曹丽萍", "袁建国", "邓红梅",
    "许浩然", "傅慧敏",
]

FINANCE_NAMES = [
    "郑雪梅", "谢明辉", "潘玉兰", "杜建国", "戴晓华", "夏文杰", "钟丽芳",
    "田志勇", "任雅婷", "范永刚", "石秀珍", "廖建平", "姚红霞", "谭国栋",
    "邹丽丽", "熊文强", "金晓燕", "陆志华", "郝玉梅", "孔建国", "白晓红",
    "崔文博", "秦丽萍", "江永康", "史慧芳", "顾志刚", "侯丽君", "龙建明",
    "万晓峰", "段春华",
]


_ENT_NAMES = [
    "华信能源集团有限公司", "中联化工股份有限公司", "国盛钢铁联合股份有限公司",
    "恒达电力股份有限公司", "中建华通投资集团有限公司", "远东交通投资集团有限公司",
    "天翔航空股份有限公司", "锦程文化旅游投资集团有限公司", "汇通水利投资集团有限公司",
    "嘉禾农业龙头企业集团", "宏远矿业集团有限公司", "康瑞医药集团有限公司",
    "东升化工集团有限公司", "精工机械制造股份有限公司", "博创电子科技有限公司",
    "汇源食品加工集团有限公司", "锦绣纺织集团有限公司", "迅捷物流股份有限公司",
    "绿能新能源集团有限公司", "清源环保科技股份有限公司", "通达贸易集团有限公司",
    "金桥投资集团有限公司", "华通天然气股份有限公司", "永泰能源运销集团有限公司",
    "鑫达有色金属集团有限公司", "恒基石化集团有限公司", "中橡橡胶制品股份有限公司",
    "永丰造纸实业有限公司", "华润燃气集团有限公司", "鼎信资本管理有限公司",
]


def _rand_date(start_year: int = 2018, end_year: int = 2024) -> str:
    y = random.randint(start_year, end_year)
    m = random.randint(1, 12)
    d = random.randint(1, 28)
    return f"{y}-{m:02d}-{d:02d}"


def _rand_phone() -> str:
    prefix = random.choice(["138", "139", "186", "187", "135", "136"])
    return prefix + "****" + str(random.randint(1000, 9999))


def _ENT_NAME(i: int) -> str:
    return _ENT_NAMES[(i - 1) % len(_ENT_NAMES)]


def _rand_amount(low: int, high: int) -> int:
    return random.randint(low, high)


# ── 个人客户 ─────────────────────────────────────────
def generate_personal_customers(n: int = 100) -> List[Dict[str, Any]]:
    random.seed(42)
    # 打乱姓名列表，确保相邻 ID 不是相邻姓名
    names_shuffled = PERSONAL_NAMES.copy()
    random.shuffle(names_shuffled)

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
        risk_pref = random.choice(RISK_PREFERENCES)

        # ── 生成 products，后续 deposits 从中提取 ──
        products = []
        products.append({"type": "活期存款", "balance": _rand_amount(10000, 100000)})
        if random.random() < 0.7:
            products.append({"type": "定期存款", "balance": _rand_amount(20000, 300000)})
        if asset_level in ("中端客户", "高净值客户") and random.random() < 0.5:
            products.append({"type": "大额存单", "balance": _rand_amount(100000, 1000000)})
        if random.random() < 0.4:
            products.append({"type": "基金", "balance": _rand_amount(10000, 200000)})
        if random.random() < 0.25:
            products.append({"type": "保险", "balance": _rand_amount(5000, 100000)})

        # 从 products 提取存款余额，保证数据一致
        current_balance = next((p["balance"] for p in products if p["type"] == "活期存款"), 0)
        term_balance = next((p["balance"] for p in products if p["type"] == "定期存款"), 0)
        lcb_balance = next((p["balance"] for p in products if p["type"] == "大额存单"), 0)

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
            events.append({
                "type": "product_expiring",
                "description": f"{product_expiring['product_type']} {product_expiring['balance']/10000:.0f}万将在 {product_expiring['days_left']} 天后到期",
                "action": "推荐续存或转大额存单",
                "priority": "high",
            })
        if churn_signal:
            events.append({
                "type": "churn_risk",
                "description": "近30天资产下降超过20%或登录频次骤降",
                "action": "优先触达，了解原因并针对性关怀",
                "priority": "high",
            })
        if random.random() < 0.2:
            events.append({
                "type": "lifecycle_change",
                "description": "客户生命周期从成长期转入成熟期",
                "action": "推荐中收产品（基金/保险）",
                "priority": "medium",
            })
        if random.random() < 0.15:
            events.append({
                "type": "high_activity",
                "description": "近7日频繁查看理财产品页面",
                "action": "主动推送产品方案",
                "priority": "medium",
            })

        # 活跃度分（6个月）
        months_active = [random.randint(30, 100) for _ in range(6)]

        # 月度净流入（随机游走，平滑曲线）
        base_flow = _rand_amount(-20000, 50000)
        monthly_flow = []
        current = base_flow
        for _ in range(6):
            current += random.randint(-30000, 40000)
            monthly_flow.append(current)

        contact_history = []
        for _ in range(random.randint(1, 4)):
            contact_history.append({
                "date": _rand_date(2025, 2026),
                "channel": random.choice(["企微", "短信", "电话", "网点"]),
                "content": random.choice(["产品推荐", "生日问候", "到期提醒", "活动邀约", "需求调研"]),
                "response": random.choice(["有意向", "无意向", "待考虑", "未响应"]),
            })

        customers.append({
            "id": cid,
            "basic_info": {
                "name": names_shuffled[(i - 1) % len(names_shuffled)],
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
            "risk_preference": risk_pref,
            "deposits": {
                "current": current_balance,
                "term": term_balance,
                "large_certificate": lcb_balance,
            },
            "loans": {
                "balance": _rand_amount(100000, 2000000) if has_loan else 0,
                "type": random.choice(["消费贷", "经营贷", "按揭"]) if has_loan else None,
                "status": "正常" if has_loan else "无贷款",
            },
            "financial_behavior": {
                "monthly_flow_trend": monthly_flow,
                "activity_scores_6m": months_active,
                "transfer_frequency": random.choice(["低", "中", "高"]),
                "channel_preference": random.choice(["手机银行", "网上银行", "网点", "混合"]),
                "app_login_days_30": random.randint(0, 30),
            },
            "tags": {
                "lifecycle": lifecycle,
                "risk_preference": risk_pref,
                "marketing_response": random.choice(["高响应", "中响应", "低响应", "未触达"]),
                "churn_probability": round(
                    random.uniform(0.05, 0.85) if churn_signal else random.uniform(0.01, 0.2), 2,
                ),
            },
            "risk_info": {
                "credit_rating": random.choice(["优秀", "良好", "一般", "未知"]),
                "overdue_records": "无" if random.random() < 0.85 else "1次轻微逾期已结清",
            },
            "contact_history": contact_history,
        })
    return customers


# ── 企业客户 ─────────────────────────────────────────
def generate_enterprise_customers(n: int = 30) -> List[Dict[str, Any]]:
    random.seed(2026)
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
            events.append({
                "type": "sentiment_positive",
                "description": "企业近期中标政府项目，舆情正面",
                "action": "可推进供应链金融或现金管理业务",
                "priority": "high",
            })
        if credit_used / credit_limit > 0.7:
            events.append({
                "type": "credit_high_usage",
                "description": "授信额度使用率超过70%",
                "action": "关注还款风险，可适度增信",
                "priority": "medium",
            })
        if random.random() < 0.2:
            events.append({
                "type": "business_change",
                "description": "工商信息变更（经营地址/注册资本变动）",
                "action": "重新评估企业资质",
                "priority": "high",
            })

        covered = random.sample(
            ["流动资金贷款", "固定资产贷款", "票据", "保函", "代发工资", "企业理财"],
            k=random.randint(1, 3),
        )
        all_products = [
            "流动资金贷款", "固定资产贷款", "票据", "保函", "代发工资",
            "企业理财", "供应链金融", "现金管理", "国际结算",
        ]
        uncovered = [p for p in all_products if p not in covered]

        controller_name = CONTROLLER_NAMES[(i - 1) % len(CONTROLLER_NAMES)]
        finance_name = FINANCE_NAMES[(i - 1) % len(FINANCE_NAMES)]

        ent_manager = random.choice(MANAGERS)
        enterprise = {
            "id": eid,
            "basic_info": {
                "name": _ENT_NAME(i),
                "industry": industry,
                "branch": ent_manager["branch"],
                "registered_capital": _rand_amount(1000000, 100000000),
                "actual_controller": controller_name,
                "group": f"某集团{chr(65 + i % 5)}" if random.random() < 0.4 else None,
                "employee_count": _rand_amount(20, 2000),
                "established_date": _rand_date(2000, 2020),
            },
            "financial": {
                "credit_limit": credit_limit,
                "credit_used": credit_used,
                "credit_available": credit_limit - credit_used,
                "deposit_balance": deposit_balance,
                "other_bank_loans": _rand_amount(1000000, 50000000) if random.random() < 0.7 else 0,
                "annual_revenue": _rand_amount(5000000, 200000000),
            },
            "risk": {
                "credit_report": random.choice(["正常", "正常", "正常", "关注"]),
                "litigation_count": random.randint(0, 3),
                "litigation_amount": _rand_amount(10000, 500000) if random.random() < 0.3 else 0,
                "sentiment": sentiment,
            },
            "financial_behavior": {
                "settlement_activity": random.choice(["活跃", "一般", "不活跃"]),
                "payroll_employees": _rand_amount(10, 500) if has_payroll else 0,
                "annual_bill_amount": _rand_amount(100000, 5000000) if random.random() < 0.5 else 0,
                "cross_border": random.random() < 0.2,
            },
            "key_persons": [
                {
                    "name": controller_name,
                    "role": "实际控制人",
                    "phone": _rand_phone(),
                    "personal_id": f"P{random.randint(1, 100):03d}",
                },
                {
                    "name": finance_name,
                    "role": "财务负责人",
                    "phone": _rand_phone(),
                    "personal_id": f"P{random.randint(1, 100):03d}",
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
