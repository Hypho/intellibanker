import React, { useState, useRef, useEffect } from "react";
import { Input, Button, Tag } from "@arco-design/web-react";
import { IconRobot, IconSend, IconDelete, IconTool } from "@arco-design/web-react/icon";
import { api } from "../api/client";
import { C, FONT_MONO, GRADIENT_SUBTLE, RADIUS, SECTION_STYLE } from "../theme";

const SUGGESTIONS = [
  "查看全行经营数据概览",
  "有哪些流失预警客户？",
  "帮我分析客户 P001 的画像",
  "高净值客户有哪些？推荐什么产品？",
  "企业客户 E005 的拜访建议",
];

const TOOL_NAME_MAP = {
  list_personal_customers_summary: "查询个人客户列表",
  list_enterprise_customers_summary: "查询企业客户列表",
  get_customer_detail: "查询客户详情",
  get_customer_profile_summary: "查询客户画像",
  get_visit_suggestions: "获取拜访建议",
  get_insight_overview: "查询经营概览",
  get_high_risk_customers: "查询流失预警客户",
  derive_customer_tags_and_tasks: "推导标签和任务",
};

function ToolEvent({ te }) {
  const isCall = te.event === "tool_call";
  return (
    <div style={{
      padding: "6px 12px", margin: "4px 0", borderRadius: RADIUS.sm,
      background: isCall ? "#eff6ff" : "#f0fdf4",
      border: `1px solid ${isCall ? "#bfdbfe" : "#bbf7d0"}`,
      fontSize: 12, fontFamily: FONT_MONO,
    }}>
      <Tag size="small" color={isCall ? "blue" : "green"} style={{ marginRight: 8 }}>
        {isCall ? "调用工具" : "工具结果"}
      </Tag>
      <span style={{ fontWeight: 600, color: C.text }}>
        {TOOL_NAME_MAP[te.name] || te.name}
      </span>
      {!isCall && te.content && (
        <div style={{
          marginTop: 4, color: C.textSec, fontSize: 11,
          maxHeight: 80, overflow: "auto", whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}>
          {te.content.length > 200 ? te.content.slice(0, 200) + "..." : te.content}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex", justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 16, padding: "0 16px",
    }}>
      {!isUser && (
        <div style={{
          width: 32, height: 32, borderRadius: 8, marginRight: 10, flexShrink: 0,
          background: GRADIENT_SUBTLE, border: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <IconRobot style={{ fontSize: 16, color: C.primary }} />
        </div>
      )}
      <div style={{ maxWidth: "75%" }}>
        {msg.toolEvents?.map((te, i) => <ToolEvent key={i} te={te} />)}
        {(msg.content || msg.isStreaming) && (
          <div style={{
            padding: "10px 16px", borderRadius: RADIUS.md,
            background: isUser ? C.primary : C.card,
            color: isUser ? "#fff" : C.text,
            border: isUser ? "none" : `1px solid ${C.border}`,
            fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap",
            boxShadow: isUser ? "none" : "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            {msg.content}
            {msg.isStreaming && <span style={{ animation: "blink 1s infinite" }}>|</span>}
          </div>
        )}
        {msg.isStreaming && !msg.content && !msg.toolEvents?.length && (
          <div style={{
            padding: "10px 16px", borderRadius: RADIUS.md,
            background: C.card, border: `1px solid ${C.border}`,
            color: C.textMuted, fontSize: 13,
          }}>
            <IconRobot style={{ marginRight: 6 }} />思考中...
          </div>
        )}
        {msg.error && (
          <div style={{
            padding: "10px 16px", borderRadius: RADIUS.md,
            background: "#fef2f2", border: "1px solid #fecaca",
            color: C.danger, fontSize: 13,
          }}>
            {msg.error}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Assistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const streamRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (text) => {
    const content = (text || input).trim();
    if (!content || isStreaming) return;

    const userMsg = { role: "user", content };
    const assistantMsg = { role: "assistant", content: "", toolEvents: [], isStreaming: true };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);

    const history = messages
      .filter((m) => !m.isStreaming && !m.error)
      .map((m) => ({ role: m.role, content: m.content }));

    const controller = api.streamChat(content, history, ({ event, data }) => {
      if (event === "tool_call") {
        setMessages((prev) => {
          const next = [...prev];
          const last = { ...next[next.length - 1] };
          last.toolEvents = [...(last.toolEvents || []), { event: "tool_call", name: data.name, args: data.args }];
          next[next.length - 1] = last;
          return next;
        });
      } else if (event === "tool_result") {
        setMessages((prev) => {
          const next = [...prev];
          const last = { ...next[next.length - 1] };
          last.toolEvents = [...(last.toolEvents || []), { event: "tool_result", name: data.name, content: data.content }];
          next[next.length - 1] = last;
          return next;
        });
      } else if (event === "answer") {
        setMessages((prev) => {
          const next = [...prev];
          const last = { ...next[next.length - 1] };
          last.content = (last.content || "") + data.content;
          next[next.length - 1] = last;
          return next;
        });
      } else if (event === "error") {
        setMessages((prev) => {
          const next = [...prev];
          const last = { ...next[next.length - 1] };
          last.isStreaming = false;
          last.error = data.message;
          next[next.length - 1] = last;
          return next;
        });
        setIsStreaming(false);
      } else if (event === "done") {
        setMessages((prev) => {
          const next = [...prev];
          const last = { ...next[next.length - 1] };
          last.isStreaming = false;
          next[next.length - 1] = last;
          return next;
        });
        setIsStreaming(false);
      }
    });
    streamRef.current = controller;
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const clearChat = () => {
    if (streamRef.current) streamRef.current.abort();
    setMessages([]);
    setIsStreaming(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 56px - 48px)" }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 16, padding: "16px 24px",
        background: GRADIENT_SUBTLE, borderRadius: RADIUS.lg,
        border: `1px solid ${C.border}`, ...SECTION_STYLE,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconRobot style={{ fontSize: 22, color: C.primary }} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: "0.02em" }}>智能助手</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>基于 LangGraph Agent 的多步推理对话</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Tag size="small" color="arcoblue">DeepSeek</Tag>
          <Tag size="small" color="green">LangGraph</Tag>
          <Button
            type="outline" size="mini" icon={<IconDelete />}
            onClick={clearChat}
            style={{ borderRadius: RADIUS.sm, borderColor: C.border, color: C.textSec, marginLeft: 8 }}
          >
            清空
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{
        flex: 1, overflow: "auto", padding: "8px 0",
        background: C.bg, borderRadius: RADIUS.md,
      }}>
        {messages.length === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "100%", padding: 40,
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16, marginBottom: 20,
              background: GRADIENT_SUBTLE, border: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <IconRobot style={{ fontSize: 28, color: C.primary }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text, marginBottom: 8 }}>
              你好，我是智能营销助手
            </div>
            <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 28, textAlign: "center" }}>
              我可以帮你分析客户数据、查询经营指标、生成营销建议。<br />
              试试下面的问题：
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 500 }}>
              {SUGGESTIONS.map((s) => (
                <div
                  key={s}
                  onClick={() => sendMessage(s)}
                  style={{
                    padding: "8px 16px", borderRadius: RADIUS.sm, cursor: "pointer",
                    background: C.card, border: `1px solid ${C.border}`,
                    fontSize: 13, color: C.textSec, transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.textSec; }}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)
        )}
      </div>

      {/* Input */}
      <div style={{
        display: "flex", gap: 10, padding: "12px 0 0",
        borderTop: `1px solid ${C.border}`, marginTop: 12,
      }}>
        <Input.TextArea
          ref={inputRef}
          value={input}
          onChange={setInput}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? "助手正在回答中..." : "输入问题，按 Enter 发送..."}
          disabled={isStreaming}
          autoSize={{ minRows: 1, maxRows: 4 }}
          style={{ flex: 1, borderRadius: RADIUS.sm }}
        />
        <Button
          type="primary"
          icon={<IconSend />}
          onClick={() => sendMessage()}
          disabled={!input.trim() || isStreaming}
          style={{ borderRadius: RADIUS.sm, height: "auto", alignSelf: "flex-end" }}
        >
          发送
        </Button>
      </div>

      {/* Blink animation */}
      <style>{`@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
    </div>
  );
}
