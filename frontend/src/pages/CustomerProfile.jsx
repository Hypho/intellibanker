import React, { useState, useEffect, useRef } from "react";
import { api } from "../api/client";
import {
  Card, Select, Input, Tabs, Tag, Spin, Message, Progress, Grid, Badge, Pagination, Button, Tooltip,
} from "@arco-design/web-react";
import { IconSearch, IconLeft, IconRight, IconUser, IconStar, IconSafe, IconClockCircle, IconPhone, IconStorage, IconCalendar, IconApps } from "@arco-design/web-react/icon";
import ReactECharts from "echarts-for-react";
import { C, FONT_DISPLAY, FONT_MONO, GRADIENT_HERO, GRADIENT_ACCENT, GRADIENT_SUBTLE, RADIUS, SECTION_STYLE, formatMoney, TAG_COLORS } from "../theme";
import { Section, MetricCard, DataRow } from "../components/SharedWidgets";

const { Row, Col } = Grid;

export default function CustomerProfile({ role, roleConfig, externalTarget, onTargetConsumed }) {
  const [tab, setTab] = useState("personal");
  const [loading, setLoading] = useState(false);
  const [listData, setListData] = useState({ data: [], total: 0 });
  const [selectedId, setSelectedId] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [aiNarrative, setAiNarrative] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(() => {
    if (roleConfig?.managerId) return { manager_id: roleConfig.managerId };
    return {};
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [returnTo, setReturnTo] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Single ref coordinating external navigation — replaces pendingExternalRef + skipSearchEffectRef
  const externalNavRef = useRef({ pending: false, skipSearch: false });

  useEffect(() => {
    if (externalTarget?.id) {
      externalNavRef.current.pending = true;
      setSelectedId(externalTarget.id);
      if (externalTarget.name) {
        externalNavRef.current.skipSearch = true;
        setSearch(externalTarget.name);
      }
      if (tab !== "personal") setTab("personal");
      selectCustomer(externalTarget.id, "personal");
      fetchList(1, externalTarget.name || "").finally(() => {
        externalNavRef.current.pending = false;
      });
      if (onTargetConsumed) onTargetConsumed();
    }
  }, [externalTarget]);

  useEffect(() => {
    if (externalNavRef.current.skipSearch) {
      externalNavRef.current.skipSearch = false;
      return;
    }
    setCurrentPage(1);
    fetchList(1);
  }, [tab, filters, search]);

  useEffect(() => {
    if (currentPage > 1) fetchList(currentPage);
  }, [currentPage]);

  const fetchList = async (page, searchOverride) => {
    const p = page || currentPage;
    const s = searchOverride !== undefined ? searchOverride : search;
    setLoading(true);
    try {
      const res = tab === "personal"
        ? await api.listPersonalProfiles({ page: p, page_size: 20, search: s, ...filters })
        : await api.listEnterpriseProfiles({ page: p, page_size: 20, search: s, ...filters });
      setListData(res);
      if (res.data.length > 0 && !selectedId && !externalNavRef.current.pending) {
        selectCustomer(res.data[0].id);
      }
    } catch (e) {
      Message.error("加载失败：" + e.message);
    } finally {
      setLoading(false);
    }
  };

  const selectCustomer = async (id, overrideTab) => {
    const type = overrideTab || tab;
    setSelectedId(id);
    setProfileLoading(true);
    setAiNarrative("");
    try {
      const res = await api.getProfile(type, id);
      setProfileData(res);
      // 异步加载AI叙事，不阻塞主画像
      api.getAiNarrative(type, id).then((d) => setAiNarrative(d.ai_narrative || "")).catch(() => {});
    } catch (e) {
      Message.error("加载画像失败");
      setProfileData(null);
    } finally {
      setProfileLoading(false);
    }
  };

  // ── ECharts configs ──
  const buildFlowTrendOption = (data) => ({
    tooltip: { trigger: "axis", formatter: (p) => `${p[0].name}<br/><b>${(p[0].value / 10000).toFixed(1)}万</b>` },
    grid: { top: 20, right: 12, bottom: 20, left: 48 },
    xAxis: { type: "category", data: ["1月","2月","3月","4月","5月","6月"], axisLine: { lineStyle: { color: "#e5e7eb" } }, axisLabel: { fontSize: 11, color: "#94a3b8" } },
    yAxis: { type: "value", axisLabel: { formatter: (v) => (v / 10000).toFixed(0) + "万", fontSize: 10, color: "#94a3b8" }, splitLine: { lineStyle: { color: "#f3f4f6" } } },
    series: [{
      type: "line", data: (data || []), smooth: true,
      areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(26,58,92,0.18)" }, { offset: 1, color: "rgba(26,58,92,0)" }] } },
      lineStyle: { color: "#1a3a5c", width: 2.5 }, itemStyle: { color: "#1a3a5c" }, symbol: "circle", symbolSize: 6,
    }],
  });

  const buildActivityOption = (scores) => ({
    tooltip: {},
    radar: {
      indicator: [{ name: "1月", max: 100 }, { name: "2月", max: 100 }, { name: "3月", max: 100 }, { name: "4月", max: 100 }, { name: "5月", max: 100 }, { name: "6月", max: 100 }],
      radius: "60%", name: { textStyle: { fontSize: 10, color: "#94a3b8" } },
      splitLine: { lineStyle: { color: "#e5e7eb" } }, splitArea: { areaStyle: { color: ["#fff", "#fafbfc"] } },
      axisLine: { lineStyle: { color: "#e5e7eb" } },
    },
    series: [{
      type: "radar",
      data: [{ value: scores || [0,0,0,0,0,0], name: "活跃度",
        areaStyle: { color: "rgba(22,93,255,0.15)" }, lineStyle: { color: "#165dff", width: 2 }, itemStyle: { color: "#165dff" },
      }],
    }],
  });

  // ── Sidebar customer card ──
  const CustomerCard = ({ item, isSelected, onClick }) => {
    const isPersonal = tab === "personal";
    return (
      <div
        onClick={onClick}
        data-testid="customer-card"
        style={{
          padding: "12px 14px", cursor: "pointer",
          background: isSelected ? "linear-gradient(135deg, #1a3a5c 0%, #234b73 100%)" : "transparent",
          borderRadius: 10, transition: "all 0.2s ease",
          border: isSelected ? "1px solid rgba(201,168,76,0.3)" : "1px solid transparent",
          marginBottom: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: isSelected ? "rgba(255,255,255,0.15)" : "linear-gradient(135deg, #e8ecf1 0%, #dde3ea 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 700,
            color: isSelected ? "#c9a84c" : "#1a3a5c",
            flexShrink: 0,
          }}>
            {(item.name || "").charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: isSelected ? "#ffffff" : "#1a212a",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {item.name}
              </span>
              {isPersonal && (
                <span style={{
                  fontSize: 11, fontWeight: 600, color: isSelected ? "#c9a84c" : "#1a3a5c",
                  fontFamily: FONT_DISPLAY,
                }}>
                  {item.aum >= 10000 ? (item.aum / 10000).toFixed(0) + "万" : item.aum?.toLocaleString()}
                </span>
              )}
              {!isPersonal && (
                <span style={{ fontSize: 11, color: isSelected ? "rgba(255,255,255,0.6)" : "#94a3b8" }}>
                  {item.industry}
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontFamily: "monospace", fontSize: 10.5, color: isSelected ? "rgba(255,255,255,0.45)" : "#b0b8c4" }}>{item.id}</span>
              {isPersonal && item.asset_level && (
                <span style={{
                  fontSize: 10, padding: "1px 6px", borderRadius: 4,
                  background: isSelected ? "rgba(201,168,76,0.2)" : (TAG_COLORS[item.asset_level] || "#94a3b8") + "18",
                  color: isSelected ? "#c9a84c" : (TAG_COLORS[item.asset_level] || "#94a3b8"),
                  fontWeight: 600,
                }}>
                  {item.asset_level}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Personal Profile ──
  const renderPersonalProfile = (p) => {
    const flowData = p.financial_behavior?.monthly_flow_trend || [];
    const activityData = p.financial_behavior?.activity_scores_6m || [];
    const channelPref = p.financial_behavior?.channel_preference || "未知";
    const loginDays = p.financial_behavior?.app_login_days_30 || 0;
    const transferFreq = p.financial_behavior?.transfer_frequency || "未知";
    const totalDeposit = (p.deposits?.current || 0) + (p.deposits?.term || 0) + (p.deposits?.large_certificate || 0);

    return (
      <div>
        {/* Hero header */}
        <div style={{
          background: GRADIENT_HERO,
          borderRadius: 14, padding: "28px 28px 24px", marginBottom: 20,
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -40, right: -20, width: 180, height: 180, borderRadius: "50%", background: "rgba(201,168,76,0.06)" }} />
          <div style={{ position: "absolute", bottom: -60, right: 60, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: RADIUS.xl,
                  background: GRADIENT_ACCENT,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 700, color: "#fff", fontFamily: FONT_DISPLAY,
                  boxShadow: "0 4px 12px rgba(201,168,76,0.3)",
                }}>
                  {(p.basic_info?.name || "").charAt(0)}
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#ffffff", letterSpacing: "0.03em" }}>{p.basic_info?.name}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{p.id} · {p.basic_info?.occupation}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[p.asset_level, p.lifecycle, p.tags?.risk_preference, p.tags?.marketing_response].filter(Boolean).map((t, i) => (
                  <span key={i} style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 6,
                    background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)",
                    fontWeight: 500, backdropFilter: "blur(4px)",
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4, fontWeight: 500 }}>AUM 总资产</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: "#c9a84c", fontFamily: FONT_DISPLAY, lineHeight: 1.1 }}>
                {formatMoney(p.aum)}
              </div>
            </div>
          </div>
        </div>

        {/* AI Narrative */}
        {aiNarrative && (
          <div style={{
            padding: "14px 18px", marginBottom: 20, borderRadius: RADIUS.md,
            background: `linear-gradient(135deg, ${C.primary}08, ${C.accent}08)`,
            border: `1px solid ${C.accent}30`, position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.primary}, ${C.accent})` }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>AI 画像摘要</span>
              <span style={{ fontSize: 10, color: C.textDim, padding: "2px 8px", borderRadius: 4, background: `${C.accent}15` }}>DeepSeek</span>
            </div>
            <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.7 }}>{aiNarrative}</div>
          </div>
        )}

        {/* Quick metrics */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <MetricCard label="存款合计" value={formatMoney(totalDeposit)} color="#1a3a5c" />
          <MetricCard label="贷款余额" value={p.loans?.balance > 0 ? formatMoney(p.loans.balance) : "—"} color={p.loans?.balance > 0 ? "#ef4444" : "#94a3b8"} />
          <MetricCard label="持有产品" value={p.products?.length || 0} unit="个" color="#3b82f6" />
          <MetricCard label="流失概率" value={Math.round((p.tags?.churn_probability || 0) * 100)} unit="%" color={p.tags?.churn_probability > 0.5 ? "#ef4444" : "#22c55e"} />
          <MetricCard label="App登录" value={loginDays} unit="天/月" color={loginDays > 15 ? "#22c55e" : loginDays > 5 ? "#3b82f6" : "#ef4444"} />
        </div>

        {/* Products & Deposits */}
        <Row gutter={20}>
          <Col span={12}>
            <Section title="持有产品" icon={<IconApps />}>
              {p.products?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {p.products.map((pr, i) => (
                    <div key={i} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 14px", background: "#f8f9fb", borderRadius: 8,
                    }}>
                      <span style={{ fontSize: 13, color: "#4a5568", fontWeight: 500 }}>{pr.type}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#1a3a5c", fontFamily: FONT_DISPLAY }}>{formatMoney(pr.balance)}</span>
                    </div>
                  ))}
                </div>
              ) : <div style={{ color: "#b0b8c4", fontSize: 13, textAlign: "center", padding: 20 }}>暂无持有产品</div>}
              {p.product_expiring && (
                <div style={{
                  marginTop: 12, padding: "10px 14px",
                  background: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 100%)",
                  borderRadius: 8, border: "1px solid #fed7aa",
                }}>
                  <div style={{ fontSize: 12, color: "#c2410c", fontWeight: 600, marginBottom: 2 }}>产品到期提醒</div>
                  <div style={{ fontSize: 13, color: "#7c2d12" }}>
                    {p.product_expiring.product_type} · {formatMoney(p.product_expiring.balance)} · <strong>{p.product_expiring.days_left}天</strong>后到期
                  </div>
                </div>
              )}
            </Section>
          </Col>
          <Col span={12}>
            <Section title="存款结构" icon={<IconStorage />}>
              {p.deposits ? (
                <div>
                  <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                    {[
                      { label: "活期", value: p.deposits.current, color: "#3b82f6" },
                      { label: "定期", value: p.deposits.term, color: "#1a3a5c" },
                      { label: "大额存单", value: p.deposits.large_certificate, color: "#c9a84c" },
                    ].map((item) => (
                      <div key={item.label} style={{
                        flex: 1, padding: "12px 10px", background: "#f8f9fb", borderRadius: 8,
                        textAlign: "center", border: "1px solid #eef0f3",
                      }}>
                        <div style={{ fontSize: 11, color: "#8896a6", marginBottom: 6 }}>{item.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: item.color, fontFamily: FONT_DISPLAY }}>{formatMoney(item.value)}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 14px", background: "linear-gradient(135deg, #f0f4ff 0%, #f8f9fb 100%)",
                    borderRadius: 8, border: "1px solid #e0e7ff",
                  }}>
                    <span style={{ fontSize: 13, color: "#6b7280" }}>存款合计</span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#1a3a5c", fontFamily: FONT_DISPLAY }}>{formatMoney(totalDeposit)}</span>
                  </div>
                </div>
              ) : <div style={{ color: "#b0b8c4", fontSize: 13, textAlign: "center", padding: 20 }}>暂无存款</div>}
            </Section>
          </Col>
        </Row>

        {/* Loans */}
        {p.loans?.balance > 0 && (
          <Section title="贷款信息" icon={<IconSafe />}>
            <div style={{ display: "flex", gap: 14 }}>
              <MetricCard label="贷款余额" value={formatMoney(p.loans.balance)} color="#ef4444" bg="#fef2f2" />
              <MetricCard label="贷款类型" value={p.loans.type || "—"} color="#3b82f6" bg="#eff6ff" />
              <MetricCard label="还款状态" value={p.loans.status || "正常"} color="#22c55e" bg="#f0fdf4" />
            </div>
          </Section>
        )}

        {/* Financial Behavior */}
        <Section title="金融行为分析" icon={<IconStar />}>
          <Row gutter={20}>
            <Col span={10}>
              <div style={{ fontSize: 11, color: "#8896a6", marginBottom: 8, fontWeight: 600 }}>近6月净流入趋势</div>
              <ReactECharts option={buildFlowTrendOption(flowData)} style={{ height: 180 }} />
            </Col>
            <Col span={8}>
              <div style={{ fontSize: 11, color: "#8896a6", marginBottom: 8, fontWeight: 600 }}>活跃度雷达</div>
              <ReactECharts option={buildActivityOption(activityData)} style={{ height: 180 }} />
            </Col>
            <Col span={6}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <DataRow label="转账频率" value={<Tag size="small" color={{ 低: "gray", 中: "blue", 高: "green" }[transferFreq]}>{transferFreq}</Tag>} />
                <DataRow label="渠道偏好" value={<Tag size="small" color="arcoblue">{channelPref}</Tag>} />
                <DataRow label="App登录" value={<span style={{ fontWeight: 700, color: loginDays > 15 ? "#22c55e" : loginDays > 5 ? "#3b82f6" : "#ef4444" }}>{loginDays}天</span>} />
              </div>
            </Col>
          </Row>
        </Section>

        {/* Tags & Risk */}
        <Row gutter={20}>
          <Col span={12}>
            <Section title="客户标签" icon={<IconUser />}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                {[
                  { label: p.asset_level, color: TAG_COLORS[p.asset_level] },
                  { label: p.lifecycle, color: TAG_COLORS[p.lifecycle] },
                  { label: p.tags?.risk_preference, color: TAG_COLORS[p.tags?.risk_preference] },
                  { label: p.tags?.marketing_response, color: TAG_COLORS[p.tags?.marketing_response] },
                ].filter(t => t.label).map((t, i) => (
                  <span key={i} style={{
                    fontSize: 12, padding: "4px 12px", borderRadius: 6,
                    background: (t.color || "#94a3b8") + "15", color: t.color || "#94a3b8",
                    fontWeight: 600, border: `1px solid ${(t.color || "#94a3b8")}30`,
                  }}>
                    {t.label}
                  </span>
                ))}
              </div>
              <DataRow label="流失概率" value={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Progress percent={Math.round((p.tags?.churn_probability || 0) * 100)} size="small" status={p.tags?.churn_probability > 0.5 ? "error" : "normal"} style={{ width: 100 }} />
                  <span style={{ fontSize: 12, color: p.tags?.churn_probability > 0.5 ? "#ef4444" : "#22c55e", fontWeight: 600 }}>
                    {Math.round((p.tags?.churn_probability || 0) * 100)}%
                  </span>
                </div>
              } />
              <DataRow label="风险偏好" value={p.tags?.risk_preference} />
              <DataRow label="营销响应" value={p.tags?.marketing_response} />
            </Section>
          </Col>
          <Col span={12}>
            <Section title="风险信息" icon={<IconSafe />}>
              <DataRow label="信用评级" value={p.risk_info?.credit_rating || "未知"} />
              <DataRow label="逾期记录" value={p.risk_info?.overdue_records || "无"} />
            </Section>
          </Col>
        </Row>

        {/* Events & Contact */}
        <Row gutter={20}>
          <Col span={12}>
            <Section title="触发事件" icon={<IconClockCircle />}>
              <EventTabs events={p.events || []} />
            </Section>
          </Col>
          <Col span={12}>
            <Section title="触达历史" icon={<IconPhone />}>
              {p.contact_history?.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {[...p.contact_history].reverse().slice(0, 5).map((c, i) => (
                    <div key={i} style={{
                      padding: "10px 14px", background: "#f8f9fb", borderRadius: 8,
                      borderLeft: `3px solid ${c.response === "有意向" ? "#22c55e" : "#e5e7eb"}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: "#8896a6" }}>{c.date}</span>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#eef0f3", color: "#6b7280" }}>{c.channel}</span>
                      </div>
                      <div style={{ fontSize: 13, color: "#2d3748", fontWeight: 500 }}>{c.content}</div>
                      <div style={{ fontSize: 12, color: c.response === "有意向" ? "#22c55e" : "#94a3b8", marginTop: 2 }}>{c.response}</div>
                    </div>
                  ))}
                </div>
              ) : <div style={{ color: "#b0b8c4", fontSize: 13, textAlign: "center", padding: 20 }}>暂无触达记录</div>}
            </Section>
          </Col>
        </Row>
      </div>
    );
  };

  // ── Event Tabs ──
  const EventTabs = ({ events }) => {
    const [eventTab, setEventTab] = useState("all");
    const high = (events || []).filter((e) => e.priority === "high");
    const medium = (events || []).filter((e) => e.priority === "medium");
    const all = events || [];

    const renderList = (list) => {
      if (!list || list.length === 0) return <div style={{ color: "#b0b8c4", fontSize: 13, textAlign: "center", padding: 16 }}>暂无</div>;
      return list.map((e, i) => (
        <div key={i} style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 8,
          background: e.priority === "high" ? "#fef2f2" : "#eff6ff",
          borderLeft: `3px solid ${e.priority === "high" ? "#ef4444" : "#3b82f6"}`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1a212a" }}>{e.description}</div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>{e.action}</div>
          {e.type && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, background: "#eef0f3", color: "#6b7280", marginTop: 6, display: "inline-block" }}>{e.type}</span>}
        </div>
      ));
    };

    return (
      <div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          {[
            { key: "all", label: `全部 (${all.length})`, color: "#1a3a5c" },
            { key: "high", label: `高优 (${high.length})`, color: "#ef4444" },
            { key: "medium", label: `中优 (${medium.length})`, color: "#3b82f6" },
          ].map((t) => (
            <div key={t.key} onClick={() => setEventTab(t.key)} style={{
              padding: "5px 14px", borderRadius: 8, fontSize: 12, cursor: "pointer", fontWeight: 500,
              background: eventTab === t.key ? t.color : "#f3f4f6",
              color: eventTab === t.key ? "#fff" : "#6b7280",
              transition: "all 0.15s",
            }}>
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

  // ── Enterprise Profile ──
  const renderEnterpriseProfile = (p) => (
    <div>
      {/* Hero header */}
      <div style={{
        background: "linear-gradient(135deg, #1a3a5c 0%, #0d2137 100%)",
        borderRadius: 14, padding: "28px 28px 24px", marginBottom: 20,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -40, right: -20, width: 180, height: 180, borderRadius: "50%", background: "rgba(201,168,76,0.06)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "relative" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: "linear-gradient(135deg, #c9a84c 0%, #b8962e 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: FONT_DISPLAY,
                boxShadow: "0 4px 12px rgba(201,168,76,0.3)",
              }}>
                {(p.basic_info?.name || "").charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#ffffff", letterSpacing: "0.02em" }}>{p.basic_info?.name}</div>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>{p.id} · {p.basic_info?.industry}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[p.basic_info?.industry, p.risk?.sentiment, p.risk?.credit_report].filter(Boolean).map((t, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: "3px 10px", borderRadius: 6,
                  background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)",
                  fontWeight: 500,
                }}>{t}</span>
              ))}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>注册资本</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#c9a84c", fontFamily: FONT_DISPLAY }}>{formatMoney(p.basic_info?.registered_capital)}</div>
          </div>
        </div>
      </div>

      {/* AI Narrative */}
      {p.ai_narrative && (
        <div style={{
          padding: "14px 18px", marginBottom: 20, borderRadius: RADIUS.md,
          background: `linear-gradient(135deg, ${C.primary}08, ${C.accent}08)`,
          border: `1px solid ${C.accent}30`, position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${C.primary}, ${C.accent})` }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>AI 画像摘要</span>
            <span style={{ fontSize: 10, color: C.textDim, padding: "2px 8px", borderRadius: 4, background: `${C.accent}15` }}>DeepSeek</span>
          </div>
          <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.7 }}>{p.ai_narrative}</div>
        </div>
      )}

      {/* Quick metrics */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
        <MetricCard label="授信额度" value={formatMoney(p.financial?.credit_limit)} color="#1a3a5c" />
        <MetricCard label="已用额度" value={formatMoney(p.financial?.credit_used)} color="#ef4444" />
        <MetricCard label="存款沉淀" value={formatMoney(p.financial?.deposit_balance)} color="#3b82f6" />
        <MetricCard label="年营收" value={formatMoney(p.financial?.annual_revenue)} color="#22c55e" />
      </div>

      <Row gutter={20}>
        <Col span={12}>
          <Section title="企业基本信息" icon={<IconStorage />}>
            <DataRow label="实际控制人" value={p.basic_info?.actual_controller} />
            <DataRow label="员工规模" value={`${p.basic_info?.employee_count}人`} />
            <DataRow label="成立日期" value={p.basic_info?.established_date} />
            {p.basic_info?.group && <DataRow label="关联集团" value={p.basic_info.group} />}
          </Section>
        </Col>
        <Col span={12}>
          <Section title="风险信息" icon={<IconSafe />}>
            <DataRow label="征信状态" value={<Tag size="small" color={{ 正常: "green", 关注: "orange", 异常: "red" }[p.risk?.credit_report]}>{p.risk?.credit_report}</Tag>} />
            <DataRow label="涉诉情况" value={`${p.risk?.litigation_count}件${p.risk?.litigation_amount > 0 ? " (涉案" + formatMoney(p.risk?.litigation_amount) + ")" : ""}`} />
            <DataRow label="舆情" value={<Tag size="small" color={{ 正面: "green", 中性: "gray", 负面: "red" }[p.risk?.sentiment]}>{p.risk?.sentiment}</Tag>} />
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: "#8896a6", marginBottom: 6 }}>授信使用率</div>
              <Progress percent={p.financial?.credit_limit > 0 ? Math.round((p.financial?.credit_used / p.financial?.credit_limit) * 100) : 0} status={p.financial?.credit_used / p.financial?.credit_limit > 0.7 ? "error" : "normal"} />
            </div>
          </Section>
        </Col>
      </Row>

      <Row gutter={20}>
        <Col span={12}>
          <Section title="业务行为" icon={<IconApps />}>
            {[
              { label: "结算活跃度", value: p.financial_behavior?.settlement_activity || "未知", color: "#3b82f6" },
              { label: "代发工资人数", value: p.financial_behavior?.payroll_employees > 0 ? p.financial_behavior.payroll_employees + "人" : "未开通", color: "#1a3a5c" },
              { label: "票据年发生额", value: p.financial_behavior?.annual_bill_amount > 0 ? formatMoney(p.financial_behavior.annual_bill_amount) : "无", color: "#c9a84c" },
              { label: "跨境业务", value: p.financial_behavior?.cross_border ? "是" : "否", color: p.financial_behavior?.cross_border ? "#22c55e" : "#94a3b8" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#f8f9fb", borderRadius: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "#6b7280" }}>{item.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: item.color }}>{item.value}</span>
              </div>
            ))}
          </Section>
        </Col>
        <Col span={12}>
          <Section title="关联关键人" icon={<IconUser />}>
            {(p.key_persons || []).map((kp, i) => (
              <div key={i}
                onClick={() => {
                  if (kp.personal_id) {
                    setReturnTo({ id: p.id, name: p.basic_info?.name });
                    setTab("personal");
                    selectCustomer(kp.personal_id, "personal");
                  }
                }}
                style={{
                  display: "flex", gap: 12, padding: "12px 14px", marginBottom: 8,
                  background: "#f8f9fb", borderRadius: 10, cursor: kp.personal_id ? "pointer" : "default",
                  transition: "all 0.15s", border: "1px solid transparent",
                }}
                onMouseEnter={(e) => { if (kp.personal_id) e.currentTarget.style.border = "1px solid #c9a84c"; }}
                onMouseLeave={(e) => { e.currentTarget.style.border = "1px solid transparent"; }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: "linear-gradient(135deg, #1a3a5c 0%, #234b73 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, fontWeight: 700, color: "#c9a84c", flexShrink: 0,
                }}>
                  {kp.name?.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#1a212a" }}>{kp.name}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{kp.role} · {kp.phone}</div>
                </div>
                {kp.personal_id && (
                  <div style={{
                    fontSize: 11, padding: "4px 10px", borderRadius: 6,
                    background: "linear-gradient(135deg, #c9a84c 0%, #b8962e 100%)",
                    color: "#fff", fontWeight: 600, alignSelf: "center",
                  }}>
                    查看画像 →
                  </div>
                )}
              </div>
            ))}
            {(!p.key_persons || p.key_persons.length === 0) && (
              <div style={{ color: "#b0b8c4", fontSize: 13, textAlign: "center", padding: 20 }}>暂无关联关键人</div>
            )}
          </Section>
        </Col>
      </Row>

      <Row gutter={20}>
        <Col span={12}>
          <Section title="业务覆盖" icon={<IconApps />}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#8896a6", marginBottom: 8, fontWeight: 600 }}>已覆盖产品</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(p.covered_products || []).map((pr, i) => (
                  <span key={i} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, background: "#eff6ff", color: "#3b82f6", fontWeight: 500 }}>{pr}</span>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#8896a6", marginBottom: 8, fontWeight: 600 }}>可拓展产品</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(p.uncovered_products || []).map((pr, i) => (
                  <span key={i} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, background: "#fff7ed", color: "#f59e0b", fontWeight: 500 }}>{pr}</span>
                ))}
              </div>
            </div>
          </Section>
        </Col>
        <Col span={12}>
          <Section title="业务机会" icon={<IconStar />}>
            {(p.suggestions || []).map((s, i) => (
              <div key={i} style={{
                fontSize: 13, color: "#2d3748", padding: "10px 14px",
                background: "#f8f9fb", borderRadius: 8, marginBottom: 8,
                borderLeft: "3px solid #c9a84c",
              }}>
                {s}
              </div>
            ))}
          </Section>
        </Col>
      </Row>

      <Section title="触发事件" icon={<IconClockCircle />}>
        <EventTabs events={p.events || []} />
      </Section>
    </div>
  );

  // ── Main Layout ──
  const sidebarWidth = sidebarCollapsed ? 0 : 340;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 104px)", background: C.bg, gap: 0 }}>
      {/* Sidebar toggle */}
      <div
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        style={{
          width: 28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
          background: C.border, cursor: "pointer", borderRadius: "8px 0 0 8px",
          transition: "all 0.2s",
        }}
      >
        {sidebarCollapsed ? <IconRight style={{ color: "#6b7280", fontSize: 12 }} /> : <IconLeft style={{ color: "#6b7280", fontSize: 12 }} />}
      </div>

      {/* Left sidebar */}
      <div style={{
        width: sidebarWidth, flexShrink: 0, display: "flex", flexDirection: "column",
        background: C.card, borderRight: `1px solid ${C.border}`,
        transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        overflow: "hidden",
      }}>
        <div style={{ padding: "16px 14px 12px", borderBottom: `1px solid ${C.borderLt}` }}>
          <Tabs activeKey={tab} onChange={(k) => {
            if (k !== tab) {
              setTab(k);
              if (!externalNavRef.current.pending) {
                setSelectedId(null);
                setProfileData(null);
              }
            }
          }}
            style={{ marginBottom: 10 }}>
            <Tabs.TabPane title="个人客户" key="personal" />
            <Tabs.TabPane title="企业客户" key="enterprise" />
          </Tabs>
          <Input
            placeholder="搜索客户姓名 / ID"
            prefix={<IconSearch style={{ color: "#b0b8c4" }} />}
            value={search}
            onChange={setSearch}
            allowClear
            style={{ marginBottom: 8 }}
          />
          {tab === "personal" && (
            <div style={{ display: "flex", gap: 6 }}>
              <Select placeholder="资产等级" allowClear size="small"
                onChange={(v) => setFilters((f) => ({ ...f, asset_level: v }))}
                options={[{ label: "大众客户", value: "大众客户" }, { label: "成长型客户", value: "成长型客户" }, { label: "中端客户", value: "中端客户" }, { label: "高净值客户", value: "高净值客户" }]}
                style={{ flex: 1 }}
              />
              <Select placeholder="生命周期" allowClear size="small"
                onChange={(v) => setFilters((f) => ({ ...f, lifecycle: v }))}
                options={[{ label: "新客户", value: "新客户" }, { label: "成熟期", value: "成熟期" }, { label: "衰退期", value: "衰退期" }, { label: "流失预警", value: "流失预警" }]}
                style={{ flex: 1 }}
              />
            </div>
          )}
          {tab === "enterprise" && (
            <Select placeholder="行业" allowClear size="small"
              onChange={(v) => setFilters((f) => ({ ...f, industry: v }))}
              options={["能源","制造","贸易","科技","建筑","农业","金融服务","交通运输"].map(i => ({ label: i, value: i }))}
              style={{ width: "100%" }}
            />
          )}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "8px 8px" }}>
          {loading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spin /></div>
          ) : (
            (listData.data || []).map((item) => (
              <CustomerCard
                key={item.id}
                item={item}
                isSelected={selectedId === item.id}
                onClick={() => selectCustomer(item.id)}
              />
            ))
          )}
        </div>

        {listData.total > 0 && (
          <div style={{ padding: "8px 14px", borderTop: "1px solid #f0f2f5" }}>
            <Pagination
              current={currentPage} pageSize={20} total={listData.total}
              onChange={(page) => setCurrentPage(page)}
              size="mini" showTotal={(total) => `${total}条`}
              simple
            />
          </div>
        )}
      </div>

      {/* Right content area */}
      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
        {profileLoading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
            <Spin size={40} />
          </div>
        ) : profileData ? (
          <div>
            {/* Back button + header */}
            {returnTo && tab === "personal" && (
              <div
                onClick={() => { setTab("enterprise"); selectCustomer(returnTo.id, "enterprise"); setReturnTo(null); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 8, background: "#eff6ff",
                  color: "#3b82f6", fontSize: 13, cursor: "pointer", fontWeight: 500,
                  marginBottom: 16, border: "1px solid #bfdbfe",
                }}
              >
                ← 返回企业画像 ({returnTo.name})
              </div>
            )}
            {tab === "personal" ? renderPersonalProfile(profileData) : renderEnterpriseProfile(profileData)}
          </div>
        ) : (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            height: "100%", color: "#b0b8c4",
          }}>
            <div style={{ width: 80, height: 80, borderRadius: 20, background: "#e8ecf1", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
              <IconUser style={{ fontSize: 32, color: "#94a3b8" }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>请从左侧选择客户查看画像</div>
            <div style={{ fontSize: 13, marginTop: 6 }}>选择客户后，详细画像将在此展示</div>
          </div>
        )}
      </div>
    </div>
  );
}
