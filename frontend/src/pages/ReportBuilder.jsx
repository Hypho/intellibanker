import React, { useState, useEffect, useRef, useCallback } from "react";
import { api } from "../api/client";
import {
  Card, Button, Select, Tag, Spin, Message, Grid, Progress, Tooltip,
} from "@arco-design/web-react";
import {
  IconFile, IconDownload, IconStar, IconSafe, IconApps, IconUser,
  IconClockCircle, IconThunderbolt, IconDelete, IconRefresh,
} from "@arco-design/web-react/icon";
import ReactECharts from "echarts-for-react";
import { C, FONT_DISPLAY, FONT_MONO, GRADIENT_SUBTLE, RADIUS, SECTION_STYLE } from "../theme";
import { Section, MetricCard } from "../components/SharedWidgets";

const { Row, Col } = Grid;

/* ── Chart component ── */
function FeatureChart({ feature }) {
  const { chart_type, chart_data, feature_name } = feature;

  if (chart_type === "metric_card") {
    const val = chart_data?.value ?? 0;
    const bench = chart_data?.benchmark;
    const display = typeof val === "number" ? val.toLocaleString() : val;
    return (
      <div style={{ textAlign: "center", padding: "16px 12px", background: "#f8fafc", borderRadius: RADIUS.sm, border: "1px solid #eef0f3" }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>{feature_name}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: C.primary, fontFamily: FONT_DISPLAY }}>{display}</div>
        {bench != null && bench !== val && (
          <div style={{ fontSize: 10, color: C.textDim, marginTop: 4 }}>全行均值: {typeof bench === "number" ? bench.toLocaleString() : bench}</div>
        )}
      </div>
    );
  }

  if (chart_type === "pie") {
    const labels = chart_data?.labels || [];
    const values = chart_data?.values || [];
    if (!labels.length) return <EmptyChart />;
    return <ReactECharts option={{
      tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
      legend: { bottom: 0, textStyle: { fontSize: 10 } },
      series: [{ type: "pie", radius: ["30%", "55%"], center: ["50%", "42%"],
        data: labels.map((l, i) => ({ name: l, value: values[i] || 0 })),
        label: { fontSize: 10, formatter: "{b}\n{d}%" } }],
    }} style={{ height: 200 }} />;
  }

  if (chart_type === "bar" || chart_type === "histogram") {
    const labels = chart_data?.labels || [];
    const values = chart_data?.values || [];
    if (!labels.length) return <EmptyChart />;
    const color = chart_type === "histogram" ? C.accent : C.primary;
    return <ReactECharts option={{
      tooltip: { trigger: "axis" },
      grid: { top: 8, right: 10, bottom: 28, left: 50 },
      xAxis: { type: "category", data: labels, axisLabel: { fontSize: 9, rotate: labels.length > 5 ? 30 : 0 } },
      yAxis: { type: "value", axisLabel: { fontSize: 9 } },
      series: [{ type: "bar", data: values, itemStyle: { color, borderRadius: [3, 3, 0, 0] } }],
    }} style={{ height: 200 }} />;
  }

  if (chart_type === "line") {
    const labels = chart_data?.labels || [];
    const values = chart_data?.values || [];
    if (!labels.length) return <EmptyChart />;
    return <ReactECharts option={{
      tooltip: { trigger: "axis", formatter: (p) => `${p[0].name}<br/><b>${p[0].value.toLocaleString()}</b>` },
      grid: { top: 8, right: 10, bottom: 28, left: 55 },
      xAxis: { type: "category", data: labels, axisLabel: { fontSize: 9 } },
      yAxis: { type: "value", axisLabel: { fontSize: 9, formatter: (v) => (v / 10000).toFixed(0) + "万" } },
      series: [{ type: "line", data: values, smooth: true,
        areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: "rgba(26,58,92,0.15)" }, { offset: 1, color: "rgba(26,58,92,0)" }] } },
        lineStyle: { color: "#1a3a5c", width: 2 }, itemStyle: { color: "#1a3a5c" } }],
    }} style={{ height: 200 }} />;
  }

  return <EmptyChart text={`不支持: ${chart_type}`} />;
}

