import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import { Card, Grid, Select, Table, Tabs, Spin, Message, Progress, Tag, Button, Modal } from "@arco-design/web-react";
import { IconClockCircle, IconStar, IconSafe, IconApps } from "@arco-design/web-react/icon";
import ReactECharts from "echarts-for-react";
import { C, FONT_DISPLAY, FONT_MONO, GRADIENT_SUBTLE, RADIUS, SECTION_STYLE, formatMoney, TAG_COLORS } from "../theme";
import { Section, MetricCard } from "../components/SharedWidgets";

const { Row, Col } = Grid;

const STATUS_COLOR = {
  正面: C.success, 中性: C.textMuted, 负面: C.danger,
  流失预警: C.danger, 衰退期: C.warning, 成熟期: C.primary, 新客户: C.success,
};

export default function InsightReport({ role, roleConfig, onNavigateToProfile }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [dimension, setDimension] = useState(
    roleConfig?.managerId ? "manager" : roleConfig?.branchId ? "branch" : "all"
  );
  const [branchId, setBranchId] = useState(roleConfig?.branchId || "");
  const [managerId, setManagerId] = useState(roleConfig?.managerId || "");

  useEffect(() => {
    if ((dimension === "branch" && !branchId) || (dimension === "manager" && !managerId)) {
      setData(null); return;
    }
    fetchReport();
  }, [dimension, branchId, managerId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = { dimension };
      if (dimension === "branch") params.branch_id = branchId;
      if (dimension === "manager") params.manager_id = managerId;
      setData(await api.getInsightReport(params));
    } catch (e) { Message.error("获取报告失败：" + e.message); }
    finally { setLoading(false); }
  };

  const handleDimensionChange = (val) => {
    setDimension(val);
    if (val === "branch") { setBranchId(""); setData(null); }
    else if (val === "manager") { setManagerId(""); setData(null); }
    else { setBranchId(""); setManagerId(""); }
  };

  if (loading) return <Spin size={40} style={{ display: "flex", justifyContent: "center", marginTop: 80 }} />;
  if (!data) {
    if ((dimension === "branch" && !branchId) || (dimension === "manager" && !managerId))
      return <div style={{ textAlign: "center", padding: 80, color: C.textDim }}>请选择{dimension === "branch" ? "分行" : "客户经理"}后查看报告</div>;
    return null;
  }

  const { overview, customer_structure, business_metrics, key_lists, opportunities, branches, managers, monthly_trends } = data;

  // ── Charts ──
  const trendOption = {
    tooltip: { trigger: "axis", formatter: (p) => { let s = p[0].name + "<br/>"; p.forEach(i => { s += `${i.marker} ${i.seriesName}: ${(i.value/10000).toFixed(0)}万<br/>`; }); return s; }},
    legend: { data: ["存款余额", "贷款余额"], bottom: 0, textStyle: { fontSize: 11, color: C.textMuted } },
    grid: { top: 40, right: 60, bottom: 40, left: 70 },
    xAxis: { type: "category", data: monthly_trends?.months || [], axisLine: { lineStyle: { color: C.border } }, axisLabel: { fontSize: 11, color: C.textMuted } },
    yAxis: [
      { type: "value", name: "存款", axisLabel: { formatter: v => (v/10000).toFixed(0)+"万", fontSize: 11, color: C.textMuted }, splitLine: { lineStyle: { color: C.borderLt } } },
      { type: "value", name: "贷款", axisLabel: { formatter: v => (v/10000).toFixed(0)+"万", fontSize: 11, color: C.textMuted }, splitLine: { show: false } },
    ],
    series: [
      { name: "存款余额", type: "line", data: monthly_trends?.deposit_trend, smooth: true, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(26,58,92,0.18)" }, { offset: 1, color: "rgba(26,58,92,0)" }] } }, lineStyle: { color: C.primary, width: 2.5 }, itemStyle: { color: C.primary } },
      { name: "贷款余额", type: "line", yAxisIndex: 1, data: monthly_trends?.loan_trend, smooth: true, lineStyle: { color: C.danger, width: 2 }, itemStyle: { color: C.danger } },
    ],
  };

  const pieOption = {
    tooltip: { trigger: "item", formatter: "{b}: {c}人 ({d}%)" },
    color: ["#94a3b8", "#64748b", C.primary, C.primaryDk],
    series: [{ type: "pie", radius: ["45%", "70%"], label: { show: true, formatter: "{b}\n{c}人", fontSize: 12 }, data: Object.entries(customer_structure.by_asset_level).map(([k, v]) => ({ name: k, value: v })) }],
  };

  const lifecycleOption = {
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: Object.keys(customer_structure.by_lifecycle), axisLine: { lineStyle: { color: C.border } }, axisLabel: { fontSize: 11, color: C.textMuted } },
    yAxis: { type: "value", name: "人数", axisLabel: { fontSize: 11, color: C.textMuted }, splitLine: { lineStyle: { color: C.borderLt } } },
    series: [{ type: "bar", data: Object.values(customer_structure.by_lifecycle), itemStyle: { color: C.primary }, barMaxWidth: 48 }],
  };

  const radarOption = {
    tooltip: {},
    radar: {
      indicator: [
        { name: "存款增长率", max: 0.2 }, { name: "交叉销售率", max: 4 }, { name: "客户增长率", max: 0.1 },
        { name: "贷款转化率", max: 0.3 }, { name: "中收贡献", max: 1 },
      ],
      radius: "60%", axisName: { fontSize: 10, color: C.textMuted },
      splitLine: { lineStyle: { color: C.border } }, splitArea: { areaStyle: { color: ["#fff", "#fafafa"] } },
      axisLine: { lineStyle: { color: C.border } },
    },
    series: [{ type: "radar", data: [{ value: [business_metrics.deposit_growth_rate, business_metrics.cross_sell_ratio / 4, 0.06, business_metrics.loan_conversion_rate, 0.6], name: "业务指标", areaStyle: { color: "rgba(26,58,92,0.3)" }, lineStyle: { color: C.primary, width: 2 }, itemStyle: { color: C.primary } }] }],
  };

  // ── Table columns ──
  const nameClick = onNavigateToProfile
    ? (v, r) => <span onClick={() => onNavigateToProfile(r.id)} style={{ color: C.info, cursor: "pointer", fontWeight: 500 }}>{v}</span>
    : (v) => v;

  const idRender = (v) => <span style={{ fontFamily: FONT_MONO, fontSize: 11.5, color: C.textDim }}>{v}</span>;
  const moneyRender = (v) => <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600 }}>{formatMoney(v)}</span>;

  const churnColumns = [
    { title: "客户ID", dataIndex: "id", width: 80, render: idRender },
    { title: "姓名", dataIndex: "name", render: nameClick },
    { title: "AUM", dataIndex: "aum", render: moneyRender },
    { title: "生命周期", dataIndex: "lifecycle", render: (v) => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
    { title: "流失概率", dataIndex: "churn_probability", render: (v) => <Progress percent={Math.round(v * 100)} showText size="small" status={v > 0.5 ? "error" : "normal"} style={{ width: 80 }} /> },
  ];

  const expiringColumns = [
    { title: "客户ID", dataIndex: "id", width: 80, render: idRender },
    { title: "姓名", dataIndex: "name", render: nameClick },
    { title: "产品", dataIndex: "product" },
    { title: "金额", dataIndex: "balance", render: moneyRender },
    { title: "到期日", dataIndex: "expire_date" },
    { title: "剩余天数", dataIndex: "days_left", render: (v) => <Tag color={v <= 7 ? "red" : v <= 15 ? "orange" : "green"}>{v}天</Tag> },
  ];

  const highValueColumns = [
    { title: "客户ID", dataIndex: "id", width: 80, render: idRender },
    { title: "姓名", dataIndex: "name", render: nameClick },
    { title: "AUM", dataIndex: "aum", render: moneyRender },
    { title: "资产等级", dataIndex: "asset_level", render: (v) => <Tag color={TAG_COLORS[v]}>{v}</Tag> },
    { title: "生命周期", dataIndex: "lifecycle", render: (v) => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
  ];

  const crossSellColumns = [
    { title: "客户ID", dataIndex: "id", width: 80, render: idRender },
    { title: "姓名", dataIndex: "name", render: nameClick },
    { title: "AUM", dataIndex: "aum", render: moneyRender },
    { title: "持有产品", dataIndex: "products_held", render: (v) => <Tag color={v <= 1 ? "red" : "orange"}>{v}个</Tag> },
    { title: "营销建议", dataIndex: "suggestion", render: (v) => <span style={{ fontSize: 12.5, color: C.textSec }}>{v}</span> },
  ];

  const churnAlertColumns = [
    { title: "客户ID", dataIndex: "id", width: 80, render: idRender },
    { title: "姓名", dataIndex: "name", render: nameClick },
    { title: "流失概率", dataIndex: "churn_probability", render: (v) => <Progress percent={Math.round(v * 100)} showText size="small" status={v > 0.5 ? "error" : "normal"} style={{ width: 80 }} /> },
    { title: "流失信号", dataIndex: "signal", render: (v) => <span style={{ fontSize: 12.5, color: C.textMuted }}>{v}</span> },
  ];

  const branchOptions = (branches || []).map((b) => ({ label: b.name, value: b.id }));
  const managerOptions = (managers || []).map((m) => ({ label: `${m.name}（${m.branch}）`, value: m.id }));

  return (
    <div>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 24, padding: "20px 24px",
        background: GRADIENT_SUBTLE, borderRadius: RADIUS.lg,
        border: `1px solid ${C.border}`, ...SECTION_STYLE,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "0.02em" }}>客户洞察报告</div>
          <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 4 }}>生成时间：{overview.generated_at}</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button type="outline" size="small" onClick={() => window.print()}
            style={{ borderRadius: RADIUS.sm, borderColor: C.border, color: C.textSec }}>导出PDF</Button>
          <Button type="outline" size="small" onClick={() => {
            Modal.confirm({ title: "推送报告", content: "将报告推送至：\n• 企微「管理层群」\n• 管理层邮箱\n• 短信通知\n\n确认推送？", onOk: () => Message.success("报告已推送至企微群、管理层邮箱和短信") });
          }} style={{ borderRadius: RADIUS.sm, borderColor: C.accent, color: C.accent }}>推送报告</Button>
        </div>
      </div>

      {/* Dimension selector */}
      <Section title="筛选维度" icon={<IconApps />}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <Select value={dimension} onChange={handleDimensionChange}
            options={[{ label: "全行概览", value: "all" }, { label: "分行视角", value: "branch" }, { label: "客户经理视角", value: "manager" }]}
            style={{ width: 160 }} />
          {dimension === "branch" && <Select placeholder="选择分行" value={branchId} onChange={setBranchId} options={branchOptions} style={{ width: 180 }} allowClear />}
          {dimension === "manager" && <Select placeholder="选择客户经理" value={managerId} onChange={setManagerId} options={managerOptions} style={{ width: 200 }} allowClear />}
          <div style={{ marginLeft: "auto", fontSize: 12, color: C.textDim }}>
            {overview.total_customers} 位个人客户 · {overview.total_enterprise_customers || 0} 位企业客户
          </div>
        </div>
      </Section>

      {/* KPI Cards */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        {[
          { label: "客户总数", value: overview.total_customers.toLocaleString(), sub: "个人客户", color: C.primary },
          { label: "AUM总量", value: formatMoney(overview.total_aum), sub: "资产规模", color: C.primary },
          { label: "存款余额", value: formatMoney(overview.total_deposits), sub: "负债业务", color: C.info },
          { label: "贷款余额", value: formatMoney(overview.total_loans), sub: "资产业务", color: C.danger },
        ].map((item, i) => (
          <Col span={6} key={i}>
            <Card hoverable style={{ textAlign: "center", borderRadius: RADIUS.md }}>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{item.sub}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: item.color, fontFamily: FONT_DISPLAY }}>{item.value}</div>
              <div style={{ fontSize: 13, color: C.primary, marginTop: 4, fontWeight: 500 }}>{item.label}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Charts */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}><Section title="客户资产分层"><ReactECharts option={pieOption} style={{ height: 280 }} /></Section></Col>
        <Col span={8}><Section title="生命周期分布"><ReactECharts option={lifecycleOption} style={{ height: 280 }} /></Section></Col>
        <Col span={8}>
          <Section title="业务指标雷达" extra={<Tag size="small" color="arcoblue">数据来源：行内标签系统</Tag>}>
            <ReactECharts option={radarOption} style={{ height: 280 }} />
          </Section>
        </Col>
      </Row>

      {/* Trend */}
      <Section title="近6月存贷款趋势" icon={<IconClockCircle />}>
        <ReactECharts option={trendOption} style={{ height: 280 }} />
      </Section>

      {/* Business metrics */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        {[
          { label: "存款流失率", value: (business_metrics.deposit_churn_rate * 100).toFixed(1) + "%", color: C.danger, tip: "流失客户占比" },
          { label: "存款增长率", value: (business_metrics.deposit_growth_rate * 100).toFixed(1) + "%", color: C.success, tip: "较上期增长" },
          { label: "贷款转化率", value: (business_metrics.loan_conversion_rate * 100).toFixed(1) + "%", color: C.info, tip: "有贷款客户占比" },
          { label: "交叉销售率", value: business_metrics.cross_sell_ratio.toFixed(1) + "个", color: C.info, tip: "客均持有产品数" },
          { label: "中收贡献", value: formatMoney(business_metrics.mid_fee_income), color: C.accent, tip: "中间业务收入" },
        ].map((item, i) => (
          <Col span={Math.floor(24 / 5)} key={i}>
            <MetricCard label={item.label} value={item.value} color={item.color} tip={item.tip} />
          </Col>
        ))}
      </Row>

      {/* Key lists */}
      <Section title="重点客户名单" icon={<IconStar />}>
        <Tabs>
          <Tabs.Tab title={"流失预警 (" + (key_lists.churn_risk_customers?.length || 0) + ")"} key="churn">
            <Table columns={churnColumns} data={key_lists.churn_risk_customers || []} pagination={false} size="small" rowKey="id" noDataElement={<div style={{ padding: 40, color: C.textDim }}>暂无流失预警客户</div>} />
          </Tabs.Tab>
          <Tabs.Tab title={"产品到期 (" + (key_lists.product_expiring?.length || 0) + ")"} key="expiring">
            <Table columns={expiringColumns} data={key_lists.product_expiring || []} pagination={false} size="small" rowKey="id" noDataElement={<div style={{ padding: 40, color: C.textDim }}>暂无到期产品</div>} />
          </Tabs.Tab>
          <Tabs.Tab title={"高价值目标 (" + (key_lists.high_value_targets?.length || 0) + ")"} key="highvalue">
            <Table columns={highValueColumns} data={key_lists.high_value_targets || []} pagination={false} size="small" rowKey="id" noDataElement={<div style={{ padding: 40, color: C.textDim }}>暂无数据</div>} />
          </Tabs.Tab>
          <Tabs.Tab title={"交叉销售 (" + (opportunities?.cross_sell_leads?.length || 0) + ")"} key="crosssell">
            <div style={{ padding: "10px 0", color: C.textMuted, fontSize: 13 }}>
              <span style={{ color: C.info }}>▶</span> 产品覆盖不足但资质良好的客户，建议推荐基金或保险
            </div>
            <Table columns={crossSellColumns} data={opportunities?.cross_sell_leads || []} pagination={false} size="small" rowKey="id" noDataElement={<div style={{ padding: 40, color: C.textDim }}>暂无交叉销售机会</div>} />
          </Tabs.Tab>
          <Tabs.Tab title={"流失信号 (" + (opportunities?.churn_alerts?.length || 0) + ")"} key="churnalert">
            <div style={{ padding: "10px 0", color: C.textMuted, fontSize: 13 }}>
              <span style={{ color: C.danger }}>▶</span> 流失概率较高客户，需优先触达干预
            </div>
            <Table columns={churnAlertColumns} data={opportunities?.churn_alerts || []} pagination={false} size="small" rowKey="id" noDataElement={<div style={{ padding: 40, color: C.textDim }}>暂无流失预警信号</div>} />
          </Tabs.Tab>
        </Tabs>
      </Section>
    </div>
  );
}
