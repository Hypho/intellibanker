# IntelliBanker

> 银行客户经理的智能贴身助手，辅助客户经营与拜访全流程。

## 产品定位

面向银行的对公+零售客户经理，提供客户洞察、画像分析、拜访管理全链路数字化支撑。

## 技术栈

**后端**：Python 3.9 + FastAPI + Pydantic
**前端**：React 18 + Arco Design v2 + ECharts
**大模型**：DeepSeek（兼容 OpenAI 协议）

## 快速启动

```bash
# 后端
cd backend
pip3 install -r requirements.txt
PYTHONPATH=. python3 -m uvicorn backend.main:app --port 8000

# 前端
cd frontend
npm install
npm run dev
```

访问 http://localhost:3000

## 目录结构

```
backend/
  data/mock_data.py    # 模拟数据
  routers/
    insight.py         # 客户洞察报告
    profile.py          # 客户画像
    workflow.py         # 拜访流程
  config.py            # DeepSeek 配置
  main.py              # FastAPI 入口
frontend/
  src/
    pages/
      InsightReport.jsx    # 洞察报告页
      CustomerProfile.jsx   # 客户画像页
      VisitWorkflow.jsx     # 拜访流程页
    api/client.js           # API 客户端
    App.jsx                 # 主布局
```
