import React, { useState } from "react";
import { Layout, Menu } from "@arco-design/web-react";
import InsightReport from "./pages/InsightReport";
import CustomerProfile from "./pages/CustomerProfile";
import VisitWorkflow from "./pages/VisitWorkflow";

const { Sider, Content } = Layout;

const MENU_ITEMS = [
  { key: "insight", label: "客户洞察报告" },
  { key: "profile", label: "客户画像" },
  { key: "workflow", label: "拜访流程" },
];

export default function App() {
  const [active, setActive] = useState("insight");

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* Fixed Header */}
      <div style={{
        height: 56,
        background: "#1a3a5c",
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      }}>
        <div style={{ color: "#c9a84c", fontSize: 20, fontWeight: "bold", fontFamily: "Georgia, serif", marginRight: 40, letterSpacing: 2 }}>
          智慧银行
        </div>
        <div style={{ color: "white", fontSize: 16, fontWeight: 500 }}>智能营销平台</div>
        <div style={{ flex: 1 }} />
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>Demo v1.0</div>
      </div>

      {/* Body */}
      <Layout style={{ marginTop: 56 }}>
        {/* Sider */}
        <Sider
          width={200}
          style={{
            background: "#0d2137",
            position: "fixed",
            top: 56,
            bottom: 0,
            left: 0,
            overflow: "auto",
          }}
        >
          <div style={{ padding: "16px 0" }}>
            {MENU_ITEMS.map((item) => (
              <div
                key={item.key}
                onClick={() => setActive(item.key)}
                style={{
                  padding: "12px 20px",
                  color: active === item.key ? "#c9a84c" : "rgba(255,255,255,0.65)",
                  background: active === item.key ? "rgba(201,168,76,0.12)" : "transparent",
                  borderLeft: active === item.key ? "3px solid #c9a84c" : "3px solid transparent",
                  cursor: "pointer",
                  fontSize: 14,
                  transition: "all 0.15s",
                  userSelect: "none",
                }}
              >
                {item.label}
              </div>
            ))}
          </div>
        </Sider>

        {/* Content */}
        <Content style={{
          marginLeft: 200,
          padding: "24px 28px",
          background: "#f2f3f5",
          minHeight: "calc(100vh - 56px)",
        }}>
          {active === "insight" && <InsightReport />}
          {active === "profile" && <CustomerProfile />}
          {active === "workflow" && <VisitWorkflow />}
        </Content>
      </Layout>
    </Layout>
  );
}
