import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import {
  Card, Table, Select, Input, Tabs, Tag, Spin, Message, Descriptions, Progress, Grid,
  Badge, Pagination,
} from "@arco-design/web-react";
const { Row, Col } = Grid;

const { Search } = Input;
const ReactECharts = require("echarts-for-react");


const TAG_COLORS = {
  大众客户: "gray",
  成长型客户: "blue",
  中端客户: "arcoblue",
  高净值客户: "gold",
  新客户: "green",
  成熟期: "cyan",
  衰退期: "orange",
  流失预警: "red",
  高响应: "green",
  中响应: "blue",
  低响应: "orange",
  未触达: "gray",
  保守型: "gray",
  稳健型: "blue",
  积极型: "orange",
};

export default function CustomerProfile() {
  const [tab, setTab] = useState("personal");
  const [loading, setLoading] = useState(false);
  const [listData, setListData] = useState({ data: [], total: 0 });
  const [selectedId, setSelectedId] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({});
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
    fetchList();
  }, [tab, filters, search]);

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = tab === "personal"
        ? await api.listPersonalProfiles({ page: currentPage, page_size: 20, search, ...filters })
        : await api.listEnterpriseProfiles({ page: currentPage, page_size: 20, search });
      setListData(res);
      if (res.data.length > 0 && !selectedId) {
        selectCustomer(res.data[0].id);
      }
    } catch (e) {
      Message.error("加载失败：" + e.message);
    } finally {
      setLoading(false);
    }
  };

  const selectCustomer = async (id) => {
    setSelectedId(id);
    setProfileLoading(true);
    try {
      const res = await api.getProfile(tab, id);
      setProfileData(res);
    } catch (e) {
      Message.error("加载画像失败");
      setProfileData(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const formatMoney = (v) =>
    v >= 100000000 ? (v / 100000000).toFixed(1) + "亿"
    : v >= 10000 ? (v / 10000).toFixed(0) + "万"
    : v ? v.toLocaleString() : "0";

  // ── 个人客户列 ──
  const personalColumns = [
    {
      title: "客户ID",
      dataIndex: "id",
      width: 90,
      render: (v) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{v}</span>,
    },
    { title: "姓名", dataIndex: "name" },
    {
      title: "资产等级",
      dataIndex: "asset_level",
      render: (v) => <Tag color={TAG_COLORS[v] || "gray"}>{v}</Tag>,
    },
    {
      title: "生命周期",
      dataIndex: "lifecycle",
      render: (v) => <Tag color={TAG_COLORS[v] || "gray"}>{v}</Tag>,
    },
    {
      title: "AUM",
      dataIndex: "aum",
      render: (v) => formatMoney(v),
    },
    {
      title: "流失概率",
      dataIndex: "churn_probability",
      render: (v) => (
        <Progress
          percent={Math.round(v * 100)}
          size="small"
          showText
          status={v > 0.5 ? "error" : "normal"}
          style={{ width: 80 }}
        />
      ),
    },
  ];

  // ── 企业客户列 ──
  const enterpriseColumns = [
    {
      title: "企业ID",
      dataIndex: "id",
      width: 90,
      render: (v) => <span style={{ fontFamily: "monospace", fontSize: 12 }}>{v}</span>,
    },
    { title: "企业名称", dataIndex: "name" },
    { title: "行业", dataIndex: "industry" },
    {
      title: "授信使用",
      render: (_, r) => {
        const pct = r.credit_limit > 0 ? Math.round((r.credit_used / r.credit_limit) * 100) : 0;
        return (
          <div style={{ width: 90 }}>
            <Progress percent={pct} size="small" showText formatText={(v) => v + "%"} status={pct > 70 ? "error" : "normal"} />
          </div>
        );
      },
    },
    {
      title: "存款余额",
      dataIndex: "deposit_balance",
      render: (v) => formatMoney(v),
    },
    {
      title: "舆情",
      dataIndex: "sentiment",
      render: (v) => <Tag color={{ 正面: "green", 中性: "gray", 负面: "red" }[v] || "gray"}>{v}</Tag>,
    },
  ];

  // ── 金融行为 ECharts 配置 ──
  const buildFlowTrendOption = (data) => ({
    tooltip: { trigger: "axis", formatter: (p) => `${p[0].name}<br/><b>${(p[0].value / 10000).toFixed(1)}万</b>` },
    grid: { top: 24, right: 16, bottom: 24, left: 56 },
    xAxis: { type: "category", data: ["1月","2月","3月","4月","5月","6月"], axisLine: { lineStyle: { color: "#e5e7eb" } }, axisLabel: { fontSize: 11, color: "#6b7280" } },
    yAxis: { type: "value", axisLabel: { formatter: (v) => (v / 10000).toFixed(0) + "万", fontSize: 10, color: "#6b7280" }, splitLine: { lineStyle: { color: "#f3f4f6" } } },
    series: [{
      type: "line",
      data: (data || []).map((v) => v),
      smooth: true,
      areaStyle: { color: "rgba(26,58,92,0.12)" },
      lineStyle: { color: "#1a3a5c", width: 2 },
      itemStyle: { color: "#1a3a5c" },
      symbol: "circle",
      symbolSize: 5,
    }],
  });

  const buildActivityOption = (scores) => ({
    tooltip: {},
    radar: {
      indicator: [
        { name: "1月", max: 100 },
        { name: "2月", max: 100 },
        { name: "3月", max: 100 },
        { name: "4月", max: 100 },
        { name: "5月", max: 100 },
        { name: "6月", max: 100 },
      ],
      radius: "60%",
      name: { textStyle: { fontSize: 10, color: "#6b7280" } },
      splitLine: { lineStyle: { color: "#e5e7eb" } },
      splitArea: { areaStyle: { color: ["#fff", "#fafafa"] } },
    },
    series: [{
      type: "radar",
      data: [{
        value: scores || [0,0,0,0,0,0],
        name: "活跃度",
        areaStyle: { color: "rgba(22,93,255,0.2)" },
        lineStyle: { color: "#165dff", width: 2 },
        itemStyle: { color: "#165dff" },
      }],
    }],
  });

  const buildChannelOption = (pref) => {
    const channelMap = { 手机银行: 45, 网上银行: 22, 网点: 18, 混合: 15 };
    const val = channelMap[pref] || 30;
    return {
      tooltip: { formatter: "{b}: {c}%", trigger: "item" },
      series: [{
        type: "pie",
        radius: ["45%", "68%"],
        center: ["50%", "50%"],
        label: { show: true, formatter: "{b}\n{c}%", fontSize: 11 },
        data: [
          { value: val, name: pref || "未知" },
          { value: 100 - val, name: "其他渠道" },
        ],
        color: ["#1a3a5c", "#e5e7eb"],
      }],
    };
  };

  // ── 个人画像详情 ──
  const renderPersonalProfile = (p) => {
    const flowData = p.financial_behavior?.monthly_flow_trend || [];
    const activityData = p.financial_behavior?.activity_scores_6m || [];
    const channelPref = p.financial_behavior?.channel_preference || "未知";
    const loginDays = p.financial_behavior?.app_login_days_30 || 0;
    const transferFreq = p.financial_behavior?.transfer_frequency || "未知";

    return (
      <div>
        {/* 基本信息 */}
        <Card title="基本信息" style={{ marginBottom: 16 }}>
          <Descriptions column={3} size="small" bordered>
            <Descriptions.Item label="姓名">{p.basic_info?.name}</Descriptions.Item>
            <Descriptions.Item label="手机">{p.basic_info?.phone}</Descriptions.Item>
            <Descriptions.Item label="职业">{p.basic_info?.occupation}</Descriptions.Item>
            <Descriptions.Item label="所属机构">{p.basic_info?.branch}</Descriptions.Item>
            <Descriptions.Item label="主办客户经理">{p.basic_info?.manager_name}</Descriptions.Item>
            <Descriptions.Item label="开户时间">{p.basic_info?.account_open_date}</Descriptions.Item>
            <Descriptions.Item label="AUM"><strong style={{ color: "#1a3a5c", fontSize: 16 }}>{formatMoney(p.aum)}</strong></Descriptions.Item>
            <Descriptions.Item label="资产等级"><Tag color={TAG_COLORS[p.asset_level]}>{p.asset_level}</Tag></Descriptions.Item>
            <Descriptions.Item label="生命周期"><Tag color={TAG_COLORS[p.lifecycle]}>{p.lifecycle}</Tag></Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 持有产品 + 存款明细 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          {/* 持有产品 */}
          <Col span={12}>
            <Card title="持有产品">
              {p.products?.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>产品类型</th>
                      <th style={{ textAlign: "right", padding: "6px 8px", borderBottom: "1px solid #e5e7eb" }}>余额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.products.map((pr, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "6px 8px" }}>{pr.type}</td>
                        <td style={{ textAlign: "right", padding: "6px 8px", color: "#1a3a5c" }}>{formatMoney(pr.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div style={{ color: "#9ca3af" }}>暂无持有产品</div>}
              {p.product_expiring && (
                <div style={{ marginTop: 12, padding: "8px 12px", background: "#fff7ed", borderRadius: 6, border: "1px solid #fed7aa" }}>
                  <div style={{ fontSize: 12, color: "#c2410c", fontWeight: 600 }}>⚠️ 产品到期提醒</div>
                  <div style={{ fontSize: 13, color: "#7c2d12", marginTop: 4 }}>
                    {p.product_expiring.product_type} · {formatMoney(p.product_expiring.balance)} · {p.product_expiring.days_left}天后到期
                  </div>
                </div>
              )}
            </Card>
          </Col>

          {/* 存款明细 */}
          <Col span={12}>
            <Card title="存款明细">
              {p.deposits ? (
                <div>
                  <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    {[
                      { label: "活期存款", value: p.deposits.current, color: "#165dff" },
                      { label: "定期存款", value: p.deposits.term, color: "#1a3a5c" },
                      { label: "大额存单", value: p.deposits.large_certificate, color: "#c9a84c" },
                    ].map((item) => (
                      <div key={item.label} style={{ flex: 1, padding: "10px 12px", background: "#f9fafb", borderRadius: 8, textAlign: "center", border: "1px solid #e5e7eb" }}>
                        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{item.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: item.color }}>{formatMoney(item.value)}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, color: "#374151", padding: "6px 0", borderTop: "1px solid #f3f4f6" }}>
                    存款合计：<strong style={{ color: "#1a3a5c" }}>{formatMoney((p.deposits.current || 0) + (p.deposits.term || 0) + (p.deposits.large_certificate || 0))}</strong>
                  </div>
                </div>
              ) : <div style={{ color: "#9ca3af" }}>暂无存款信息</div>}
            </Card>
          </Col>
        </Row>

        {/* 贷款 */}
        {p.loans && p.loans.balance > 0 && (
          <Card title="贷款信息" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ textAlign: "center", padding: "12px 20px", background: "#fef2f2", borderRadius: 8, flex: 1 }}>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>贷款余额</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#f53f3f" }}>{formatMoney(p.loans.balance)}</div>
              </div>
              <div style={{ textAlign: "center", padding: "12px 20px", background: "#f0f9ff", borderRadius: 8, flex: 1 }}>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>贷款类型</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#165dff" }}>{p.loans.type || "—"}</div>
              </div>
              <div style={{ textAlign: "center", padding: "12px 20px", background: "#f0fdf4", borderRadius: 8, flex: 1 }}>
                <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 6 }}>还款状态</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#00b42a" }}>{p.loans.status || "正常"}</div>
              </div>
            </div>
          </Card>
        )}

        {/* 金融行为 */}
        <Card title="金融行为分析" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={10}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, fontWeight: 600 }}>近6月净流入趋势（万元）</div>
              <ReactECharts option={buildFlowTrendOption(flowData)} style={{ height: 160 }} />
            </Col>
            <Col span={8}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8, fontWeight: 600 }}>活跃度雷达（6个月）</div>
              <ReactECharts option={buildActivityOption(activityData)} style={{ height: 160 }} />
            </Col>
            <Col span={6}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ padding: "10px 12px", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>转账频率</div>
                  <Tag color={{ 低: "gray", 中: "blue", 高: "green" }[transferFreq] || "gray"}>{transferFreq}</Tag>
                </div>
                <div style={{ padding: "10px 12px", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>渠道偏好</div>
                  <Tag color="arcoblue">{channelPref}</Tag>
                </div>
                <div style={{ padding: "10px 12px", background: "#f9fafb", borderRadius: 8, border: "1px solid #e5e7eb" }}>
                  <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>近30天App登录</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: loginDays > 15 ? "#00b42a" : loginDays > 5 ? "#165dff" : "#f53f3f" }}>{loginDays} <span style={{ fontSize: 12, fontWeight: 400, color: "#6b7280" }}>天</span></div>
                </div>
              </div>
            </Col>
          </Row>
        </Card>

        {/* 标签与风险 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <Card title="客户标签">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                <Tag color={TAG_COLORS[p.asset_level]}>{p.asset_level}</Tag>
                <Tag color={TAG_COLORS[p.lifecycle]}>{p.lifecycle}</Tag>
                <Tag color={TAG_COLORS[p.tags?.risk_preference]}>{p.tags?.risk_preference}</Tag>
                <Tag color={TAG_COLORS[p.tags?.marketing_response]}>{p.tags?.marketing_response}</Tag>
              </div>
              <div style={{ fontSize: 13, color: "#374151" }}>
                <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                  流失概率：
                  <Progress percent={Math.round(p.tags?.churn_probability * 100)} size="small" showText status={p.tags?.churn_probability > 0.5 ? "error" : "normal"} style={{ display: "inline-flex", width: 120 }} />
                </div>
                <div>风险偏好：<Tag size="small" color={TAG_COLORS[p.tags?.risk_preference]}>{p.tags?.risk_preference}</Tag></div>
                <div style={{ marginTop: 4 }}>营销响应：<Tag size="small" color={TAG_COLORS[p.tags?.marketing_response]}>{p.tags?.marketing_response}</Tag></div>
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="风险信息">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="信用评级">{p.risk_info?.credit_rating || "未知"}</Descriptions.Item>
                <Descriptions.Item label="逾期记录">{p.risk_info?.overdue_records || "无"}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>

        {/* 事件 & 触达历史 */}
        <Row gutter={16}>
          <Col span={12}>
            <Card title="触发事件">
              <EventTabs events={p.events || []} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="最近触达">
              {p.contact_history?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[...p.contact_history].reverse().map((c, i) => (
                    <div key={i} style={{ fontSize: 13, padding: "8px 12px", background: "#f9fafb", borderRadius: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#6b7280" }}>
                        <span>{c.date}</span>
                        <Tag size="small">{c.channel}</Tag>
                      </div>
                      <div style={{ marginTop: 4, color: "#374151" }}>{c.content}</div>
                      <div style={{ marginTop: 2, fontSize: 12, color: c.response === "有意向" ? "#00b42a" : "#6b7280" }}>响应：{c.response}</div>
                    </div>
                  ))}
                </div>
              ) : <div style={{ color: "#9ca3af" }}>暂无触达记录</div>}
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  // ── 事件 Tab 组件 ──
  const EventTabs = ({ events }) => {
    const [eventTab, setEventTab] = useState("all");
    const high = (events || []).filter((e) => e.priority === "high");
    const medium = (events || []).filter((e) => e.priority === "medium");
    const all = events || [];

    const renderList = (list) => {
      if (!list || list.length === 0) return <div style={{ color: "#9ca3af", fontSize: 13 }}>暂无</div>;
      return list.map((e, i) => (
        <div key={i} style={{
          padding: "8px 12px",
          background: e.priority === "high" ? "#fef2f2" : "#f0f9ff",
          borderRadius: 6,
          borderLeft: `3px solid ${e.priority === "high" ? "#f53f3f" : "#165dff"}`,
          marginBottom: 8,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1a212a" }}>{e.description}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{e.action}</div>
          {e.type && <Tag size="small" style={{ marginTop: 4 }}>{e.type}</Tag>}
        </div>
      ));
    };

    return (
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[
            { key: "all", label: `全部 (${all.length})`, color: "#1a3a5c" },
            { key: "high", label: `高优 (${high.length})`, color: "#f53f3f" },
            { key: "medium", label: `中优 (${medium.length})`, color: "#165dff" },
          ].map((t) => (
            <div
              key={t.key}
              onClick={() => setEventTab(t.key)}
              style={{
                padding: "4px 10px",
                borderRadius: 20,
                fontSize: 12,
                cursor: "pointer",
                background: eventTab === t.key ? t.color : "#f3f4f6",
                color: eventTab === t.key ? "#fff" : "#6b7280",
              }}
            >
              {t.label}
            </div>
          ))}
        </div>
        {eventTab === "all" && renderList(all)}
        {eventTab === "high" && renderList(high)}
        {eventTab === "medium" && renderList(medium)}
      </div>
    );
  };

  // ── 企业画像 ──
  const renderEnterpriseProfile = (p) => (
    <div>
      <Card title="企业基本信息" style={{ marginBottom: 16 }}>
        <Descriptions column={3} size="small" bordered>
          <Descriptions.Item label="企业名称">{p.basic_info?.name}</Descriptions.Item>
          <Descriptions.Item label="所属行业">{p.basic_info?.industry}</Descriptions.Item>
          <Descriptions.Item label="注册资本">{formatMoney(p.basic_info?.registered_capital)}</Descriptions.Item>
          <Descriptions.Item label="实际控制人">{p.basic_info?.actual_controller}</Descriptions.Item>
          <Descriptions.Item label="员工规模">{p.basic_info?.employee_count}人</Descriptions.Item>
          <Descriptions.Item label="成立日期">{p.basic_info?.established_date}</Descriptions.Item>
          {p.basic_info?.group && <Descriptions.Item label="关联集团">{p.basic_info.group}</Descriptions.Item>}
        </Descriptions>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card title="授信与存款">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="授信额度">{formatMoney(p.financial?.credit_limit)}</Descriptions.Item>
              <Descriptions.Item label="已用额度">{formatMoney(p.financial?.credit_used)}</Descriptions.Item>
              <Descriptions.Item label="可用额度"><span style={{ color: "#00b42a" }}>{formatMoney(p.financial?.credit_available)}</span></Descriptions.Item>
              <Descriptions.Item label="存款沉淀">{formatMoney(p.financial?.deposit_balance)}</Descriptions.Item>
              <Descriptions.Item label="他行贷款">{p.financial?.other_bank_loans}</Descriptions.Item>
              <Descriptions.Item label="年营收估算">{formatMoney(p.financial?.annual_revenue)}</Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="风险信息">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="征信状态"><Tag color={{ 正常: "green", 关注: "orange", 异常: "red" }[p.risk?.credit_report] || "gray"}>{p.risk?.credit_report}</Tag></Descriptions.Item>
              <Descriptions.Item label="涉诉情况">{p.risk?.litigation_count}件 {p.risk?.litigation_amount > 0 ? "(涉案" + formatMoney(p.risk?.litigation_amount) + ")" : ""}</Descriptions.Item>
              <Descriptions.Item label="舆情">
                <Tag color={{ 正面: "green", 中性: "gray", 负面: "red" }[p.risk?.sentiment] || "gray"}>{p.risk?.sentiment}</Tag>
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 13, color: "#374151", marginBottom: 6 }}>授信使用率</div>
              <Progress percent={p.financial?.credit_limit > 0 ? Math.round((p.financial?.credit_used / p.financial?.credit_limit) * 100) : 0} status={p.financial?.credit_used / p.financial?.credit_limit > 0.7 ? "error" : "normal"} />
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        {/* 业务行为 */}
        <Col span={12}>
          <Card title="业务行为">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "结算活跃度", value: p.financial_behavior?.settlement_activity || "未知", color: "#165dff" },
                { label: "代发工资人数", value: p.financial_behavior?.payroll_employees > 0 ? p.financial_behavior.payroll_employees + "人" : "未开通", color: "#1a3a5c" },
                { label: "票据年发生额", value: p.financial_behavior?.annual_bill_amount > 0 ? formatMoney(p.financial_behavior.annual_bill_amount) : "无", color: "#c9a84c" },
                { label: "跨境业务", value: p.financial_behavior?.cross_border ? "是" : "否", color: p.financial_behavior?.cross_border ? "#00b42a" : "#9ca3af" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "#f9fafb", borderRadius: 6 }}>
                  <span style={{ fontSize: 13, color: "#6b7280" }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: item.color }}>{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        {/* 关联关键人 */}
        <Col span={12}>
          <Card title="关联关键人">
            {(p.key_persons || []).map((kp, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: i < (p.key_persons || []).length - 1 ? "1px solid #f3f4f6" : "none" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#1a3a5c", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                  {kp.name?.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1a212a" }}>{kp.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{kp.role}</div>
                  <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{kp.phone}</div>
                </div>
                <Tag size="small" color="arcoblue">{kp.role}</Tag>
              </div>
            ))}
            {(!p.key_persons || p.key_persons.length === 0) && (
              <div style={{ color: "#9ca3af", fontSize: 13 }}>暂无关联关键人</div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card title="业务覆盖">
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>已覆盖产品</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(p.covered_products || []).map((pr, i) => <Tag key={i} color="blue">{pr}</Tag>)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>可拓展产品</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(p.uncovered_products || []).map((pr, i) => <Tag key={i} color="orange">{pr}</Tag>)}
              </div>
            </div>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="业务机会">
            {(p.suggestions || []).map((s, i) => (
              <div key={i} style={{ fontSize: 13, color: "#374151", padding: "6px 0", borderBottom: "1px solid #f3f4f6", display: "flex", gap: 8 }}>
                <span style={{ color: "#1a3a5c", fontWeight: 700 }}>·</span>
                <span>{s}</span>
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      {/* 触发事件 */}
      <Card title="触发事件">
        <EventTabs events={p.events || []} />
      </Card>
    </div>
  );

  return (
    <div style={{ display: "flex", gap: 16, height: "calc(100vh - 104px)" }}>
      {/* 左侧客户列表 */}
      <div style={{ width: 420, display: "flex", flexDirection: "column", gap: 12 }}>
        <Card style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ marginBottom: 12 }}>
            <Tabs activeKey={tab} onChange={(k) => { setTab(k); setSelectedId(null); setProfileData(null); }}>
              <Tabs.Tab title="个人客户" key="personal" />
              <Tabs.Tab title="企业客户" key="enterprise" />
            </Tabs>
            <Search
              placeholder="搜索客户姓名 / ID"
              value={search}
              onChange={setSearch}
              onSearch={() => fetchList()}
              allowClear
              style={{ marginTop: 8 }}
            />
            {/* 筛选 */}
            {tab === "personal" && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <Select
                  placeholder="资产等级"
                  allowClear
                  onChange={(v) => setFilters((f) => ({ ...f, asset_level: v }))}
                  options={[{ label: "大众客户", value: "大众客户" }, { label: "成长型客户", value: "成长型客户" }, { label: "中端客户", value: "中端客户" }, { label: "高净值客户", value: "高净值客户" }]}
                  style={{ flex: 1, fontSize: 12 }}
                />
                <Select
                  placeholder="生命周期"
                  allowClear
                  onChange={(v) => setFilters((f) => ({ ...f, lifecycle: v }))}
                  options={[{ label: "新客户", value: "新客户" }, { label: "成熟期", value: "成熟期" }, { label: "衰退期", value: "衰退期" }, { label: "流失预警", value: "流失预警" }]}
                  style={{ flex: 1, fontSize: 12 }}
                />
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                <Spin />
              </div>
            ) : (
              <Table
                columns={tab === "personal" ? personalColumns : enterpriseColumns}
                data={listData.data || []}
                size="small"
                rowKey="id"
                selectedRowKeys={[selectedId]}
                onRow={(record) => ({
                  onClick: () => selectCustomer(record.id),
                  style: { cursor: "pointer" },
                })}
                rowClassName={() => "clickable-row"}
                pagination={false}
                style={{ fontSize: 13 }}
              />
            )}
          </div>
          {listData.total > 0 && (
            <Pagination
              current={currentPage}
              pageSize={20}
              total={listData.total}
              onChange={(page) => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              size="small"
              showTotal={(total) => `共 ${total} 条`}
              style={{ marginTop: 8 }}
            />
          )}
        </Card>
      </div>

      {/* 右侧画像 */}
      <div style={{ flex: 1, overflow: "auto" }}>
        {profileLoading ? (
          <Card><div style={{ display: "flex", justifyContent: "center", padding: 80 }}><Spin size={40} /></div></Card>
        ) : profileData ? (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#1a212a" }}>
                {tab === "personal" ? "个人" : "企业"}客户画像
              </div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                {profileData.id}
              </div>
            </div>
            {tab === "personal" ? renderPersonalProfile(profileData) : renderEnterpriseProfile(profileData)}
          </div>
        ) : (
          <Card>
            <div style={{ textAlign: "center", padding: 80, color: "#9ca3af" }}>
              请从左侧选择客户查看画像
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
