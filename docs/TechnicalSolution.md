# 银行智能营销平台 技术实施方案

**版本**：V1.0
**日期**：2025年5月18日
**状态**：待确认

---

## 一、技术架构

### 1.1 整体架构

```
┌─────────────────────────────────────────────────┐
│                    前端                          │
│         React + Arco Design + ECharts            │
│              访问 http://localhost:3000           │
└────────────────────┬────────────────────────────┘
                     │  HTTP REST API
┌────────────────────▼────────────────────────────┐
│                    后端                          │
│              FastAPI (Python)                   │
│         访问 http://localhost:8000               │
│                                                   │
│   /api/insight     客户洞察报告                   │
│   /api/profile     客户画像查询                   │
│   /api/workflow    拜访流程自动化                  │
└────────────────────┬────────────────────────────┘
                     │  httpx (OpenAI 兼容协议)
┌────────────────────▼────────────────────────────┐
│                  模型层                          │
│          DeepSeek API (OpenAI 协议)             │
└─────────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│                  数据层                          │
│            mock_data.py (Demo 数据)              │
└─────────────────────────────────────────────────┘
```

### 1.2 技术栈

| 层级 | 技术选型 | 说明 |
|---|---|---|
| 前端框架 | React 18 + Vite | 现代构建工具，热更新快 |
| UI 组件库 | @arco-design/web-react | ByteDance 企业级组件库，金融风格 |
| 图表库 | ECharts + @echarts-for-react | 金融数据可视化标准配置 |
| 后端框架 | FastAPI | ASGI，高并发，自动化 OpenAPI 文档 |
| 数据校验 | Pydantic v2 | 请求/响应数据模型自动校验 |
| HTTP 客户端 | httpx | 异步 HTTP，支持 OpenAI 兼容协议 |
| 大模型 | DeepSeek deepseek-chat | OpenAI 兼容接口 |
| 环境变量 | python-dotenv | 敏感配置管理 |
| 数据 | mock_data.py | Demo 用内存数据，无真实数据库 |

---

## 二、目录结构

```
bank-marketing-demo/
├── backend/
│   ├── main.py              # FastAPI 入口，路由注册
│   ├── config.py             # 配置读取 + DeepSeek 客户端
│   ├── requirements.txt      # Python 依赖
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── insight.py        # GET  /api/insight/report
│   │   ├── profile.py        # GET  /api/profile/{type}/{id}
│   │   └── workflow.py       # POST /api/workflow/visit
│   └── data/
│       ├── __init__.py
│       └── mock_data.py      # 100个个人客户 + 30个企业客户数据
├── frontend/
│   ├── index.html            # 单页应用入口
│   ├── package.json          # Node 依赖
│   ├── vite.config.js        # Vite 配置
│   └── src/
│       ├── main.jsx          # React 入口
│       ├── App.jsx           # 根组件 + 路由
│       ├── api/
│       │   └── client.js     # 封装 fetch 调用后端 API
│       └── pages/
│           ├── InsightReport.jsx    # 客户洞察报告
│           ├── CustomerProfile.jsx   # 客户画像
│           └── VisitWorkflow.jsx    # 拜访流程
├── docs/
│   ├── PRD.md               # 需求文档
│   └── TechnicalSolution.md # 本文档
├── .env.example             # 环境变量模板
└── README.md                # 启动说明
```

---

## 三、API 接口设计

### 3.1 客户洞察报告

**端点**：`GET /api/insight/report`

**Query 参数**：

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| dimension | string | 否 | `all` / `branch` / `manager`，默认 `all` |
| branch_id | string | 否 | 分行ID（dimension=branch时必填） |
| manager_id | string | 否 | 客户经理ID（dimension=manager时必填） |

**响应示例**：

