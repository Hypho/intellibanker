import React, { useState, useEffect } from "react";
import { Card, Grid, Table, Tag, Badge, Spin } from "@arco-design/web-react";
import { IconClockCircle, IconThunderbolt } from "@arco-design/web-react/icon";
import { api } from "../api/client";
import { C, FONT_DISPLAY, GRADIENT_SUBTLE, RADIUS, SECTION_STYLE, formatMoney } from "../theme";
import { Section } from "../components/SharedWidgets";

const { Row, Col } = Grid;

const STATS = [
  { label: "今日触发事件", value: 23, color: C.primary },
  { label: "待处理", value: 8, color: C.warning },
  { label: "已完成", value: 15, color: C.success },
  { label: "高优先级", value: 5, color: C.danger },
];

const PRIORITY_COLOR = { high: "red", medium: "orange" };

export default function EventDashboard({ onNavigateToProfile }) {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await api.getInsightReport({ dimension: "all" });
      const evts = [];

      const pushEvent = (c, type, baseHour, overrides = {}) => {
        evts.push({
          id: evts.length + 1,
          time: `${baseHour + Math.floor(Math.random() * (18 - baseHour))}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
          type,
          customer: `${c.name} (${c.id})`,
          customerId: c.id,
          customerName: c.name,
          priority: "medium",
          status: "待处理",
          ...overrides,
        });
      };

      (res.key_lists?.churn_risk_customers || []).forEach(c =>
        pushEvent(c, "流失预警", 8, { priority: "high", action: "优先触达，了解原因" })
      );
      (res.key_lists?.product_expiring || []).forEach(c =>
        pushEvent(c, "产品到期", 9, {
          priority: c.days_left <= 7 ? "high" : "medium",
          status: c.days_left <= 7 ? "待处理" : "已完成",
          action: `推送续存方案（${c.days_left}天后到期）`,
        })
      );
      (res.opportunities?.cross_sell_leads || []).slice(0, 5).forEach(c =>
        pushEvent(c, "交叉销售", 10, { action: c.suggestion })
      );
      (res.opportunities?.churn_alerts || []).slice(0, 5).forEach(c =>
        pushEvent(c, "流失信号", 11, {
          priority: c.churn_probability > 0.6 ? "high" : "medium",
          action: `流失概率${(c.churn_probability * 100).toFixed(0)}%，需干预`,
        })
      );
      setEvents(evts);
    } catch (e) { /* silent */ }
    finally { setLoading(false); }
  };

  const columns = [
    { title: "时间", dataIndex: "time", width: 70, render: (v) => <span style={{ fontFamily: "'Georgia', serif", fontSize: 12.5, color: C.textMuted }}>{v}</span> },
    { title: "事件类型", dataIndex: "type", width: 100, render: (v) => <Tag color="arcoblue">{v}</Tag> },
    { title: "客户", dataIndex: "customer", render: (v, r) => (
      <span onClick={() => onNavigateToProfile && onNavigateToProfile(r.customerId, r.customerName)}
        style={{ color: C.info, cursor: "pointer", fontWeight: 500 }}>{v}</span>
    )},
    { title: "优先级", dataIndex: "priority", width: 80, render: (v) => <Tag color={PRIORITY_COLOR[v]}>{v === "high" ? "高" : "中"}</Tag> },
    { title: "状态", dataIndex: "status", width: 90, render: (v) => <Badge status={v === "已完成" ? "success" : v === "待处理" ? "warning" : "processing"} text={v} /> },
    { title: "触发动作", dataIndex: "action", render: (v) => <span style={{ fontSize: 12.5, color: C.textSec }}>{v}</span> },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 24, padding: "20px 24px",
        background: GRADIENT_SUBTLE, borderRadius: RADIUS.lg,
        border: `1px solid ${C.border}`,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "0.02em" }}>事件驱动引擎</div>
          <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 4 }}>实时监控客户事件，自动触发营销流程</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 8, background: `${C.success}12`, border: `1px solid ${C.success}30` }}>
          <Badge status="processing" text="" />
          <span style={{ fontSize: 12.5, color: C.success, fontWeight: 600 }}>实时监控中</span>
        </div>
      </div>

      {/* Stats */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        {STATS.map((s, i) => (
          <Col span={6} key={i}>
            <Card hoverable style={{ textAlign: "center", borderRadius: RADIUS.md }}>
              <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: s.color, fontFamily: FONT_DISPLAY }}>{s.value}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Event stream */}
      <Section title="事件流（今日）" icon={<IconThunderbolt />}
        extra={<span style={{ fontSize: 12, color: C.textDim }}>共 {events.length} 条事件</span>}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}><Spin /></div>
        ) : (
          <Table columns={columns} data={events} pagination={false} size="small"
            rowKey="id" style={{ fontSize: 13 }} />
        )}
      </Section>
    </div>
  );
}
