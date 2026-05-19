// ── IntelliBanker 统一设计系统 ──

// 国央企标准字体栈
export const FONT_BODY = '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Helvetica Neue", sans-serif';
export const FONT_DISPLAY = 'Georgia, "Times New Roman", "FangSong", serif';
export const FONT_MONO = '"JetBrains Mono", "SF Mono", "Menlo", monospace';

// 色彩系统
export const C = {
  primary:    "#1a3a5c",
  primaryDk:  "#0d2137",
  accent:     "#c9a84c",
  accentLt:   "#f5ecd4",
  bg:         "#f2f3f5",
  card:       "#ffffff",
  border:     "#e8ecf1",
  borderLt:   "#f0f2f5",
  text:       "#1a212a",
  textSec:    "#4a5568",
  textMuted:  "#8896a6",
  textDim:    "#b0b8c4",
  success:    "#22c55e",
  warning:    "#f59e0b",
  danger:     "#ef4444",
  info:       "#3b82f6",
};

// 通用渐变
export const GRADIENT_HERO = "linear-gradient(135deg, #1a3a5c 0%, #0d2137 100%)";
export const GRADIENT_ACCENT = "linear-gradient(135deg, #c9a84c 0%, #b8962e 100%)";
export const GRADIENT_SUBTLE = "linear-gradient(135deg, #fafbfc 0%, #ffffff 100%)";

// 圆角
export const RADIUS = { sm: 8, md: 10, lg: 12, xl: 14 };

// Section 卡片通用样式
export const SECTION_STYLE = {
  background: C.card,
  borderRadius: RADIUS.lg,
  border: `1px solid ${C.border}`,
  overflow: "hidden",
  marginBottom: 20,
};

// 金融数字格式化
export function formatMoney(v) {
  if (v >= 100000000) return (v / 100000000).toFixed(1) + "亿";
  if (v >= 10000) return (v / 10000).toFixed(0) + "万";
  return v ? v.toLocaleString() : "0";
}

// 标签颜色映射
export const TAG_COLORS = {
  大众客户: "#94a3b8", 成长型客户: "#3b82f6", 中端客户: "#1a3a5c", 高净值客户: "#c9a84c",
  新客户: "#22c55e", 成熟期: "#06b6d4", 衰退期: "#f59e0b", 流失预警: "#ef4444",
  高响应: "#22c55e", 中响应: "#3b82f6", 低响应: "#f59e0b", 未触达: "#94a3b8",
  保守型: "#94a3b8", 稳健型: "#3b82f6", 积极型: "#f59e0b",
  正面: "#22c55e", 中性: "#94a3b8", 负面: "#ef4444",
};