```json
{
  "generated_at": "2025-05-18T10:00:00",
  "dimension": "all",
  "overview": {
    "total_customers": 10000,
    "total_aum": 5000000000,
    "total_deposits": 3500000000,
    "total_loans": 1500000000
  },
  "customer_structure": {
    "by_asset_level": {
      "mass": 6000,
      "growing": 2500,
      "mid_tier": 1000,
      "high_networth": 500
    },
    "by_lifecycle": {
      "new": 1500,
      "mature": 6000,
      "declining": 2000,
      "churn_risk": 500
    }
  },
  "business_metrics": {
    "deposit_churn_rate": 0.035,
    "deposit_growth_rate": 0.082,
    "loan_conversion_rate": 0.128,
    "cross_sell_ratio": 1.8,
    "mid_fee_income": 85000000
  },
  "key_lists": {
    "churn_risk_customers": [...],
    "product_expiring": [...],
    "high_value_targets": [...]
  },
  "opportunities": {
    "cross_sell_leads": [...],
    "churn_alerts": [...]
  }
}
```

### 3.2 客户画像

**端点**：`GET /api/profile/{type}/{id}`

**路径参数**：

| 参数 | 类型 | 说明 |
|---|---|---|
| type | string | `personal` / `enterprise` |
| id | string | 客户ID |

**响应示例（personal）**：

```json
{
  "type": "personal",
  "id": "P001",
  "basic_info": {
    "name": "张伟",
    "phone": "138****1234",
    "occupation": "企业主",
    "branch": "东城支行",
    "manager": "李娜",
    "account_open_date": "2019-03-15"
  },
  "products": {
    "deposits": { "balance": 280000, "type": "定期" },
    "loans": { "balance": 0, "status": "无贷款" },
    "wealth": { "fund": 50000, "insurance": 20000 }
  },
  "financial_behavior": {
    "monthly_flow_trend": [...],
    "transfer_frequency": "中等",
    "channel_preference": "手机银行"
  },
  "tags": {
    "asset_level": "中端客户",
    "lifecycle": "成熟期",
    "risk_preference": "稳健型",
    "marketing_response": "高响应"
  },
  "risk_info": {
    "credit_rating": "良好",
    "overdue_records": "无"
  },
  "recent_contact": {
    "date": "2025-04-20",
    "channel": "企微",
    "content": "产品推荐",
    "response": "有意向"
  }
}
```

**响应示例（enterprise）**：

```json
{
  "type": "enterprise",
  "id": "E001",
  "basic_info": {
    "name": "华信能源集团",
    "industry": "能源",
    "registered_capital": 50000000,
    "actual_controller": "王总",
    "group": "某集团"
  },
  "financial": {
    "credit_used": 3000000,
    "credit_limit": 10000000,
    "deposit_balance": 1200000,
    "other_bank_loans": "他行贷款约2000万，征信正常"
  },
  "risk": {
    "credit_report": "正常",
    "litigation": "无涉诉",
    "sentiment": "正面"
  },
  "financial_behavior": {
    "settlement_activity": "活跃",
    "payroll": "代发100人",
    "bills_guarantees": "年开票据约500万"
  },
  "key_persons": [
    { "name": "王总", "role": "实际控制人", "linked_personal_id": "P101" }
  ],
  "opportunities": {
    "covered_products": ["流动资金贷款", "票据"],
    "uncovered_products": ["供应链金融", "现金管理"],
    "suggestions": ["推荐供应链金融产品", "可介入工资代发扩户"]
  }
}
```

### 3.3 拜访流程

**端点**：`POST /api/workflow/visit`

**请求体**：

```json
{
  "customer_type": "personal",
  "customer_id": "P001",
  "manager_id": "M001",
  "stage": "before",
  "data": {}
}
```

| stage | 说明 | data 内容 |
|---|---|---|
| `before` | 拜访前准备 | 空对象 |
| `during` | 拜访中记录 | `{ "notes": "沟通要点", "location": "地址" }` |
| `after` | 拜访后纪要 | `{ "needs": "", "commitments": "", "objections": "" }` |

**响应示例（before）**：

```json
{
  "stage": "before",
  "customer_id": "P001",
  "profile_summary": { ... },
  "events": [
    { "type": "product_expiring", "description": "理财产品 50000 元将在 7 天后到期", "action": "推荐续存或转大额存单" }
  ],
  "visit_suggestions": [
    "客户风险偏好为稳健型，推荐大额存单或定期存款产品",
    "客户生命周期处于成熟期，可适当推荐长期限锁定收益产品",
    "沟通中避免夸大收益，突出安全性"
  ],
  "recommended_products": ["大额存单", "定期存款"],
  "task_id": "VST-20250518-001"
}
```

