import React, { useState, useEffect, useRef } from "react";
import { api } from "../api/client";
import {
  Card, Button, Select, Tag, Spin, Message, Grid, Progress,
} from "@arco-design/web-react";
import {
  IconFile, IconDownload, IconStar, IconSafe, IconApps, IconUser,
  IconClockCircle, IconThunderbolt,
} from "@arco-design/web-react/icon";
import ReactECharts from "echarts-for-react";
import { C, FONT_DISPLAY, FONT_MONO, GRADIENT_SUBTLE, RADIUS, SECTION_STYLE, formatMoney } from "../theme";
import { Section, MetricCard } from "../components/SharedWidgets";

const { Row, Col } = Grid;

/* ── Chart component for report features ── */
function FeatureChart({ feature }) {
  const { chart_type, chart_data, feature_name } = feature;

  if (chart_type === "metric_card") {
    const val = chart_data?.value ?? 0;
    const bench = chart_data?.benchmark;
    const display = typeof val === "number" ? val.toLocaleString() : val;
    return (
      <Card hoverable style={{ textAlign: "center", borderRadius: RADIUS.md, minHeight: 100 }}>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8 }}>{feature_name}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: C.primary, fontFamily: FONT_DISPLAY }}>{display}</div>
        {bench != null && bench !== val && (
          <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>全行均值: {typeof bench === "number" ? bench.toLocaleString() : bench}</div>
        )}
      </Card>
    );
  }

  if (chart_type === "pie") {
    const labels = chart_data?.labels || [];
    const values = chart_data?.values || [];
    if (!labels.length) return <div style={{ color: C.textDim, textAlign: "center", padding: 20 }}>暂无数据</div>;
    const option = {
      tooltip: { trigger: "item", formatter: "{b}: {c} ({d}%)" },
      legend: { bottom: 0, textStyle: { fontSize: 11 } },
      series: [{
        type: "pie", radius: ["35%", "60%"], center: ["50%", "45%"],
        data: labels.map((l, i) => ({ name: l, value: values[i] || 0 })),
        label: { fontSize: 11, formatter: "{b}\n{d}%" },
      }],
    };
    return <ReactECharts option={option} style={{ height: 220 }} />;
  }

  if (chart_type === "bar" || chart_type === "histogram") {
    const labels = chart_data?.labels || [];
    const values = chart_data?.values || [];
    if (!labels.length) return <div style={{ color: C.textDim, textAlign: "center", padding: 20 }}>暂无数据</div>;
    const color = chart_type === "histogram" ? C.accent : C.primary;
    const option = {
      tooltip: { trigger: "axis" },
      grid: { top: 10, right: 12, bottom: 30, left: 60 },
      xAxis: { type: "category", data: labels, axisLabel: { fontSize: 10, rotate: labels.length > 5 ? 30 : 0 } },
      yAxis: { type: "value", axisLabel: { fontSize: 10 } },
      series: [{ type: "bar", data: values, itemStyle: { color, borderRadius: [4, 4, 0, 0] } }],
    };
    return <ReactECharts option={option} style={{ height: 220 }} />;
  }

  if (chart_type === "line") {
    const labels = chart_data?.labels || [];
    const values = chart_data?.values || [];
    if (!labels.length) return <div style={{ color: C.textDim, textAlign: "center", padding: 20 }}>暂无数据</div>;
    const option = {
      tooltip: { trigger: "axis", formatter: (p) => `${p[0].name}<br/><b>${p[0].value.toLocaleString()}</b>` },
      grid: { top: 10, right: 12, bottom: 30, left: 60 },
      xAxis: { type: "category", data: labels, axisLabel: { fontSize: 10 } },
      yAxis: { type: "value", axisLabel: { fontSize: 10, formatter: (v) => (v / 10000).toFixed(0) + "万" } },
      series: [{
        type: "line", data: values, smooth: true,
        areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color: "rgba(26,58,92,0.18)" }, { offset: 1, color: "rgba(26,58,92,0)" }] } },
        lineStyle: { color: "#1a3a5c", width: 2.5 }, itemStyle: { color: "#1a3a5c" },
      }],
    };
    return <ReactECharts option={option} style={{ height: 220 }} />;
  }

  return <div style={{ color: C.textDim, textAlign: "center", padding: 20 }}>不支持的图表类型: {chart_type}</div>;
}