function EmptyChart({ text = "暂无数据" }) {
  return <div style={{ color: C.textDim, textAlign: "center", padding: 24, fontSize: 12 }}>{text}</div>;
}

/* ── Feature Card: chart + insight in one card ── */
function FeatureCard({ feature }) {
  return (
    <div style={{
      background: "#fff", borderRadius: RADIUS.sm,
      border: "1px solid #eef0f3", overflow: "hidden",
      position: "relative",
    }}>
      {feature.is_top5 && (
        <div style={{
          position: "absolute", top: 6, right: 6, zIndex: 2,
          fontSize: 9, padding: "2px 6px", borderRadius: 3,
          background: "#ef4444", color: "#fff", fontWeight: 700, letterSpacing: 0.5,
        }}>TOP5</div>
      )}
      <FeatureChart feature={feature} />
      {feature.llm_insight && (
        <div style={{
          padding: "8px 12px", fontSize: 11.5, lineHeight: 1.6,
          color: C.textSec, borderTop: "1px solid #f0f0f0",
          background: "#fafbfc",
        }}>
          💡 {feature.llm_insight}
        </div>
      )}
    </div>
  );
}

/* ── Report History Sidebar ── */
function ReportHistory({ reports, activeId, onSelect, onDelete, onRefresh, loading }) {
  return (
    <div style={{
      width: 240, flexShrink: 0, display: "flex", flexDirection: "column",
      background: C.card, borderRadius: RADIUS.lg, border: `1px solid ${C.border}`,
      overflow: "hidden",
    }}>
      <div style={{
        padding: "12px 14px", borderBottom: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>历史报告</span>
        <Tooltip content="刷新列表">
          <Button type="text" size="mini" icon={<IconRefresh style={{ fontSize: 12 }} />} onClick={onRefresh} />
        </Tooltip>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 20 }}><Spin size={16} /></div>
        ) : reports.length === 0 ? (
          <div style={{ padding: "20px 14px", color: C.textDim, fontSize: 12, textAlign: "center" }}>
            暂无历史报告<br /><span style={{ fontSize: 11 }}>生成后自动保存</span>
          </div>
        ) : (
          reports.map((r) => (
            <div
              key={r.id}
              onClick={() => onSelect(r.id)}
              style={{
                padding: "10px 14px", cursor: "pointer", transition: "background 0.15s",
                background: activeId === r.id ? `${C.primary}0a` : "transparent",
                borderLeft: activeId === r.id ? `2px solid ${C.primary}` : "2px solid transparent",
              }}
              onMouseEnter={(e) => { if (activeId !== r.id) e.currentTarget.style.background = "#f8fafc"; }}
              onMouseLeave={(e) => { if (activeId !== r.id) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12.5, fontWeight: 500, color: C.text,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {r.theme_name}
                  </div>
                  <div style={{ fontSize: 11, color: C.textDim, marginTop: 3 }}>
                    {r.customer_count}人 · {(r.created_at || "").slice(0, 16).replace("T", " ")}
                  </div>
                </div>
                <IconDelete
                  style={{ fontSize: 12, color: C.textDim, cursor: "pointer", flexShrink: 0, marginTop: 2, marginLeft: 4 }}
                  onClick={(e) => { e.stopPropagation(); onDelete(r.id); }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function ReportBuilder({ role, roleConfig }) {
  const [themes, setThemes] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ phase: "", message: "", percent: 0 });
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const streamRef = useRef(null);

  // Load themes + history on mount
  useEffect(() => {
    api.listReportThemes().then((d) => setThemes(d.themes || [])).catch(() => {});
    refreshHistory();
  }, []);

  const refreshHistory = useCallback(() => {
    setHistoryLoading(true);
    api.listReports().then((d) => setHistory(d.reports || [])).catch(() => {}).finally(() => setHistoryLoading(false));
  }, []);

  // Load a report from history
  const handleSelectReport = async (reportId) => {
    try {
      const data = await api.getReport(reportId);
      setReport(data);
    } catch (e) {
      Message.error("加载报告失败：" + e.message);
    }
  };

  // Delete a report from history
  const handleDeleteReport = async (reportId) => {
    try {
      await api.deleteReport(reportId);
      setHistory((prev) => prev.filter((r) => r.id !== reportId));
      if (report?.id === reportId) setReport(null);
      Message.success("已删除");
    } catch (e) {
      Message.error("删除失败：" + e.message);
    }
  };

  // Generate new report
  const handleGenerate = () => {
    if (!selectedTheme) { Message.warning("请先选择标签主题"); return; }
    setGenerating(true);
    setReport(null);
    setProgress({ phase: "start", message: "正在生成报告...", percent: 5 });

    const params = { theme_id: selectedTheme, user: role || "admin" };
    if (roleConfig?.managerId) params.manager_id = roleConfig.managerId;
    if (roleConfig?.branchId) params.branch_id = roleConfig.branchId;

    streamRef.current = api.streamReport(params, async ({ event, data }) => {
      if (event === "data") {
        setProgress(data);
        if (data.phase === "complete" && data.report_id) {
          try {
            const reportData = await api.getReport(data.report_id);
            setReport(reportData);
            refreshHistory();
          } catch (e) { Message.error("获取报告失败：" + e.message); }
          setGenerating(false);
        } else if (data.phase === "error") {
          Message.error(data.message);
          setGenerating(false);
        }
      } else if (event === "error") {
        Message.error("报告生成失败：" + data.message);
        setGenerating(false);
      }
    });
  };

  useEffect(() => () => { if (streamRef.current) streamRef.current.abort(); }, []);

  const handleExport = async (format) => {
    if (!report?.id) return;
    try {
      Message.loading(`正在导出...`);
      const blob = format === "word"
        ? await api.exportReportWord(report.id)
        : await api.exportReportPdf(report.id);
      const ext = format === "word" ? "docx" : "html";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.theme_name}客群画像分析报告_${report.data_date}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Message.success("导出成功");
    } catch (e) {
      Message.error("导出失败：" + e.message);
    }
  };

  const themeOptions = themes.map((t) => ({
    label: `${t.name}（${t.description}）`,
    value: t.id,
  }));

  return (
    <div style={{ display: "flex", gap: 16, height: "calc(100vh - 104px)" }}>
      {/* Left: History sidebar */}
      <ReportHistory
        reports={history}
        activeId={report?.id}
        onSelect={handleSelectReport}
        onDelete={handleDeleteReport}
        onRefresh={refreshHistory}
        loading={historyLoading}
      />

      {/* Right: Main content */}
      <div style={{ flex: 1, overflow: "auto", minWidth: 0 }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 20, padding: "16px 20px",
          background: GRADIENT_SUBTLE, borderRadius: RADIUS.lg,
          border: `1px solid ${C.border}`, ...SECTION_STYLE,
        }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>客群画像报告</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>基于标签主题自动生成，支持导出 Word/PDF</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Tag size="small" color="arcoblue">DeepSeek</Tag>
            <Tag size="small" color="green">Auto Report</Tag>
          </div>
        </div>

        {/* Theme selector + Generate */}
        <Section title="选择标签主题" icon={<IconApps />}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Select
              placeholder="选择客群标签主题"
              options={themeOptions}
              value={selectedTheme}
              onChange={setSelectedTheme}
              style={{ flex: 1 }}
              size="large"
            />
            <Button
              type="primary" size="large" loading={generating}
              onClick={handleGenerate} disabled={!selectedTheme}
              style={{ minWidth: 140, borderRadius: RADIUS.sm, fontWeight: 600 }}
            >
              {generating ? "生成中..." : "生成报告"}
            </Button>
          </div>
        </Section>

        {/* Progress */}
        {generating && (
          <Section title="生成进度" icon={<IconClockCircle />}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Spin size={18} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text, marginBottom: 8 }}>{progress.message}</div>
                <Progress percent={progress.percent} size="small" />
              </div>
            </div>
          </Section>
        )}

        {/* Report content */}
        {report && (
          <div>
            {/* Meta bar + Export */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 16px", marginBottom: 16,
              background: "#f0fdf4", borderRadius: RADIUS.sm,
              border: "1px solid #bbf7d0", fontSize: 12.5,
            }}>
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <span><span style={{ color: C.textMuted }}>报告：</span><strong>{report.theme_name}</strong></span>
                <span><span style={{ color: C.textMuted }}>客群：</span><strong style={{ color: C.primary }}>{report.customer_count}人</strong></span>
                <span><span style={{ color: C.textMuted }}>生成：</span>{report.generated_at}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Button type="outline" size="mini" icon={<IconDownload />} onClick={() => handleExport("word")} style={{ borderRadius: 4 }}>Word</Button>
                <Button type="outline" size="mini" icon={<IconDownload />} onClick={() => handleExport("pdf")} style={{ borderRadius: 4 }}>PDF</Button>
              </div>
            </div>

            {/* Executive Summary */}
            {report.executive_summary && (
              <div style={{
                padding: "16px 20px", marginBottom: 16, borderRadius: RADIUS.sm,
                background: "linear-gradient(135deg, #f8fafc, #f0f4ff)",
                border: "1px solid #e0e7ff", borderLeft: "4px solid #c9a84c",
              }}>
                <div style={{ fontSize: 11, color: "#c9a84c", fontWeight: 600, letterSpacing: 2, marginBottom: 6 }}>执行摘要</div>
                <div style={{ fontSize: 13.5, color: "#374151", lineHeight: 1.85 }}>{report.executive_summary}</div>
              </div>
            )}

            {/* Overview */}
            {report.overview && (
              <Section title="一、客群基础概览" icon={<IconUser />}>
                {/* Metric cards row */}
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}><MetricCard label="客群总人数" value={report.overview.total_count} unit="人" color={C.primary} /></div>
                  <div style={{ flex: 1 }}><MetricCard label="核心客群" value={report.overview.core_segment || "—"} color={C.accent} /></div>
                  <div style={{ flex: 1 }}><MetricCard label="男女比例" value={(() => { const g = report.overview.gender_stats || {}; return `${g["男"]||0}:${g["女"]||0}`; })()} color="#3b82f6" /></div>
                  <div style={{ flex: 1 }}><MetricCard label="覆盖地域" value={Object.keys(report.overview.region_stats || {}).length} unit="个" color="#22c55e" /></div>
                </div>
                {/* Charts row */}
                <Row gutter={16}>
                  <Col span={8}>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>年龄分布</div>
                    <FeatureChart feature={{ chart_type: "histogram", chart_data: report.overview.age_histogram, feature_name: "年龄" }} />
                  </Col>
                  <Col span={8}>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>资产等级</div>
                    <FeatureChart feature={{ chart_type: "pie", chart_data: { labels: Object.keys(report.overview.asset_level_stats || {}), values: Object.values(report.overview.asset_level_stats || {}) }, feature_name: "资产等级" }} />
                  </Col>
                  <Col span={8}>
                    <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>地域分布</div>
                    <FeatureChart feature={{ chart_type: "bar", chart_data: { labels: Object.keys(report.overview.region_stats || {}), values: Object.values(report.overview.region_stats || {}) }, feature_name: "地域" }} />
                  </Col>
                </Row>
              </Section>
            )}

            {/* Feature Groups */}
            {(report.feature_analysis || []).map((group, gi) => (
              <Section key={group.group_id} title={`${["二","三","四","五","六","七","八","九","十"][gi] || gi + 2}、${group.group_name}`} icon={<IconStar />}>
                {group.group_summary && (
                  <div style={{
                    padding: "12px 16px", marginBottom: 12, borderRadius: RADIUS.sm,
                    background: "linear-gradient(135deg, #f0f4ff, #f8fafc)",
                    border: "1px solid #dbeafe", fontSize: 13, color: "#1e3a5f", lineHeight: 1.8,
                  }}>
                    {group.group_summary}
                  </div>
                )}
                {group.top5_features?.length > 0 && (
                  <div style={{ marginBottom: 10, display: "flex", gap: 5, alignItems: "center", flexWrap: "wrap" }}>
                    <Tag size="small" color="orangered">Top5</Tag>
                    {group.top5_features.map((f) => (
                      <Tag key={f.feature_id} size="small" color="arcoblue">{f.feature_name}</Tag>
                    ))}
                  </div>
                )}
                {/* Metric cards — flex row, equal width */}
                {group.features.filter((f) => f.chart_type === "metric_card").length > 0 && (
                  <div style={{ display: "flex", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
                    {group.features.filter((f) => f.chart_type === "metric_card").map((f) => (
                      <div key={f.feature_id} style={{ flex: "1 1 0", minWidth: 130 }}>
                        <FeatureCard feature={f} />
                      </div>
                    ))}
                  </div>
                )}
                {/* Pie/bar/histogram charts — 3 per row */}
                {group.features.filter((f) => f.chart_type !== "metric_card" && f.chart_type !== "line").length > 0 && (
                  <Row gutter={[12, 12]} style={{ marginBottom: group.features.some((f) => f.chart_type === "line") ? 12 : 0 }}>
                    {group.features.filter((f) => f.chart_type !== "metric_card" && f.chart_type !== "line").map((f) => (
                      <Col key={f.feature_id} span={8}>
                        <FeatureCard feature={f} />
                      </Col>
                    ))}
                  </Row>
                )}
                {/* Line charts — full width */}
                {group.features.filter((f) => f.chart_type === "line").map((f) => (
                  <div key={f.feature_id} style={{ marginBottom: 12 }}>
                    <FeatureCard feature={f} />
                  </div>
                ))}
              </Section>
            ))}

            {/* Correlation Insights */}
            {report.correlation_insights?.length > 0 && (
              <Section title="相关性洞察" icon={<IconThunderbolt />}>
                <Row gutter={[12, 12]}>
                  {report.correlation_insights.map((r, i) => (
                    <Col key={i} span={12}>
                      <div style={{
                        padding: "14px 16px", borderRadius: RADIUS.sm,
                        background: "#faf5ff", border: "1px solid #e9d5ff", height: "100%",
                      }}>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                          <Tag size="small" color="purple">
                            {r.type === "enum_enum" ? `Lift ${r.lift}` : `${r.ratio}倍`}
                          </Tag>
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: C.text }}>
                            {r.antecedent} → {r.consequent}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: C.textSec, lineHeight: 1.7 }}>
                          💡 {r.llm_insight || r.insight || "暂无洞察"}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Section>
            )}

            {/* Recommendations */}
            {report.recommendations && (
              <Section title="营销运营建议" icon={<IconSafe />}>
                {report.recommendations.marketing_directions?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, marginBottom: 6 }}>🎯 营销方向</div>
                    {report.recommendations.marketing_directions.map((d, i) => (
                      <div key={i} style={{
                        padding: "7px 12px", marginBottom: 5, borderRadius: 5,
                        background: "#f8f9fb", borderLeft: "3px solid #c9a84c",
                        fontSize: 12.5, color: C.textSec,
                      }}>{d}</div>
                    ))}
                  </div>
                )}
                {report.recommendations.priority_customers && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, marginBottom: 6 }}>👤 重点跟进</div>
                    <div style={{ padding: "7px 12px", borderRadius: 5, background: "#fef2f2", borderLeft: "3px solid #ef4444", fontSize: 12.5, color: C.textSec }}>
                      {report.recommendations.priority_customers}
                    </div>
                  </div>
                )}
                {report.recommendations.cross_sell_opportunities?.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, marginBottom: 6 }}>🔄 交叉销售</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {report.recommendations.cross_sell_opportunities.map((p, i) => (
                        <Tag key={i} size="small" color="green">{p}</Tag>
                      ))}
                    </div>
                  </div>
                )}
                {report.recommendations.marketing_script && (
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, marginBottom: 6 }}>📝 营销话术</div>
                    <div style={{
                      padding: "12px 16px", borderRadius: RADIUS.sm,
                      background: `linear-gradient(135deg, ${C.primary}08, ${C.accent}08)`,
                      border: `1px solid ${C.accent}30`,
                      fontSize: 12.5, lineHeight: 1.8, color: C.textSec, fontStyle: "italic",
                    }}>
                      "{report.recommendations.marketing_script}"
                    </div>
                  </div>
                )}
              </Section>
            )}
          </div>
        )}

        {/* Empty state */}
        {!report && !generating && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            height: 400, color: C.textDim,
          }}>
            <IconFile style={{ fontSize: 48, color: C.border, marginBottom: 16 }} />
            <div style={{ fontSize: 15, fontWeight: 500 }}>选择标签主题生成报告</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>或从左侧历史报告中查看</div>
          </div>
        )}
      </div>
    </div>
  );
}
