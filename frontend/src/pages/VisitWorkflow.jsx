import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import { Card, Grid, Steps, Button, Select, Input, Tag, Spin, Message, Timeline, Typography, Badge } from "@arco-design/web-react";
import { IconClockCircle, IconUser, IconSafe, IconStar } from "@arco-design/web-react/icon";
import { C, FONT_DISPLAY, FONT_MONO, GRADIENT_HERO, GRADIENT_ACCENT, GRADIENT_SUBTLE, RADIUS, SECTION_STYLE, formatMoney, TAG_COLORS } from "../theme";
import { Section, DataRow } from "../components/SharedWidgets";

const { Row, Col } = Grid;
const { TextArea } = Input;
const { Text } = Typography;

export default function VisitWorkflow({ role, roleConfig }) {
  const [step, setStep] = useState(0);
  const [customerType, setCustomerType] = useState("personal");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [beforeData, setBeforeData] = useState(null);
  const [beforeLoading, setBeforeLoading] = useState(false);
  const [duringNotes, setDuringNotes] = useState("");
  const [duringLocation, setDuringLocation] = useState("");
  const [duringLoading, setDuringLoading] = useState(false);
  const [duringSaved, setDuringSaved] = useState(null);
  const [afterData, setAfterData] = useState(null);
  const [afterLoading, setAfterLoading] = useState(false);
  const [needs, setNeeds] = useState("");
  const [commitments, setCommitments] = useState("");
  const [objections, setObjections] = useState("");
  const [customerList, setCustomerList] = useState([]);
  const [visitStartTime, setVisitStartTime] = useState("");

  useEffect(() => { loadCustomerList(); }, [customerType]);

  const loadCustomerList = async () => {
    try {
      const res = customerType === "personal"
        ? await api.listPersonalProfiles({ page: 1, page_size: 50 })
        : await api.listEnterpriseProfiles({ page: 1, page_size: 50 });
      setCustomerList(res.data || []);
    } catch (e) { /* silent */ }
  };

  const handleStartVisit = async () => {
    if (!selectedCustomer) { Message.warning("请先选择客户"); return; }
    setBeforeLoading(true);
    try {
      const res = await api.visitWorkflow({ customer_type: customerType, customer_id: selectedCustomer, manager_id: roleConfig?.managerId || "M001", stage: "before", data: {} });
      setBeforeData(res); setStep(1); Message.success("拜访前准备已完成");
    } catch (e) { Message.error("拜访前准备失败：" + e.message); }
    finally { setBeforeLoading(false); }
  };

  const handleEndVisit = async () => {
    if (!duringNotes.trim()) { Message.warning("请录入沟通要点"); return; }
    setDuringLoading(true);
    try {
      const res = await api.visitWorkflow({ customer_type: customerType, customer_id: selectedCustomer, manager_id: roleConfig?.managerId || "M001", stage: "during", data: { task_id: beforeData?.task_id, notes: duringNotes, location: duringLocation } });
      setDuringSaved(res); setStep(3); Message.success("拜访记录已保存");
    } catch (e) { Message.error("保存失败：" + e.message); }
    finally { setDuringLoading(false); }
  };

  const handleGenerateSummary = async () => {
    if (!needs.trim() && !commitments.trim()) { Message.warning("请至少录入客户需求或客户承诺"); return; }
    setAfterLoading(true);
    try {
      const res = await api.visitWorkflow({ customer_type: customerType, customer_id: selectedCustomer, manager_id: roleConfig?.managerId || "M001", stage: "after", data: { task_id: beforeData?.task_id, needs, commitments, objections } });
      setAfterData(res); Message.success("拜访纪要已生成");
      if (res.tags_updated?.length > 0) setTimeout(() => Message.info("客户标签已更新，下次查看画像可见"), 500);
    } catch (e) { Message.error("生成失败：" + e.message); }
    finally { setAfterLoading(false); }
  };

  const resetAll = () => {
    setStep(0); setSelectedCustomer(null); setBeforeData(null);
    setDuringNotes(""); setDuringLocation(""); setDuringSaved(null);
    setAfterData(null); setNeeds(""); setCommitments(""); setObjections("");
  };

  return (
    <div>
      {/* Page header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 24, padding: "20px 24px",
        background: GRADIENT_SUBTLE, borderRadius: RADIUS.lg,
        border: `1px solid ${C.border}`, ...SECTION_STYLE,
      }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: "0.02em" }}>客户拜访流程</div>
          <div style={{ fontSize: 12.5, color: C.textMuted, marginTop: 4 }}>拜访前 → 拜访中 → 拜访后 全链路管理</div>
        </div>
        {step > 0 && (
          <Button size="small" onClick={resetAll}
            style={{ borderRadius: RADIUS.sm, borderColor: C.border, color: C.textSec }}>重置流程</Button>
        )}
      </div>

      {/* Steps */}
      <div style={SECTION_STYLE}>
        <div style={{ padding: "20px 24px" }}>
          <Steps current={step === 0 ? 0 : step - 1} size="small">
            <Steps.Step title="拜访前准备" description="系统自动推送画像与建议" />
            <Steps.Step title="拜访中记录" description="现场录入沟通要点" />
            <Steps.Step title="拜访后纪要" description="AI自动生成纪要与跟进任务" />
          </Steps>
        </div>
      </div>

      {/* Step 0: Select customer */}
      {step === 0 && (
        <Section title="选择拜访客户" icon={<IconUser />}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ width: 200 }}>
              <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 6, fontWeight: 500 }}>客户类型</div>
              <Select value={customerType} onChange={(v) => { setCustomerType(v); setSelectedCustomer(null); }}
                options={[{ label: "个人客户", value: "personal" }, { label: "企业客户", value: "enterprise" }]}
                style={{ width: "100%" }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 6, fontWeight: 500 }}>选择客户</div>
              <Select showSearch value={selectedCustomer} onChange={setSelectedCustomer}
                options={customerList.map((c) => ({ label: `${c.id} - ${c.name}${c.asset_level ? " (" + c.asset_level + ")" : ""}${c.industry ? " (" + c.industry + ")" : ""}`, value: c.id }))}
                style={{ width: "100%" }} placeholder="搜索并选择客户" />
            </div>
            <div style={{ paddingTop: 24 }}>
              <Button type="primary" disabled={!selectedCustomer} loading={beforeLoading} onClick={handleStartVisit}
                style={{ background: C.primary, borderColor: C.primary, borderRadius: RADIUS.sm, minWidth: 140 }}>
                开始拜访准备
              </Button>
            </div>
          </div>
        </Section>
      )}

      {/* Step 1: Before visit */}
      {step === 1 && beforeData && (
        <div>
          {/* Task info bar */}
          <div style={{
            display: "flex", gap: 16, alignItems: "center", padding: "12px 20px",
            background: GRADIENT_SUBTLE, borderRadius: RADIUS.md,
            border: `1px solid ${C.border}`, marginBottom: 20, flexWrap: "wrap",
          }}>
            <span style={{ fontSize: 13, color: C.textMuted }}>任务ID：<Text code style={{ fontSize: 11.5, fontFamily: FONT_MONO }}>{beforeData.task_id}</Text></span>
            <span style={{ fontSize: 13, color: C.textMuted }}>客户：<strong style={{ color: C.primary }}>{beforeData.customer_name}</strong></span>
            <Tag size="small">{customerType === "personal" ? "个人" : "企业"}</Tag>
            <Badge status="processing" text={<span style={{ fontSize: 12, color: C.info }}>拜访前准备就绪</span>} />
          </div>

          <Row gutter={20}>
            <Col span={12}>
              <Section title="客户画像摘要" icon={<IconUser />}>
                {beforeData.profile_summary && (customerType === "personal" ? (
                  <div>
                    <Row gutter={[12, 8]}>
                      <Col span={8}><div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 4 }}>资产等级</div><Tag color={TAG_COLORS[beforeData.profile_summary.asset_level]}>{beforeData.profile_summary.asset_level}</Tag></Col>
                      <Col span={8}><div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 4 }}>生命周期</div><Tag color={TAG_COLORS[beforeData.profile_summary.lifecycle]}>{beforeData.profile_summary.lifecycle}</Tag></Col>
                      <Col span={8}><div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 4 }}>风险偏好</div><div style={{ fontSize: 13, color: C.textSec }}>{beforeData.profile_summary.risk_preference}</div></Col>
                      <Col span={12}><div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 4 }}>AUM</div><div style={{ fontSize: 18, fontWeight: 700, color: C.primary, fontFamily: FONT_DISPLAY }}>{formatMoney(beforeData.profile_summary.aum)}</div></Col>
                      <Col span={12}><div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 4 }}>持有产品</div><div style={{ fontSize: 15, color: C.primary, fontWeight: 600 }}>{beforeData.profile_summary.products_count} 个</div></Col>
                      <Col span={24}>
                        <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 4 }}>流失概率</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: C.border, borderRadius: 3 }}>
                            <div style={{ width: (beforeData.profile_summary.churn_probability * 100) + "%", height: "100%", background: beforeData.profile_summary.churn_probability > 0.5 ? C.danger : C.success, borderRadius: 3, transition: "width 0.5s" }} />
                          </div>
                          <span style={{ fontSize: 12, color: C.textMuted, fontFamily: FONT_DISPLAY, fontWeight: 600 }}>{(beforeData.profile_summary.churn_probability * 100).toFixed(0)}%</span>
                        </div>
                      </Col>
                    </Row>
                  </div>
                ) : (
                  <div>
                    <DataRow label="行业" value={beforeData.profile_summary.industry} />
                    <DataRow label="授信使用" value={`${formatMoney(beforeData.profile_summary.credit_used)} / ${formatMoney(beforeData.profile_summary.credit_limit)}`} />
                    <DataRow label="存款沉淀" value={<span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600 }}>{formatMoney(beforeData.profile_summary.deposit_balance)}</span>} />
                    <DataRow label="舆情" value={<Tag size="small" color={{ 正面: "green", 中性: "gray", 负面: "red" }[beforeData.profile_summary.sentiment]}>{beforeData.profile_summary.sentiment}</Tag>} />
                  </div>
                ))}
              </Section>
            </Col>
            <Col span={12}>
              <Section title="触发事件" icon={<IconClockCircle />}>
                {(beforeData.events || []).length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {beforeData.events.map((e, i) => (
                      <div key={i} style={{
                        padding: "10px 14px", borderRadius: RADIUS.sm,
                        background: e.priority === "high" ? "#fef2f2" : "#eff6ff",
                        borderLeft: `3px solid ${e.priority === "high" ? C.danger : C.info}`,
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{e.description}</div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{e.action}</div>
                      </div>
                    ))}
                  </div>
                ) : <div style={{ color: C.textDim, fontSize: 13, textAlign: "center", padding: 20 }}>暂无触发事件</div>}
              </Section>
            </Col>
          </Row>

          <Row gutter={20} style={{ marginBottom: 20 }}>
            <Col span={12}>
              <Section title="拜访建议" icon={<IconStar />} extra={<Tag size="small" color="arcoblue">推荐依据：资产分层+风险偏好</Tag>}>
                {(beforeData.visit_suggestions || []).map((s, i) => (
                  <div key={i} style={{ fontSize: 13, color: C.textSec, padding: "8px 0", borderBottom: `1px solid ${C.borderLt}`, display: "flex", gap: 8 }}>
                    <span style={{ color: C.accent, fontWeight: 700 }}>·</span><span>{s}</span>
                  </div>
                ))}
              </Section>
            </Col>
            <Col span={12}>
              <Section title="推荐产品" icon={<IconSafe />}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(beforeData.recommended_products || []).map((p, i) => (
                    <span key={i} style={{ fontSize: 13, padding: "5px 14px", borderRadius: 6, background: `${C.info}12`, color: C.info, fontWeight: 500, border: `1px solid ${C.info}30` }}>{p}</span>
                  ))}
                </div>
              </Section>
            </Col>
          </Row>

          <div style={{ display: "flex", justifyContent: "center", gap: 12, padding: "20px 0" }}>
            <Button type="primary" onClick={() => { setStep(2); setVisitStartTime(new Date().toLocaleString("zh-CN")); }}
              style={{ background: C.success, borderColor: C.success, borderRadius: RADIUS.sm, minWidth: 140, fontWeight: 600 }}>
              开始拜访
            </Button>
            <Button onClick={resetAll} style={{ borderRadius: RADIUS.sm }}>取消</Button>
          </div>
        </div>
      )}

      {/* Step 2: During visit */}
      {step === 2 && (
        <div>
          {beforeData && (
            <div style={{
              display: "flex", gap: 16, alignItems: "center", padding: "12px 20px",
              background: GRADIENT_SUBTLE, borderRadius: RADIUS.md,
              border: `1px solid ${C.border}`, marginBottom: 20,
            }}>
              <span style={{ fontSize: 13, color: C.textMuted }}>任务ID：<Text code style={{ fontSize: 11.5, fontFamily: FONT_MONO }}>{beforeData.task_id}</Text></span>
              <span style={{ fontSize: 13, color: C.textMuted }}>客户：<strong style={{ color: C.primary }}>{beforeData.customer_name}</strong></span>
              <Badge status="processing" text={<span style={{ fontSize: 12, color: C.info }}>拜访进行中</span>} />
            </div>
          )}
          <Section title="拜访中记录" icon={<IconClockCircle />}>
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 6, fontWeight: 500 }}>开始时间</div>
                <div style={{ fontSize: 15, color: C.primary, fontFamily: FONT_DISPLAY, fontWeight: 600 }}>{visitStartTime}（保存后以服务端时间为准）</div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 6, fontWeight: 500 }}>地点</div>
                <Input placeholder="录入拜访地点" value={duringLocation} onChange={setDuringLocation} />
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 6, fontWeight: 500 }}>沟通要点 <span style={{ color: C.danger }}>*</span></div>
              <TextArea placeholder="记录客户需求、承诺、异议..." value={duringNotes} onChange={setDuringNotes} rows={4} maxLength={500} showWordLimit />
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
              <Button type="primary" loading={duringLoading} onClick={handleEndVisit}
                style={{ background: C.primary, borderColor: C.primary, borderRadius: RADIUS.sm }}>结束拜访并保存</Button>
              <Button onClick={() => setStep(1)} style={{ borderRadius: RADIUS.sm }}>返回拜访前</Button>
            </div>
          </Section>
        </div>
      )}

      {/* Step 3: After visit */}
      {step === 3 && (
        <div>
          {duringSaved && (
            <div style={{
              display: "flex", gap: 24, fontSize: 13, padding: "14px 20px",
              background: "#f0fdf4", borderRadius: RADIUS.md,
              border: "1px solid #bbf7d0", marginBottom: 20,
            }}>
              <div><span style={{ color: C.textMuted }}>开始时间：</span><span style={{ color: C.primary }}>{duringSaved.started_at ? new Date(duringSaved.started_at).toLocaleString("zh-CN") : "-"}</span></div>
              <div><span style={{ color: C.textMuted }}>地点：</span><span style={{ color: C.primary }}>{duringSaved.location || "未录入"}</span></div>
              <div><span style={{ color: C.textMuted }}>沟通要点：</span><span style={{ color: C.primary }}>{duringSaved.notes?.substring(0, 30)}{duringSaved.notes?.length > 30 ? "..." : ""}</span></div>
              <Badge status="success" text={<span style={{ color: C.success, fontSize: 13 }}>已保存</span>} />
            </div>
          )}

          <Section title="拜访后信息录入" icon={<IconStar />}>
            <Row gutter={16}>
              <Col span={8}>
                <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 6, fontWeight: 500 }}>客户需求</div>
                <TextArea placeholder="客户表达的需求..." value={needs} onChange={setNeeds} rows={3} />
              </Col>
              <Col span={8}>
                <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 6, fontWeight: 500 }}>客户承诺</div>
                <TextArea placeholder="客户做出的承诺..." value={commitments} onChange={setCommitments} rows={3} />
              </Col>
              <Col span={8}>
                <div style={{ fontSize: 12.5, color: C.textMuted, marginBottom: 6, fontWeight: 500 }}>客户异议</div>
                <TextArea placeholder="客户提出的异议..." value={objections} onChange={setObjections} rows={3} />
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <Button type="primary" loading={afterLoading} onClick={handleGenerateSummary}
                style={{ background: C.primary, borderColor: C.primary, borderRadius: RADIUS.sm }}>生成拜访纪要</Button>
            </div>
          </Section>

          {afterData && (
            <Row gutter={20}>
              <Col span={16}>
                <Section title="AI生成拜访纪要" icon={<IconSafe />}
                  extra={<div style={{ display: "flex", gap: 6 }}>
                    <Tag size="small" color="purple">AI生成 · 基于客户画像+沟通记录</Tag>
                    {afterData.auto_generated_summary && !afterData.auto_generated_summary.includes("\n") && <Tag size="small" color="orange">基于模板生成</Tag>}
                  </div>}>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.8, color: C.textSec }}>
                    {afterData.auto_generated_summary}
                  </div>
                </Section>
              </Col>
              <Col span={8}>
                <Section title="标签更新" icon={<IconUser />}>
                  {(afterData.tags_updated || []).length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {afterData.tags_updated.map((t, i) => (
                        <span key={i} style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, background: `${C.info}12`, color: C.info, fontWeight: 500 }}>{t.tag}：{t.value}</span>
                      ))}
                    </div>
                  ) : <div style={{ color: C.textDim, fontSize: 13, textAlign: "center", padding: 16 }}>无标签更新</div>}
                </Section>
                <Section title="后续任务" icon={<IconClockCircle />}>
                  <Timeline items={(afterData.follow_up_tasks || []).map((t, i) => ({
                    color: t.priority === "high" ? "red" : t.priority === "medium" ? "blue" : "gray",
                    content: (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{t.task}</div>
                        <div style={{ fontSize: 12, color: C.textMuted }}>预计{t.due_days}天内完成</div>
                      </div>
                    ),
                  }))} />
                </Section>
              </Col>
            </Row>
          )}
        </div>
      )}
    </div>
  );
}
