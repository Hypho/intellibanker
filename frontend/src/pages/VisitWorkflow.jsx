import React, { useState, useEffect } from "react";
import { api } from "../api/client";
import {
  Card, Grid, Steps, Button, Select, Input, Tag, Spin, Message, Timeline,
  Typography, Divider, Descriptions, Badge,
} from "@arco-design/web-react";
const { Row, Col } = Grid;

const { TextArea } = Input;
const { Text } = Typography;

const STAGES = ["before", "during", "after"];

export default function VisitWorkflow() {
  const [step, setStep] = useState(0);
  const [customerType, setCustomerType] = useState("personal");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [beforeData, setBeforeData] = useState(null);
  const [beforeLoading, setBeforeLoading] = useState(false);
  const [duringNotes, setDuringNotes] = useState("");
  const [duringLocation, setDuringLocation] = useState("");
  const [duringLoading, setDuringLoading] = useState(false);
  const [duringSaved, setDuringSaved] = useState(null); // 保存后返回的数据
  const [afterData, setAfterData] = useState(null);
  const [afterLoading, setAfterLoading] = useState(false);
  const [needs, setNeeds] = useState("");
  const [commitments, setCommitments] = useState("");
  const [objections, setObjections] = useState("");
  const [customerList, setCustomerList] = useState([]);

  useEffect(() => {
    loadCustomerList();
  }, [customerType]);

  const loadCustomerList = async () => {
    try {
      const res = customerType === "personal"
        ? await api.listPersonalProfiles({ page: 1, page_size: 50 })
        : await api.listEnterpriseProfiles({ page: 1, page_size: 50 });
      setCustomerList(res.data || []);
    } catch (e) {
      // silent
    }
  };

  const handleStartVisit = async () => {
    if (!selectedCustomer) {
      Message.warning("请先选择客户");
      return;
    }
    setBeforeLoading(true);
    try {
      const res = await api.visitWorkflow({
        customer_type: customerType,
        customer_id: selectedCustomer,
        manager_id: "M001",
        stage: "before",
        data: {},
      });
      setBeforeData(res);
      setStep(1);
      Message.success("拜访前准备已完成");
    } catch (e) {
      Message.error("拜访前准备失败：" + e.message);
    } finally {
      setBeforeLoading(false);
    }
  };

  const handleEndVisit = async () => {
    if (!duringNotes.trim()) {
      Message.warning("请录入沟通要点");
      return;
    }
    setDuringLoading(true);
    try {
      const res = await api.visitWorkflow({
        customer_type: customerType,
        customer_id: selectedCustomer,
        manager_id: "M001",
        stage: "during",
        data: { task_id: beforeData?.task_id, notes: duringNotes, location: duringLocation },
      });
      setDuringSaved(res);
      setStep(2);
      Message.success("拜访记录已保存");
    } catch (e) {
      Message.error("保存失败：" + e.message);
    } finally {
      setDuringLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setAfterLoading(true);
    try {
      const res = await api.visitWorkflow({
        customer_type: customerType,
        customer_id: selectedCustomer,
        manager_id: "M001",
        stage: "after",
        data: {
          task_id: beforeData?.task_id,
          needs,
          commitments,
          objections,
        },
      });
      setAfterData(res);
      Message.success("拜访纪要已生成");
    } catch (e) {
      Message.error("生成失败：" + e.message);
    } finally {
      setAfterLoading(false);
    }
  };

  const resetAll = () => {
    setStep(0);
    setSelectedCustomer(null);
    setBeforeData(null);
    setDuringNotes("");
    setDuringLocation("");
    setDuringSaved(null);
    setAfterData(null);
    setNeeds("");
    setCommitments("");
    setObjections("");
  };

  const formatMoney = (v) =>
    v >= 100000000 ? (v / 100000000).toFixed(1) + "亿"
    : v >= 10000 ? (v / 10000).toFixed(0) + "万"
    : v ? v.toLocaleString() : "0";

  const TAG_COLORS = {
    高响应: "green", 中响应: "blue", 低响应: "orange", 未触达: "gray",
    大众客户: "gray", 成长型客户: "blue", 中端客户: "arcoblue", 高净值客户: "gold",
    新客户: "green", 成熟期: "cyan", 衰退期: "orange", 流失预警: "red",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600, color: "#1a212a" }}>客户拜访流程</div>
        {step > 0 && (
          <Button size="small" onClick={resetAll}>重置流程</Button>
        )}
      </div>

      {/* Steps */}
      <Card style={{ marginBottom: 20 }}>
        <Steps current={step} size="small" style={{ marginBottom: 4 }}>
          <Steps.Step title="拜访前准备" description="系统自动推送画像与建议" />
          <Steps.Step title="拜访中记录" description="现场录入沟通要点" />
          <Steps.Step title="拜访后纪要" description="AI自动生成纪要与跟进任务" />
        </Steps>
      </Card>

      {/* ── Step 0: Select customer ── */}
      {step === 0 && (
        <Card title="选择拜访客户">
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ width: 200 }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>客户类型</div>
              <Select
                value={customerType}
                onChange={(v) => { setCustomerType(v); setSelectedCustomer(null); }}
                options={[{ label: "个人客户", value: "personal" }, { label: "企业客户", value: "enterprise" }]}
                style={{ width: "100%" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>选择客户</div>
              <Select
                showSearch
                value={selectedCustomer}
                onChange={setSelectedCustomer}
                options={customerList.map((c) => ({
                  label: `${c.id} - ${c.name}${c.asset_level ? " (" + c.asset_level + ")" : ""}${c.industry ? " (" + c.industry + ")" : ""}`,
                  value: c.id,
                }))}
                style={{ width: "100%" }}
                placeholder="搜索并选择客户"
              />
            </div>
            <div style={{ paddingTop: 28 }}>
              <Button
                type="primary"
                disabled={!selectedCustomer}
                loading={beforeLoading}
                onClick={handleStartVisit}
                style={{ background: "#1a3a5c", borderColor: "#1a3a5c" }}
              >
                开始拜访准备
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ── Step 1: Before visit ── */}
      {step === 1 && beforeData && (
        <div>
          {/* 任务信息 */}
          <Card style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#6b7280", flexWrap: "wrap" }}>
              <span>任务ID：<Text code style={{ fontSize: 12 }}>{beforeData.task_id}</Text></span>
              <span>客户：<strong style={{ color: "#1a3a5c" }}>{beforeData.customer_name}</strong></span>
              <span>类型：<Tag size="small">{customerType === "personal" ? "个人" : "企业"}</Tag></span>
              <Badge status="processing" text={<span style={{ fontSize: 12, color: "#165dff" }}>拜访前准备就绪</span>} />
            </div>
          </Card>

          {/* 画像摘要 + 触发事件 */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card title="📋 客户画像摘要">
                {beforeData.profile_summary && (
                  customerType === "personal" ? (
                    <div>
                      <Row gutter={[12, 8]}>
                        <Col span={8}>
                          <div style={{ fontSize: 12, color: "#9ca3af" }}>资产等级</div>
                          <Tag color={TAG_COLORS[beforeData.profile_summary.asset_level]}>{beforeData.profile_summary.asset_level}</Tag>
                        </Col>
                        <Col span={8}>
                          <div style={{ fontSize: 12, color: "#9ca3af" }}>生命周期</div>
                          <Tag color={TAG_COLORS[beforeData.profile_summary.lifecycle]}>{beforeData.profile_summary.lifecycle}</Tag>
                        </Col>
                        <Col span={8}>
                          <div style={{ fontSize: 12, color: "#9ca3af" }}>风险偏好</div>
                          <div style={{ fontSize: 13, color: "#374151" }}>{beforeData.profile_summary.risk_preference}</div>
                        </Col>
                        <Col span={12}>
                          <div style={{ fontSize: 12, color: "#9ca3af" }}>AUM</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "#1a3a5c" }}>{formatMoney(beforeData.profile_summary.aum)}</div>
                        </Col>
                        <Col span={12}>
                          <div style={{ fontSize: 12, color: "#9ca3af" }}>持有产品</div>
                          <div style={{ fontSize: 15, color: "#1a3a5c" }}>{beforeData.profile_summary.products_count} 个</div>
                        </Col>
                        <Col span={24}>
                          <div style={{ fontSize: 12, color: "#9ca3af" }}>流失概率</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: "#e5e7eb", borderRadius: 3 }}>
                              <div style={{ width: (beforeData.profile_summary.churn_probability * 100) + "%", height: "100%", background: beforeData.profile_summary.churn_probability > 0.5 ? "#f53f3f" : "#00b42a", borderRadius: 3 }} />
                            </div>
                            <span style={{ fontSize: 12, color: "#6b7280" }}>{(beforeData.profile_summary.churn_probability * 100).toFixed(0)}%</span>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  ) : (
                    <div>
                      <Row gutter={[12, 8]}>
                        <Col span={8}>
                          <div style={{ fontSize: 12, color: "#9ca3af" }}>行业</div>
                          <Tag>{beforeData.profile_summary.industry}</Tag>
                        </Col>
                        <Col span={16}>
                          <div style={{ fontSize: 12, color: "#9ca3af" }}>授信使用</div>
                          <div style={{ fontSize: 13 }}>{formatMoney(beforeData.profile_summary.credit_used)} / {formatMoney(beforeData.profile_summary.credit_limit)}</div>
                        </Col>
                        <Col span={12}>
                          <div style={{ fontSize: 12, color: "#9ca3af" }}>存款沉淀</div>
                          <div style={{ fontSize: 15, color: "#1a3a5c" }}>{formatMoney(beforeData.profile_summary.deposit_balance)}</div>
                        </Col>
                        <Col span={12}>
                          <div style={{ fontSize: 12, color: "#9ca3af" }}>舆情</div>
                          <Tag color={{ 正面: "green", 中性: "gray", 负面: "red" }[beforeData.profile_summary.sentiment] || "gray"}>
                            {beforeData.profile_summary.sentiment}
                          </Tag>
                        </Col>
                      </Row>
                    </div>
                  )
                )}
              </Card>
            </Col>
            <Col span={12}>
              <Card title="⚠️ 触发事件">
                {(beforeData.events || []).length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {beforeData.events.map((e, i) => (
                      <div key={i} style={{
                        padding: "8px 12px",
                        background: e.priority === "high" ? "#fef2f2" : "#f0f9ff",
                        borderRadius: 6,
                        borderLeft: `3px solid ${e.priority === "high" ? "#f53f3f" : "#165dff"}`,
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{e.description}</div>
                        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{e.action}</div>
                      </div>
                    ))}
                  </div>
                ) : <div style={{ color: "#9ca3af", fontSize: 13 }}>暂无触发事件</div>}
              </Card>
            </Col>
          </Row>

          {/* 拜访建议 + 推荐产品 */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <Card title="💬 拜访建议">
                {(beforeData.visit_suggestions || []).map((s, i) => (
                  <div key={i} style={{ fontSize: 13, color: "#374151", padding: "4px 0", borderBottom: "1px solid #f3f4f6", display: "flex", gap: 8 }}>
                    <span style={{ color: "#1a3a5c", fontWeight: 700 }}>·</span>
                    <span>{s}</span>
                  </div>
                ))}
              </Card>
            </Col>
            <Col span={12}>
              <Card title="📦 推荐产品">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(beforeData.recommended_products || []).map((p, i) => (
                    <Tag key={i} color="arcoblue" style={{ fontSize: 13, padding: "4px 10px" }}>{p}</Tag>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>

          {/* 拜访中录入 */}
          <Card title="📝 拜访中记录">
            <Row gutter={16}>
              <Col span={12}>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>开始时间</div>
                <div style={{ fontSize: 15, color: "#1a3a5c", fontFamily: "Georgia" }}>{new Date().toLocaleString("zh-CN")}</div>
              </Col>
              <Col span={12}>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>地点</div>
                <Input placeholder="录入拜访地点" value={duringLocation} onChange={setDuringLocation} />
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>沟通要点 <span style={{ color: "#f53f3f" }}>*</span></div>
              <TextArea
                placeholder="记录客户需求、承诺、异议..."
                value={duringNotes}
                onChange={setDuringNotes}
                rows={4}
                maxLength={500}
                showWordLimit
              />
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
              <Button type="primary" loading={duringLoading} onClick={handleEndVisit} style={{ background: "#1a3a5c", borderColor: "#1a3a5c" }}>
                结束拜访并保存
              </Button>
              <Button onClick={() => setStep(0)}>取消</Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Step 2: After visit ── */}
      {step === 2 && (
        <div>
          {/* 保存确认 */}
          {duringSaved && (
            <Card style={{ marginBottom: 16, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              <div style={{ display: "flex", gap: 24, fontSize: 13 }}>
                <div>
                  <span style={{ color: "#6b7280" }}>开始时间：</span>
                  <span style={{ color: "#1a3a5c" }}>{duringSaved.started_at ? new Date(duringSaved.started_at).toLocaleString("zh-CN") : "-"}</span>
                </div>
                <div>
                  <span style={{ color: "#6b7280" }}>地点：</span>
                  <span style={{ color: "#1a3a5c" }}>{duringSaved.location || "未录入"}</span>
                </div>
                <div>
                  <span style={{ color: "#6b7280" }}>沟通要点：</span>
                  <span style={{ color: "#1a3a5c" }}>{duringSaved.notes?.substring(0, 30)}{duringSaved.notes?.length > 30 ? "..." : ""}</span>
                </div>
                <Badge status="success" text={<span style={{ color: "#00b42a", fontSize: 13 }}>已保存</span>} />
              </div>
            </Card>
          )}

          <Card title="📋 拜访后信息录入" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={8}>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>客户需求</div>
                <TextArea placeholder="客户表达的需求..." value={needs} onChange={setNeeds} rows={3} />
              </Col>
              <Col span={8}>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>客户承诺</div>
                <TextArea placeholder="客户做出的承诺..." value={commitments} onChange={setCommitments} rows={3} />
              </Col>
              <Col span={8}>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>客户异议</div>
                <TextArea placeholder="客户提出的异议..." value={objections} onChange={setObjections} rows={3} />
              </Col>
            </Row>
            <div style={{ marginTop: 16 }}>
              <Button type="primary" loading={afterLoading} onClick={handleGenerateSummary} style={{ background: "#1a3a5c", borderColor: "#1a3a5c" }}>
                生成拜访纪要
              </Button>
            </div>
          </Card>

          {afterData && (
            <Row gutter={16}>
              <Col span={16}>
                <Card title="🤖 AI生成拜访纪要" style={{ marginBottom: 16 }}>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.8, color: "#374151" }}>
                    {afterData.auto_generated_summary}
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card title="🏷️ 标签更新" style={{ marginBottom: 16 }}>
                  {(afterData.tags_updated || []).length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {(afterData.tags_updated).map((t, i) => (
                        <Tag key={i} color="arcoblue" style={{ fontSize: 12 }}>{t.tag}：{t.value}</Tag>
                      ))}
                    </div>
                  ) : <div style={{ color: "#9ca3af", fontSize: 13 }}>无标签更新</div>}
                </Card>
                <Card title="📅 后续任务">
                  <Timeline
                    items={(afterData.follow_up_tasks || []).map((t, i) => ({
                      color: t.priority === "high" ? "red" : t.priority === "medium" ? "blue" : "gray",
                      content: (
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{t.task}</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>预计{t.due_days}天内完成</div>
                        </div>
                      ),
                    }))}
                  />
                </Card>
              </Col>
            </Row>
          )}
        </div>
      )}
    </div>
  );
}
