import React, { useState, useRef } from "react";
import { Layout, Card, Select, Tag } from "@arco-design/web-react";
import { IconUser, IconDashboard, IconFile, IconCalendar, IconThunderbolt, IconRobot } from "@arco-design/web-react/icon";
import InsightReport from "./pages/InsightReport";
import CustomerProfile from "./pages/CustomerProfile";
import VisitWorkflow from "./pages/VisitWorkflow";
import EventDashboard from "./pages/EventDashboard";
import Assistant from "./pages/Assistant";
import ReportBuilder from "./pages/ReportBuilder";
import { C, FONT_DISPLAY, GRADIENT_HERO, GRADIENT_ACCENT, RADIUS } from "./theme";

const { Sider, Content } = Layout;

const MENU_ITEMS = [
  { key: "insight", label: "客户洞察报告", icon: <IconDashboard /> },
  { key: "profile", label: "客户画像", icon: <IconUser /> },
  { key: "workflow", label: "拜访流程", icon: <IconCalendar /> },
  { key: "events", label: "事件引擎", icon: <IconThunderbolt /> },
  { key: "report", label: "客群画像报告", icon: <IconFile /> },
  { key: "assistant", label: "智能助手", icon: <IconRobot /> },
];

const ROLE_OPTIONS = [
  { label: "管理员 — 全行视角", value: "admin" },
  { label: "分行行长 — 东城支行", value: "branch_manager" },
  { label: "客户经理 — 李娜", value: "manager" },
];

const ROLE_CONFIG = {
  admin: { managerId: null, branchId: null },
  branch_manager: { managerId: null, branchId: "M001" },  // M001 → 查 MANAGERS 表得 "东城支行"
  manager: { managerId: "M001", branchId: null },
};

export default function App() {
  const [active, setActive] = useState("insight");
  const [role, setRole] = useState(null);
  const [profileTarget, setProfileTarget] = useState(null);

  const navigateToProfile = (customerId, customerName) => {
    setProfileTarget({ id: customerId, name: customerName || "" });
    setActive("profile");
  };

  if (!role) {
    return (
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        height: "100vh", background: GRADIENT_HERO, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -100, right: -60, width: 400, height: 400, borderRadius: "50%", background: "rgba(201,168,76,0.04)" }} />
        <div style={{ position: "absolute", bottom: -120, left: -40, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.02)" }} />
        <Card style={{
          width: 440, textAlign: "center", padding: "48px 40px",
          borderRadius: RADIUS.xl, border: "1px solid rgba(201,168,76,0.2)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)", position: "relative",
        }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, margin: "0 auto 20px", background: GRADIENT_ACCENT, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(201,168,76,0.3)" }}>
            <span style={{ fontSize: 28, color: "#fff", fontFamily: FONT_DISPLAY, fontWeight: 700 }}>智</span>
          </div>
          <div style={{ fontSize: 26, color: C.accent, fontFamily: FONT_DISPLAY, fontWeight: "bold", letterSpacing: 4, marginBottom: 6 }}>
            智慧银行
          </div>
          <div style={{ fontSize: 15, color: C.primary, fontWeight: 500, marginBottom: 36, letterSpacing: 1 }}>
            智能营销平台
          </div>
          <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 14, fontWeight: 500 }}>选择登录角色</div>
          <Select
            placeholder="请选择角色"
            options={ROLE_OPTIONS}
            onChange={(v) => setRole(v)}
            style={{ width: "100%", marginBottom: 28 }}
            size="large"
          />
          <div style={{ fontSize: 12, color: C.textDim }}>
            Demo 模式 · 不同角色可查看不同数据范围
          </div>
        </Card>
      </div>
    );
  }

  const roleLabel = ROLE_OPTIONS.find(r => r.value === role)?.label || role;
  const roleConfig = ROLE_CONFIG[role] || ROLE_CONFIG.admin;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Header */}
      <div style={{
        height: 56, background: C.primary,
        display: "flex", alignItems: "center", padding: "0 24px",
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 10, marginRight: 40,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: GRADIENT_ACCENT, display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 16, color: "#fff", fontFamily: FONT_DISPLAY, fontWeight: 700 }}>智</span>
          </div>
          <span style={{ color: C.accent, fontSize: 18, fontWeight: "bold", fontFamily: FONT_DISPLAY, letterSpacing: 2 }}>智慧银行</span>
        </div>
        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, fontWeight: 500, letterSpacing: 0.5 }}>智能营销平台</div>
        <div style={{ flex: 1 }} />
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "5px 14px", borderRadius: 8,
          background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.2)",
        }}>
          <IconUser style={{ color: C.accent, fontSize: 13 }} />
          <span style={{ color: C.accent, fontSize: 12, fontWeight: 600 }}>{roleLabel}</span>
        </div>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer", marginLeft: 16 }} onClick={() => setRole(null)}>退出</div>
      </div>

      {/* Body */}
      <Layout style={{ marginTop: 56 }}>
        {/* Sidebar */}
        <Sider width={200} style={{
          background: C.primaryDk, position: "fixed", top: 56, bottom: 0, left: 0, overflow: "auto",
        }}>
          <div style={{ padding: "20px 0" }}>
            {MENU_ITEMS.map((item) => {
              const isActive = active === item.key;
              return (
                <div key={item.key} onClick={() => setActive(item.key)} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 20px", cursor: "pointer", transition: "all 0.2s",
                  color: isActive ? C.accent : "rgba(255,255,255,0.55)",
                  background: isActive ? "rgba(201,168,76,0.1)" : "transparent",
                  borderLeft: isActive ? `3px solid ${C.accent}` : "3px solid transparent",
                }}>
                  <span style={{ fontSize: 16, display: "flex" }}>{item.icon}</span>
                  <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 400 }}>{item.label}</span>
                </div>
              );
            })}
          </div>
        </Sider>

        {/* Content */}
        <Content style={{
          marginLeft: 200, padding: "24px 28px",
          background: C.bg, minHeight: "calc(100vh - 56px)",
        }}>
          {active === "insight" && <InsightReport role={role} roleConfig={roleConfig} onNavigateToProfile={navigateToProfile} />}
          {active === "profile" && <CustomerProfile role={role} roleConfig={roleConfig} externalTarget={profileTarget} onTargetConsumed={() => setProfileTarget(null)} />}
          {active === "workflow" && <VisitWorkflow role={role} roleConfig={roleConfig} />}
          {active === "events" && <EventDashboard onNavigateToProfile={navigateToProfile} />}
          {active === "report" && <ReportBuilder role={role} roleConfig={roleConfig} />}
          {active === "assistant" && <Assistant role={role} />}
        </Content>
      </Layout>
    </Layout>
  );
}