/* ── Main component ── */
export default function ReportBuilder({ role, roleConfig }) {
  const [themes, setThemes] = useState([]);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ phase: "", message: "", percent: 0 });

  useEffect(() => {
    api.listReportThemes().then((d) => setThemes(d.themes || [])).catch(() => {});
  }, []);

  const streamRef = useRef(null);

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

  // Abort on unmount
  useEffect(() => () => { if (streamRef.current) streamRef.current.abort(); }, []);

  const handleExport = async (format) => {
    if (!report?.id) return;
    try {
      Message.loading(`正在导出 ${format === "word" ? "Word" : "PDF"}...`);
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
    <div>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 24, padding: "20px 24px",
        background: GRADIENT_SUBTLE, borderRadius: RADIUS.lg,
        border: `1px solid ${C.border}`, ...SECTION_STYLE,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "0.02em" }}>客群画像报告</div>
          <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 4 }}>基于标签主题自动生成客群分析报告，支持导出 Word/PDF</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Tag size="small" color="arcoblue">DeepSeek</Tag>
          <Tag size="small" color="green">Auto Report</Tag>
        </div>
      </div>

      {/* Theme selector + Generate */}
      <Section title="选择标签主题" icon={<IconApps />}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Select
            placeholder="选择要分析的客群标签主题"
            options={themeOptions}
            value={selectedTheme}
            onChange={setSelectedTheme}
            style={{ flex: 1 }}
            size="large"
          />
          <Button
            type="primary"
            size="large"
            loading={generating}
            onClick={handleGenerate}
            disabled={!selectedTheme}
            style={{ minWidth: 160, borderRadius: RADIUS.sm, fontWeight: 600 }}
          >
            {generating ? "生成中..." : "生成报告"}
          </Button>
        </div>

        {/* Theme info cards */}
        {selectedTheme && !report && !generating && (() => {
          const theme = themes.find((t) => t.id === selectedTheme);
          if (!theme) return null;
          return (
            <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
              {(theme.tag_groups || []).map((g) => (
                <div key={g.id} style={{
                  padding: "10px 16px", borderRadius: RADIUS.sm,
                  background: `${C.primary}08`, border: `1px solid ${C.primary}20`,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{g.name}</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{g.description}</div>
                  <div style={{ fontSize: 11, color: C.primary, marginTop: 4 }}>{g.feature_count} 个分析指标</div>
                </div>
              ))}
            </div>
          );
        })()}
      </Section>

      {/* Progress indicator */}
      {generating && (
        <Section title="生成进度" icon={<IconClockCircle />}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Spin size={20} />
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
          {/* Report meta */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "14px 20px", marginBottom: 20,
            background: "#f0fdf4", borderRadius: RADIUS.md,
            border: "1px solid #bbf7d0",
          }}>
            <div style={{ display: "flex", gap: 16, fontSize: 13 }}>
              <span><span style={{ color: C.textMuted }}>报告：</span><strong>{report.theme_name}客群画像分析报告</strong></span>
              <span><span style={{ color: C.textMuted }}>客群：</span><strong style={{ color: C.primary }}>{report.customer_count} 人</strong></span>
              <span><span style={{ color: C.textMuted }}>生成时间：</span>{report.generated_at}</span>
              <span><span style={{ color: C.textMuted }}>数据截止：</span>{report.data_date}</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button type="outline" size="small" icon={<IconDownload />}
                style={{ borderRadius: RADIUS.sm }}
                onClick={() => handleExport("word")}>
                导出 Word
              </Button>
              <Button type="outline" size="small" icon={<IconDownload />}
                style={{ borderRadius: RADIUS.sm }}
                onClick={() => handleExport("pdf")}>
                导出 PDF
              </Button>
            </div>
          </div>

          {/* Chapter 2: Overview */}
          {report.overview && (
            <Section title="一、客群基础概览" icon={<IconUser />}>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <MetricCard label="客群总人数" value={report.overview.total_count} unit="人" color={C.primary} />
                </Col>
                <Col span={6}>
                  <MetricCard label="核心客群" value={report.overview.core_segment || "—"} color={C.accent} />
                </Col>
                <Col span={6}>
                  <MetricCard
                    label="男女比例"
                    value={(() => {
                      const g = report.overview.gender_stats || {};
                      const m = g["男"] || 0; const f = g["女"] || 0;
                      return `${m}:${f}`;
                    })()}
                    color="#3b82f6"
                  />
                </Col>
                <Col span={6}>
                  <MetricCard label="覆盖地域" value={Object.keys(report.overview.region_stats || {}).length} unit="个" color="#22c55e" />
                </Col>
              </Row>

              <Row gutter={20}>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, fontWeight: 600 }}>年龄分布</div>
                  <FeatureChart feature={{ chart_type: "histogram", chart_data: report.overview.age_histogram, feature_name: "年龄分布" }} />
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, fontWeight: 600 }}>资产等级分布</div>
                  <FeatureChart feature={{ chart_type: "pie", chart_data: {
                    labels: Object.keys(report.overview.asset_level_stats || {}),
                    values: Object.values(report.overview.asset_level_stats || {}),
                  }, feature_name: "资产等级" }} />
                </Col>
                <Col span={8}>
                  <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 8, fontWeight: 600 }}>地域分布</div>
                  <FeatureChart feature={{ chart_type: "bar", chart_data: {
                    labels: Object.keys(report.overview.region_stats || {}),
                    values: Object.values(report.overview.region_stats || {}),
                  }, feature_name: "地域分布" }} />
                </Col>
              </Row>
            </Section>
          )}

          {/* Executive Summary */}
          {report.executive_summary && (
            <div style={{
              padding: "20px 24px", marginBottom: 20, borderRadius: RADIUS.md,
              background: "linear-gradient(135deg, #f8fafc, #f0f4ff)",
              border: "1px solid #e0e7ff", borderLeft: "4px solid #c9a84c",
            }}>
              <div style={{ fontSize: 12, color: "#c9a84c", fontWeight: 600, letterSpacing: 2, marginBottom: 8 }}>执行摘要</div>
              <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.9, textAlign: "justify" }}>{report.executive_summary}</div>
            </div>
          )}

          {/* Chapter 3: Feature Analysis */}
          {(report.feature_analysis || []).map((group, gi) => (
            <Section key={group.group_id} title={`${["二","三","四","五","六","七","八","九","十"][gi] || gi + 2}、${group.group_name}`} icon={<IconStar />}>
              {/* Group summary */}
              {group.group_summary && (
                <div style={{
                  padding: "14px 18px", marginBottom: 16, borderRadius: RADIUS.sm,
                  background: "linear-gradient(135deg, #f0f4ff, #f8fafc)",
                  border: "1px solid #dbeafe", fontSize: 13.5, color: "#1e3a5f", lineHeight: 1.9,
                }}>
                  {group.group_summary}
                </div>
              )}

              {/* Top5 badge */}
              {group.top5_features?.length > 0 && (
                <div style={{ marginBottom: 12, display: "flex", gap: 6, alignItems: "center" }}>
                  <Tag size="small" color="orangered">Top5 显著特征</Tag>
                  {group.top5_features.map((f) => (
                    <Tag key={f.feature_id} size="small" color="arcoblue">{f.feature_name}</Tag>
                  ))}
                </div>
              )}

              {/* Feature charts in grid */}
              <Row gutter={[16, 16]}>
                {group.features.map((f) => (
                  <Col key={f.feature_id} span={f.chart_type === "metric_card" ? 6 : f.chart_type === "line" ? 24 : 8}>
                    <div style={{ position: "relative" }}>
                      {f.is_top5 && (
                        <div style={{
                          position: "absolute", top: 4, right: 4, zIndex: 1,
                          fontSize: 10, padding: "2px 6px", borderRadius: 4,
                          background: "#ef4444", color: "#fff", fontWeight: 600,
                        }}>TOP</div>
                      )}
                      <FeatureChart feature={f} />
                      {f.llm_insight && (
                        <div style={{
                          marginTop: 6, padding: "6px 10px", fontSize: 12,
                          color: C.textSec, lineHeight: 1.6,
                          background: `${C.primary}06`, borderRadius: 6,
                          borderLeft: `3px solid ${C.accent}`,
                        }}>
                          💡 {f.llm_insight}
                        </div>
                      )}
                    </div>
                  </Col>
                ))}
              </Row>
            </Section>
          ))}

          {/* Chapter 4: Correlation Insights */}
          {report.correlation_insights?.length > 0 && (
            <Section title="三、相关性洞察" icon={<IconThunderbolt />}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {report.correlation_insights.map((r, i) => (
                  <div key={i} style={{
                    padding: "14px 18px", borderRadius: RADIUS.md,
                    background: r.type === "enum_enum" ? `${C.accent}06` : `${C.info}06`,
                    border: `1px solid ${r.type === "enum_enum" ? C.accent : C.info}30`,
                  }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <Tag size="small" color={r.type === "enum_enum" ? "purple" : "blue"}>
                        {r.type === "enum_enum" ? `Lift ${r.lift}` : `${r.ratio}倍`}
                      </Tag>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                        {r.antecedent} → {r.consequent}
                      </span>
                    </div>
                    <div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.7 }}>
                      💡 {r.llm_insight || r.insight || "暂无洞察"}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Chapter 5: Recommendations */}
          {report.recommendations && (
            <Section title="四、营销运营建议" icon={<IconSafe />}>
              {report.recommendations.marketing_directions?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>🎯 营销方向</div>
                  {report.recommendations.marketing_directions.map((d, i) => (
                    <div key={i} style={{
                      padding: "8px 14px", marginBottom: 6, borderRadius: 6,
                      background: "#f8f9fb", borderLeft: "3px solid #c9a84c",
                      fontSize: 13, color: C.textSec,
                    }}>{d}</div>
                  ))}
                </div>
              )}
              {report.recommendations.priority_customers && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>👤 重点跟进客户</div>
                  <div style={{ padding: "8px 14px", borderRadius: 6, background: "#fef2f2", borderLeft: "3px solid #ef4444", fontSize: 13, color: C.textSec }}>
                    {report.recommendations.priority_customers}
                  </div>
                </div>
              )}
              {report.recommendations.cross_sell_opportunities?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>🔄 交叉销售机会</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {report.recommendations.cross_sell_opportunities.map((p, i) => (
                      <Tag key={i} size="small" color="green">{p}</Tag>
                    ))}
                  </div>
                </div>
              )}
              {report.recommendations.marketing_script && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>📝 营销话术</div>
                  <div style={{
                    padding: "14px 18px", borderRadius: RADIUS.md,
                    background: `linear-gradient(135deg, ${C.primary}08, ${C.accent}08)`,
                    border: `1px solid ${C.accent}30`,
                    fontSize: 13, lineHeight: 1.8, color: C.textSec,
                    fontStyle: "italic",
                  }}>
                    "{report.recommendations.marketing_script}"
                  </div>
                </div>
              )}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}