**响应示例（after）**：

```json
{
  "stage": "after",
  "task_id": "VST-20250518-001",
  "auto_generated_summary": "客户张伟对大额存单产品有明确兴趣，表示6月资金到位后可配置200万……",
  "tags_updated": [
    { "tag": "已面访", "value": "true" },
    { "tag": "贷款意向", "value": "无" },
    { "tag": "存款意向", "value": "高" }
  ],
  "follow_up_tasks": [
    { "task": "发送大额存单方案", "due_days": 3 },
    { "task": "电话跟进确认", "due_days": 7 },
    { "task": "上门签约", "due_days": 30 }
  ],
  "next_promotion_trigger": {
    "event": "资金到账",
    "action": "发送存款产品链接"
  }
}
```

---

## 四、前端页面设计

### 4.1 整体布局

- **顶部导航栏**：深蓝底（#1a3a5c），白色 LOGO，白色标签页切换
- **左侧菜单**：深色侧边栏（#0d2137），图标 + 文字，选中高亮
- **内容区**：浅灰背景（#f2f3f5），白色卡片承载内容

### 4.2 三个页面

#### 页面1：客户洞察报告（InsightReport）

- 顶部筛选器：维度选择（下拉）+ 机构/客户经理联动
- 卡片区（4格）：客户总数、AUM、存款、贷款
- 图表区：
  - 左：客户资产分层饼图
  - 右：生命周期分布柱状图
  - 下：近6月存款/贷款趋势折线图
- 表格区：流失预警客户 / 产品到期客户 / 高价值目标（Tab切换）

#### 页面2：客户画像（CustomerProfile）

- 左侧：客户列表（搜索框 + 筛选）
- 右侧：选中客户的画像卡片
- 画像按「基本信息 / 持有产品 / 金融行为 / 标签 / 风险信息 / 触达历史」分 Tab 展示
- 企业客户额外显示「关键人」和「业务机会」

#### 页面3：拜访流程（VisitWorkflow）

- 三步骤进度条：拜访前 → 拜访中 → 拜访后
- 拜访前：选中客户 → 自动展示画像摘要 + 事件 + 建议 → 点「开始拜访」
- 拜访中：计时 + GPS位置 + 沟通记录输入框
- 拜访后：AI自动生成纪要 + 标签更新 + 后续任务列表

### 4.3 配色方案

```
主色（Primary）：    #1a3a5c  深蓝，银行稳重感
次色（Secondary）：  #0d2137  深蓝黑，侧边栏
强调色（Accent）：   #c9a84c  金色，银行机构常用
背景色（Background）：#f2f3f5  浅灰
卡片背景：           #ffffff  白色
边框：              #e5e7eb  浅灰
成功：              #00b42a  绿色
警告：              #ff7d00  橙色
危险：              #f53f3f  红色
文字主色：          #1a212a  深色
文字次色：          #4b5563  灰色
```

---

## 五、环境变量

创建 `.env` 文件（复制 `.env.example`）：

```bash
# DeepSeek API 配置
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat

# 服务配置
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
```

---

## 六、启动方式

### 6.1 后端

```bash
cd bank-marketing-demo/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env   # 复制并填入真实 API Key
uvicorn main:app --reload --port 8000
```

API 文档自动生成在 http://localhost:8000/docs

### 6.2 前端

```bash
cd bank-marketing-demo/frontend
npm install
npm run dev  # 访问 http://localhost:3000
```

---

## 七、Demo 数据说明

`mock_data.py` 包含：

- **100个个人客户**：覆盖不同资产层级（大众/成长/中端/高净值）、不同生命周期阶段
- **30个企业客户**：覆盖不同行业（能源/制造/贸易/科技等）
- 每个客户均包含完整的画像字段和近期事件
- 拜访记录随机生成，模拟真实的客户经理工作场景
