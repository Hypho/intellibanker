import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import { Card, Grid, Select, Table, Tabs, Spin, Message,
  Progress, Tag,
} from "@arco-design/web-react";
const { Row, Col } = Grid;
const ReactECharts = require("echarts-for-react");


const STATUS_COLOR = {
  正面: "#00b42a",
  中性: "#4b5563",
  负面: "#f53f3f",
  流失预警: "#f53f3f",
  衰退期: "#ff7d00",
  成熟期: "#1a3a5c",
  新客户: "#00b42a",
};

export default function InsightReport() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [dimension, setDimension] = useState("all");
  const [branchId, setBranchId] = useState("");
  const [managerId, setManagerId] = useState("");

  useEffect(() => {
    fetchReport();
  }, [dimension, branchId, managerId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = { dimension };
      if (dimension === "branch") params.branch_id = branchId;
      if (dimension === "manager") params.manager_id = managerId;
      const res = await api.getInsightReport(params);
      setData(res);
    } catch (e) {
      Message.error("获取报告失败：" + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDimensionChange = (val) => {
    setDimension(val);
    if (val !== "branch") setBranchId("");
    if (val !== "manager") setManagerId("");
  };

  if (loading) return <Spin size={40} style={{ display: "flex", justifyContent: "center", marginTop: 80 }} />;
  if (!data) return null;

  const { overview, customer_structure, business_metrics, key_lists, opportunities, branches, managers } = data;

  const formatMoney = (v) =>
    v >= 100000000 ? (v / 100000000).toFixed(1) + "亿"
    : v >= 10000 ? (v / 10000).toFixed(0) + "万"
    : v.toLocaleString();

  // 资产分层饼图
  const pieOption = {
    tooltip: { trigger: "item", formatter: "{b}: {c}人 ({d}%)" },
    color: ["#94a3b8", "#64748b", "#1a3a5c", "#0d2137"],
    series: [{
      type: "pie",
      radius: ["45%", "70%"],
      label: { show: true, formatter: "{b}\n{c}人", fontSize: 12 },
      data: Object.entries(customer_structure.by_asset_level).map(([k, v]) => ({ name: k, value: v })),
    }],
  };

  // 生命周期柱状图
  const lifecycleOption = {
    tooltip: { trigger: "axis" },
    xAxis: { type: "category", data: Object.keys(customer_structure.by_lifecycle), axisLine: { lineStyle: { color: "#e5e7eb" } }, axisLabel: { fontSize: 11, color: "#6b7280" } },
    yAxis: { type: "value", name: "人数", axisLabel: { fontSize: 11, color: "#6b7280" }, splitLine: { lineStyle: { color: "#f3f4f6" } } },
    series: [{
      type: "bar",
      data: Object.values(customer_structure.by_lifecycle),
      itemStyle: { color: "#1a3a5c" },
      barMaxWidth: 48,
    }],
  };

  // 业务指标雷达
  const radarOption = {
    tooltip: {},
    radar: {
      indicator: [
        { name: "存款增长率", max: 0.2 },
        { name: "交叉销售率", max: 4 },
        { name: "客户增长率", max: 0.1 },
        { name: "贷款转化率", max: 0.3 },
        { name: "中收贡献", max: 1 },
      ],
      radius: "60%",
      name: { textStyle: { fontSize: 10, color: "#6b7280" } },
      splitLine: { lineStyle: { color: "#e5e7eb" } },
      splitArea: { areaStyle: { color: ["#fff", "#fafafa"] } },
    },
    series: [{
      type: "radar",
      data: [{
        value: [
          business_metrics.deposit_growth_rate,
          business_metrics.cross_sell_ratio / 4,
          0.06,
          business_metrics.loan_conversion_rate,
          0.6,
        ],
        name: "业务指标",
        areaStyle: { color: "rgba(26,58,92,0.3)" },
        lineStyle: { color: "#1a3a5c", width: 2 },
        itemStyle: { color: "#1a3a5c" },
      }],
    }],
  };

  const churnColumns = [
    { title: "客户ID", dataIndex: "id", width: 90, render: (v) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{v}</span> },
    { title: "姓名", dataIndex: "name" },
    { title: "AUM", dataIndex: "aum", render: (v) => formatMoney(v) },
    { title: "生命周期", dataIndex: "lifecycle", render: (v) => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
    {
      title: "流失概率",
      dataIndex: "churn_probability",
      render: (v) => <Progress percent={Math.round(v * 100)} showText size="small" status={v > 0.5 ? "error" : "normal"} />,
    },
  ];

  const expiringColumns = [
    { title: "客户ID", dataIndex: "id", width: 90, render: (v) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{v}</span> },
    { title: "姓名", dataIndex: "name" },
    { title: "产品", dataIndex: "product" },
    { title: "金额", dataIndex: "balance", render: (v) => formatMoney(v) },
    { title: "到期日", dataIndex: "expire_date" },
    {
      title: "剩余天数",
      dataIndex: "days_left",
      render: (v) => <Tag color={v <= 7 ? "red" : v <= 15 ? "orange" : "green"}>{v}天</Tag>,
    },
  ];

  const highValueColumns = [
    { title: "客户ID", dataIndex: "id", width: 90, render: (v) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{v}</span> },
    { title: "姓名", dataIndex: "name" },
    { title: "AUM", dataIndex: "aum", render: (v) => formatMoney(v) },
    { title: "资产等级", dataIndex: "asset_level" },
    { title: "生命周期", dataIndex: "lifecycle", render: (v) => <Tag color={STATUS_COLOR[v]}>{v}</Tag> },
  ];

  const crossSellColumns = [
    { title: "客户ID", dataIndex: "id", width: 90, render: (v) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{v}</span> },
    { title: "姓名", dataIndex: "name" },
    { title: "AUM", dataIndex: "aum", render: (v) => formatMoney(v) },
    { title: "持有产品数", dataIndex: "products_held", render: (v) => <Tag color={v <= 1 ? "red" : "orange"}>{v}个</Tag> },
    { title: "营销建议", dataIndex: "suggestion", render: (v) => <span style={{ fontSize: 12, color: "#374151" }}>{v}</span> },
  ];

  const churnAlertColumns = [
    { title: "客户ID", dataIndex: "id", width: 90, render: (v) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{v}</span> },
    { title: "姓名", dataIndex: "name" },
    {
      title: "流失概率",
      dataIndex: "churn_probability",
      render: (v) => <Progress percent={Math.round(v * 100)} showText size="small" status={v > 0.5 ? "error" : "normal"} />,
    },
    { title: "流失信号", dataIndex: "signal", render: (v) => <span style={{ fontSize: 12, color: "#6b7280" }}>{v}</span> },
  ];

  const branchOptions = (branches || []).map((b) => ({ label: b.name, value: b.id }));
  const managerOptions = (managers || []).map((m) => ({ label: `${m.name}（${m.branch}）`, value: m.id }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: "#1a212a" }}>客户洞察报告</div>
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          生成时间：{overview.generated_at}
        </div>
      </div>

      {/* 维度选择 */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ color: "#4b5563", fontSize: 14 }}>查看维度：</span>
          <Select
            value={dimension}
            onChange={handleDimensionChange}
            options={[
              { label: "全行概览", value: "all" },
              { label: "分行视角", value: "branch" },
              { label: "客户经理视角", value: "manager" },
            ]}
            style={{ width: 160 }}
          />
          {dimension === "branch" && (
            <Select
              placeholder="选择分行"
              value={branchId}
              onChange={setBranchId}
              options={branchOptions}
              style={{ width: 180 }}
              allowClear
            />
          )}
          {dimension === "manager" && (
            <Select
              placeholder="选择客户经理"
              value={managerId}
              onChange={setManagerId}
              options={managerOptions}
              style={{ width: 200 }}
              allowClear
            />
          )}
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#9ca3af" }}>
            {overview.total_customers} 位个人客户 · {overview.total_enterprise_customers || 0} 位企业客户
          </div>
        </div>
      </Card>

      {/* 四大指标卡片 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        {[
          { label: "客户总数", value: overview.total_customers.toLocaleString(), sub: "个人客户", color: "#1a3a5c" },
          { label: "AUM总量", value: formatMoney(overview.total_aum), sub: "资产规模", color: "#1a3a5c" },
          { label: "存款余额", value: formatMoney(overview.total_deposits), sub: "负债业务", color: "#165dff" },
          { label: "贷款余额", value: formatMoney(overview.total_loans), sub: "资产业务", color: "#f53f3f" },
        ].map((item, i) => (
          <Col span={6} key={i}>
            <Card hoverable style={{ textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>{item.sub}</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: item.color, fontFamily: "Georgia" }}>{item.value}</div>
              <div style={{ fontSize: 13, color: "#1a3a5c", marginTop: 4 }}>{item.label}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 图表区 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Card title="客户资产分层">
            <ReactECharts option={pieOption} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="生命周期分布">
            <ReactECharts option={lifecycleOption} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="业务指标雷达">
            <ReactECharts option={radarOption} style={{ height: 280 }} />
          </Card>
        </Col>
      </Row>

      {/* 业务指标 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        {[
          { label: "存款流失率", value: (business_metrics.deposit_churn_rate * 100).toFixed(1) + "%", color: "#f53f3f", tip: "流失客户占比" },
          { label: "存款增长率", value: (business_metrics.deposit_growth_rate * 100).toFixed(1) + "%", color: "#00b42a", tip: "较上期增长" },
          { label: "贷款转化率", value: (business_metrics.loan_conversion_rate * 100).toFixed(1) + "%", color: "#165dff", tip: "有贷款客户占比" },
          { label: "交叉销售率", value: business_metrics.cross_sell_ratio.toFixed(1) + "个", color: "#165dff", tip: "客均持有产品数" },
          { label: "中收贡献", value: formatMoney(business_metrics.mid_fee_income), color: "#c9a84c", tip: "中间业务收入" },
        ].map((item, i) => (
          <Col span={4} key={i}>
            <Card hoverable style={{ cursor: "default" }} title={item.tip}>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>{item.label}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: item.color }}>{item.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 重点名单 + 营销机会 */}
      <Card title="重点客户名单">
        <Tabs>
          <Tabs.Tab title={"流失预警 (" + (key_lists.churn_risk_customers?.length || 0) + ")"} key="churn">
            <Table
              columns={churnColumns}
              data={key_lists.churn_risk_customers || []}
              pagination={false}
              size="small"
              rowKey="id"
              noDataElement={<div style={{ padding: 40, color: "#6b7280" }}>暂无流失预警客户</div>}
            />
          </Tabs.Tab>
          <Tabs.Tab title={"产品到期 (" + (key_lists.product_expiring?.length || 0) + ")"} key="expiring">
            <Table
              columns={expiringColumns}
              data={key_lists.product_expiring || []}
              pagination={false}
              size="small"
              rowKey="id"
              noDataElement={<div style={{ padding: 40, color: "#6b7280" }}>暂无到期产品</div>}
            />
          </Tabs.Tab>
          <Tabs.Tab title={"高价值目标 (" + (key_lists.high_value_targets?.length || 0) + ")"} key="highvalue">
            <Table
              columns={highValueColumns}
              data={key_lists.high_value_targets || []}
              pagination={false}
              size="small"
              rowKey="id"
              noDataElement={<div style={{ padding: 40, color: "#6b7280" }}>暂无数据</div>}
            />
          </Tabs.Tab>
          <Tabs.Tab title={"交叉销售机会 (" + (opportunities?.cross_sell_leads?.length || 0) + ")"} key="crosssell">
            <div style={{ padding: "12px 0", color: "#6b7280", fontSize: 13 }}>
              <span style={{ color: "#165dff" }}>▶</span> 产品覆盖不足但资质良好的客户，建议推荐基金或保险
            </div>
            <Table
              columns={crossSellColumns}
              data={opportunities?.cross_sell_leads || []}
              pagination={false}
              size="small"
              rowKey="id"
              noDataElement={<div style={{ padding: 40, color: "#6b7280" }}>暂无交叉销售机会</div>}
            />
          </Tabs.Tab>
          <Tabs.Tab title={"流失预警信号 (" + (opportunities?.churn_alerts?.length || 0) + ")"} key="churnalert">
            <div style={{ padding: "12px 0", color: "#6b7280", fontSize: 13 }}>
              <span style={{ color: "#f53f3f" }}>▶</span> 流失概率较高客户，需优先触达干预
            </div>
            <Table
              columns={churnAlertColumns}
              data={opportunities?.churn_alerts || []}
              pagination={false}
              size="small"
              rowKey="id"
              noDataElement={<div style={{ padding: 40, color: "#6b7280" }}>暂无流失预警信号</div>}
            />
          </Tabs.Tab>
        </Tabs>
      </Card>
    </div>
  );
}
