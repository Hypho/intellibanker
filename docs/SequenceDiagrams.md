# IntelliBanker 业务流时序图

> 基于 PRD V1.0 梳理的 8 个核心业务流，对照实际代码验证。

---

## 流程1: 客户洞察报告（PRD §2）

```mermaid
sequenceDiagram
    actor User as 客户经理/管理者
    participant App as App.jsx
    participant IR as InsightReport.jsx
    participant API as /api/insight/report
    participant Data as mock_data.py

    User->>App: 选择角色登录
    App->>IR: 渲染洞察报告页(role)
    IR->>IR: 根据 role 预选维度

    User->>IR: 选择维度(全行/分行/经理)
    IR->>API: GET /api/insight/report?dimension=&branch_id=&manager_id=
    API->>Data: get_personal_customers() + get_enterprise_customers()
    Data-->>API: 客户列表(100个人+30企业)
    API->>API: 聚合概览/客群结构/业务指标/重点名单/营销机会/月度趋势
    API-->>IR: JSON 报告数据

    IR->>IR: 渲染指标卡(4格) + 饼图 + 柱状图 + 雷达图 + 趋势折线图
    IR-->>User: 展示完整洞察报告

    User->>IR: 点击客户姓名
    IR->>App: onNavigateToProfile(customerId)
    App->>App: setActive("profile") + 传递 selectedId

    User->>IR: 点击"导出PDF"
    IR->>IR: window.print()

    User->>IR: 点击"推送报告"
    IR->>IR: Modal.confirm(推送目标选择)
    IR-->>User: Message.success("已推送")
```

---

## 流程2: 个人客户画像查询（PRD §3.1）

```mermaid
sequenceDiagram
    actor User as 客户经理
    participant CP as CustomerProfile.jsx
    participant API as /api/profile
    participant Data as mock_data.py

    User->>CP: 进入客户画像页
    CP->>API: GET /api/profile/list/personal?page=1&page_size=20
    API->>Data: get_personal_customers()
    Data-->>API: 100个个人客户
    API-->>CP: {total, data[20]}
    CP->>CP: 自动选中第一个客户
    CP->>API: GET /api/profile/personal/P001
    API-->>CP: 完整画像详情
    CP-->>User: 左侧列表 + 右侧画像详情

    User->>CP: 输入搜索关键词
    CP->>API: GET /api/profile/list/personal?search=张
    API-->>CP: 过滤结果
    CP-->>User: 更新列表

    User->>CP: 选择资产等级筛选
    CP->>API: GET /api/profile/list/personal?asset_level=高净值客户
    API-->>CP: 过滤结果

    User->>CP: 翻页(page=2)
    CP->>API: GET /api/profile/list/personal?page=2
    API-->>CP: 第二页数据
    CP-->>User: 更新列表
```

---

## 流程3: 企业客户画像查询（PRD §3.2）

```mermaid
sequenceDiagram
    actor User as 客户经理
    participant CP as CustomerProfile.jsx
    participant API as /api/profile
    participant Data as mock_data.py

    User->>CP: 切换到"企业客户" tab
    CP->>API: GET /api/profile/list/enterprise?page=1
    API->>Data: get_enterprise_customers()
    Data-->>API: 30个企业客户
    API-->>CP: {total, data[20]}
    CP-->>User: 企业列表

    User->>CP: 选择行业筛选"能源"
    CP->>API: GET /api/profile/list/enterprise?industry=能源
    API-->>CP: 过滤结果

    User->>CP: 点击某企业
    CP->>API: GET /api/profile/enterprise/E001
    API-->>CP: 企业画像详情
    CP-->>User: 展示(基本信息/授信/风险/行为/关键人/覆盖/机会)

    User->>CP: 点击关键人"查看画像"
    CP->>CP: setTab("personal")
    CP->>API: GET /api/profile/personal/P096 (overrideTab="personal")
    API-->>CP: 个人画像详情
    CP-->>User: 跳转到个人画像 + 显示"返回企业画像"按钮

    User->>CP: 点击"返回企业画像"
    CP->>CP: setTab("enterprise") + selectCustomer(E001, "enterprise")
    CP-->>User: 恢复企业画像
```

---

## 流程4: 拜访前准备（PRD §4.1）

```mermaid
sequenceDiagram
    actor User as 客户经理
    participant VW as VisitWorkflow.jsx
    participant API as /api/workflow/visit
    participant Data as mock_data.py
    participant DS as DeepSeek

    User->>VW: 进入拜访流程页
    VW->>API: GET /api/profile/list/personal?page=1&page_size=50
    API-->>VW: 客户列表

    User->>VW: 选择客户类型 + 搜索选择客户
    User->>VW: 点击"开始拜访准备"

    VW->>API: POST /api/workflow/visit {stage:"before", customer_id, manager_id}
    API->>Data: get_customer("personal", "P001")
    Data-->>API: 客户详情
    API->>API: 构建画像摘要 + 提取事件 + 生成建议 + 推荐产品
    API-->>VW: {task_id, profile_summary, events, visit_suggestions, recommended_products}

    VW-->>User: 展示画像摘要 + 触发事件 + 拜访建议 + 推荐产品
    VW->>VW: step=1 (Steps高亮"拜访前准备")

    Note over VW: PRD 要求自动生成CRM任务<br/>当前仅存内存session
```

---

## 流程5: 拜访中记录（PRD §4.2）

