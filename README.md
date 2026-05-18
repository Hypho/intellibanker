# 山西银行智能营销平台 Demo

基于 PRD v1.0 + 技术方案 v1.0 构建的完整 Demo 系统。

## 项目结构

```
bank-marketing-demo/
├── backend/                  # FastAPI 后端
│   ├── main.py              # 入口
│   ├── config.py            # DeepSeek 配置
│   ├── routers/
│   │   ├── insight.py       # 客户洞察报告 API
│   │   ├── profile.py       # 客户画像 API
│   │   └── workflow.py      # 拜访流程 API
│   └── data/
│       └── mock_data.py     # 模拟数据（100个人 + 30个企业）
├── frontend/                 # React + Vite 前端
│   ├── src/
│   │   ├── App.jsx          # 主布局
│   │   ├── api/client.js     # API 封装
│   │   └── pages/
│   │       ├── InsightReport.jsx   # 洞察报告页
│   │       ├── CustomerProfile.jsx  # 画像页
│   │       └── VisitWorkflow.jsx    # 拜访流程页
│   └── index.html
├── docs/
│   ├── PRD.md               # 需求文档
│   └── TechnicalSolution.md  # 技术方案
└── .env                     # API Key 配置
```

## 启动方式

### 1. 安装后端依赖

```bash
cd backend
pip install -r requirements.txt
```

### 2. 配置 API Key

```bash
# 编辑 .env，填入真实 DeepSeek API Key
DEEPSEEK_API_KEY=sk-xxxxxxxxxx
```

### 3. 启动后端

```bash
uvicorn backend.main:app --reload --port 8000
# API 文档：http://localhost:8000/docs
```

### 4. 启动前端

```bash
cd frontend
npm install
npm run dev
# 访问：http://localhost:3000
```

## 功能说明

### 客户洞察报告
- 全行/分行维度的客户经营分析
- 资产分层饼图、生命周期柱状图、业务指标雷达图
- 流失预警名单、产品到期名单、高价值目标名单

### 客户画像
- 左侧选客户，右侧查看完整画像
- 个人客户：基本信息、产品持有、事件触发、触达历史
- 企业客户：授信存款、风险信息、业务覆盖、业务机会

### 拜访流程
- 拜访前：自动推送画像摘要 + 触发事件 + 建议策略
- 拜访中：计时、地点、实时录入沟通要点
- 拜访后：AI 生成拜访纪要 + 标签更新 + 后续任务

## 技术栈

- **后端**：Python + FastAPI + httpx + DeepSeek API
- **前端**：React 18 + Vite + Arco Design + ECharts
- **配色**：深蓝（#1a3a5c）+ 金色（#c9a84c）
