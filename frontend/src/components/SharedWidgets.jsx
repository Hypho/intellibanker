import React from "react";
import { C, GRADIENT_SUBTLE, RADIUS, SECTION_STYLE, FONT_DISPLAY } from "../theme";

export const Section = ({ title, icon, extra, children, noPad }) => (
  <div style={SECTION_STYLE}>
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "14px 20px", borderBottom: `1px solid ${C.borderLt}`,
      background: GRADIENT_SUBTLE,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && <span style={{ color: C.accent, fontSize: 15 }}>{icon}</span>}
        <span style={{ fontSize: 14, fontWeight: 600, color: C.text, letterSpacing: "0.02em" }}>{title}</span>
      </div>
      {extra}
    </div>
    <div style={{ padding: noPad ? 0 : "16px 20px" }}>{children}</div>
  </div>
);

export const MetricCard = ({ label, value, unit, color, bg, tip }) => (
  <div style={{
    flex: 1, padding: "14px 16px", borderRadius: RADIUS.md,
    background: bg || C.bg, border: `1px solid ${C.border}`,
    textAlign: "center", minWidth: 0,
  }}>
    {tip && <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4, fontWeight: 500 }}>{tip}</div>}
    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, fontWeight: 500 }}>{label}</div>
    <div style={{ fontSize: 20, fontWeight: 700, color: color || C.primary, fontFamily: FONT_DISPLAY, lineHeight: 1.2 }}>
      {value}
      {unit && <span style={{ fontSize: 11, fontWeight: 400, color: C.textDim, marginLeft: 2 }}>{unit}</span>}
    </div>
  </div>
);

export const DataRow = ({ label, value, highlight }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${C.borderLt}` }}>
    <span style={{ fontSize: 12.5, color: C.textMuted, fontWeight: 500, flexShrink: 0 }}>{label}</span>
    <span style={{ fontSize: 13, color: highlight ? C.primary : C.textSec, fontWeight: highlight ? 600 : 500, textAlign: "right" }}>{value}</span>
  </div>
);