```mermaid
sequenceDiagram
    actor User as 客户经理
    participant VW as VisitWorkflow.jsx
    participant API as /api/workflow/visit

    User->>VW: 点击"开始拜访"
    VW->>VW: step=2 (Steps高亮"拜访中记录")
    VW-->>User: 显示记录表单(时间/地点/沟通要点)

    Note over User,VW: 时间在进入step2时固定<br/>不会随re-render变化

    User->>VW: 录入拜访地点
    User->>VW: 录入沟通要点(必填)

    User->>VW: 点击"结束拜访并保存"
    VW->>API: POST /api/workflow/visit {stage:"during", task_id, notes, location}
    API-->>VW: {保存确认}
    VW->>VW: step=3 (Steps高亮"拜访后纪要")
    VW-->>User: 显示保存确认 + 拜访后表单
```

---

## 流程6: 拜访后处理（PRD §4.3）

```mermaid
sequenceDiagram
    actor User as 客户经理
    participant VW as VisitWorkflow.jsx
    participant API as /api/workflow/visit
    participant DS as DeepSeek API

    VW-->>User: 展示拜访后录入表单(需求/承诺/异议)
    User->>VW: 录入客户需求
    User->>VW: 录入客户承诺
    User->>VW: 录入客户异议(可选)

    User->>VW: 点击"生成拜访纪要"
    VW->>API: POST /api/workflow/visit {stage:"after", needs, commitments, objections}
    API->>DS: 构建prompt(客户信息+沟通内容)
    DS-->>API: AI生成纪要文本
    API->>API: 关键词匹配生成标签 + 构建跟进任务
    API-->>VW: {auto_generated_summary, tags_updated, follow_up_tasks}

    VW-->>User: 展示AI纪要 + 标签更新 + 后续任务Timeline

    Note over VW: 标签仅返回不回写mock_data<br/>加提示"标签已更新"

    Note over API: DeepSeek失败时静默降级为模板纪要<br/>前端标注"基于模板生成"
```

---

## 流程7: 事件驱动引擎（PRD §4.4）

```mermaid
sequenceDiagram
    actor User as 客户经理/管理者
    participant ED as EventDashboard.jsx
    participant API as /api/insight/report
    participant App as App.jsx

    User->>App: 点击"事件引擎"菜单
    App->>ED: 渲染事件引擎页

    ED->>API: GET /api/insight/report?dimension=all
    API-->>ED: 报告数据(含opportunities + key_lists)

    ED->>ED: 聚合事件流(流失预警+产品到期+交叉销售+流失信号)
    ED-->>User: 统计卡片 + 真实事件流表格

    User->>ED: 点击事件行客户名
    ED->>App: onNavigateToProfile(customerId)
    App->>App: setActive("profile") + 传递 selectedId
    App-->>User: 跳转到客户画像页

    Note over ED: PRD要求后台监控自动触发<br/>当前为前端手动刷新模拟
```

---

## 流程8: 角色与权限（PRD §6）

```mermaid
sequenceDiagram
    actor User as 用户
    participant App as App.jsx
    participant IR as InsightReport.jsx
    participant CP as CustomerProfile.jsx
    participant VW as VisitWorkflow.jsx

    User->>App: 打开应用
    App-->>User: 角色选择页

    User->>App: 选择"客户经理-李娜"
    App->>App: setRole("manager")

    App->>IR: 渲染(role="manager")
    IR->>IR: 预选 dimension="manager", managerId="M001"
    IR-->>User: 仅展示李娜管辖的客户数据

    App->>CP: 渲染(role="manager")
    CP->>CP: 自动过滤 manager_id="M001"
    CP-->>User: 仅展示李娜的客户列表

    App->>VW: 渲染(role="manager")
    VW->>VW: manager_id="M001" (从role读取)
    VW-->>User: 拜访任务归属李娜

    User->>App: 点击"退出"
    App->>App: setRole(null)
    App-->>User: 返回角色选择页

    Note over App: 演示模式: role仅前端state<br/>不持久化,刷新需重新选
```

---

## 问题清单

| 编号 | 严重度 | 流程 | 问题 | 状态 |
|------|--------|------|------|------|
| H1 | 高 | 流程3 | 关键人跳转竞态条件 | 已修复 |
| H2 | 高 | 流程1 | 报告中客户不可跳转画像 | 已修复 |
| H3 | 高 | 流程7 | 事件引擎与真实数据脱节 | 已修复 |
| H4 | 高 | 流程7 | 事件无法跳转客户 | 已修复 |
| H5 | 高 | 流程8 | 角色不影响数据范围 | 已修复 |
| M1 | 中 | 流程1 | 维度切换时空请求 | 已修复 |
| M2 | 中 | 流程2 | 分页切换不刷新 | 已修复 |
| M3 | 中 | 流程3 | 跳转后无法返回企业画像 | 已修复 |
| M4 | 中 | 流程4 | manager_id硬编码 | 已修复 |
| M5 | 中 | 流程6 | 标签不回写(加提示) | 已修复 |
| M6 | 中 | 流程3 | 企业缺行业筛选 | 已修复 |
| L1 | 低 | 流程1 | 推送目标不可选 | 已修复 |
| L2 | 低 | 流程5 | 开始时间每次渲染变化 | 已修复 |
| L3 | 低 | 流程6 | AI纪要降级无提示 | 已修复 |
