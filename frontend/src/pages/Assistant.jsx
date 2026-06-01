import React, { useState, useRef, useEffect, useCallback } from "react";
import { Input, Button, Tag, Spin } from "@arco-design/web-react";
import { IconRobot, IconSend, IconDelete, IconCode, IconCopy, IconCheck } from "@arco-design/web-react/icon";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
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

/* ── Tool events: collapsible section ── */
function ToolEventsPanel({ toolEvents }) {
  if (!toolEvents?.length) return null;
  const callCount = toolEvents.filter((t) => t.event === "tool_call").length;
  return (
    <details style={{ marginBottom: 8 }}>
      <summary style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 12px", borderRadius: RADIUS.sm,
        background: "#f8fafc", border: `1px solid ${C.border}`,
        cursor: "pointer", fontSize: 12, color: C.textSec,
        listStyle: "none",
      }}>
        <IconCode style={{ fontSize: 13, color: C.info }} />
        <span>调用了 <b>{callCount}</b> 个工具</span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: C.textDim }}>点击展开</span>
      </summary>
      <div style={{ padding: "6px 0 0 4px" }}>
        {toolEvents.map((te, i) => (
          <ToolEventLine key={i} te={te} />
        ))}
      </div>
    </details>
  );
}

function ToolEventLine({ te }) {
  const isCall = te.event === "tool_call";
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 8,
      padding: "4px 8px", margin: "2px 0", borderRadius: 6,
      background: isCall ? "#eff6ff" : "#f0fdf4",
      border: `1px solid ${isCall ? "#bfdbfe" : "#bbf7d0"}`,
      fontSize: 12, fontFamily: FONT_MONO,
    }}>
      <Tag size="small" color={isCall ? "blue" : "green"} style={{ flexShrink: 0 }}>
        {isCall ? "调用" : "结果"}
      </Tag>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 600, color: C.text }}>
          {TOOL_NAME_MAP[te.name] || te.name}
        </span>
        {!isCall && te.content && (
          <div style={{
            marginTop: 2, color: C.textSec, fontSize: 11,
            maxHeight: 60, overflow: "auto", whiteSpace: "pre-wrap",
            wordBreak: "break-all",
          }}>
            {te.content.length > 200 ? te.content.slice(0, 200) + "..." : te.content}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Thinking indicator ── */
function ThinkingIndicator({ toolEvents }) {
  const lastCall = [...(toolEvents || [])].reverse().find((t) => t.event === "tool_call");
  const lastResult = [...(toolEvents || [])].reverse().find((t) => t.event === "tool_result");
  const hasResults = toolEvents?.some((t) => t.event === "tool_result");

  let statusText = "正在思考...";
  if (lastCall && !lastResult) {
    statusText = `正在调用 ${TOOL_NAME_MAP[lastCall.name] || lastCall.name}...`;
  } else if (hasResults && !lastResult) {
    statusText = "正在分析数据...";
  } else if (hasResults) {
    statusText = "正在生成回答...";
  }

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "8px 14px", borderRadius: RADIUS.md,
      background: C.card, border: `1px solid ${C.border}`,
      color: C.textMuted, fontSize: 13,
    }}>
      <Spin size={14} />
      <span>{statusText}</span>
    </div>
  );
}

/* ── Code block with copy button + syntax highlighting ── */
function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, "");

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div style={{ position: "relative", margin: "6px 0 10px", borderRadius: RADIUS.sm, overflow: "hidden" }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "4px 12px", background: "#161b22", borderBottom: "1px solid #30363d",
      }}>
        <span style={{ fontSize: 11, color: "#8b949e", fontFamily: FONT_MONO }}>{language || "code"}</span>
        <button
          onClick={handleCopy}
          style={{
            display: "flex", alignItems: "center", gap: 4, background: "none", border: "none",
            cursor: "pointer", color: copied ? "#3fb950" : "#8b949e", fontSize: 11, padding: "2px 6px",
          }}
        >
          {copied ? <IconCheck style={{ fontSize: 12 }} /> : <IconCopy style={{ fontSize: 12 }} />}
          {copied ? "已复制" : "复制"}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || "text"}
        style={oneDark}
        customStyle={{
          margin: 0, borderRadius: 0, padding: "10px 14px",
          fontSize: 12.5, fontFamily: FONT_MONO, lineHeight: 1.6,
          background: "#1e2127",
        }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

/* ── Markdown renderer (GFM + syntax highlighting) ── */
function MarkdownContent({ content }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p style={{ margin: "0 0 8px", lineHeight: 1.7 }}>{children}</p>,
        ul: ({ children }) => <ul style={{ margin: "4px 0 8px 18px", lineHeight: 1.7 }}>{children}</ul>,
        ol: ({ children }) => <ol style={{ margin: "4px 0 8px 18px", lineHeight: 1.7 }}>{children}</ol>,
        li: ({ children }) => <li style={{ marginBottom: 2 }}>{children}</li>,
        h1: ({ children }) => <h1 style={{ fontSize: 18, fontWeight: 700, margin: "14px 0 8px", borderBottom: `1px solid ${C.border}`, paddingBottom: 6 }}>{children}</h1>,
        h2: ({ children }) => <h2 style={{ fontSize: 16, fontWeight: 700, margin: "12px 0 6px" }}>{children}</h2>,
        h3: ({ children }) => <h3 style={{ fontSize: 14, fontWeight: 600, margin: "10px 0 4px" }}>{children}</h3>,
        strong: ({ children }) => <strong style={{ fontWeight: 600, color: C.text }}>{children}</strong>,
        em: ({ children }) => <em style={{ color: C.textSec }}>{children}</em>,
        del: ({ children }) => <del style={{ color: C.textDim }}>{children}</del>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: C.info, textDecoration: "none" }}>{children}</a>
        ),
        hr: () => <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "12px 0" }} />,
        code: ({ children, className }) => {
          const match = /language-(\w+)/.exec(className || "");
          if (match) {
            return <CodeBlock language={match[1]}>{children}</CodeBlock>;
          }
          if (className) {
            return <CodeBlock language={className.replace("language-", "")}>{children}</CodeBlock>;
          }
          return (
            <code style={{
              background: "#f1f5f9", color: "#d63384", padding: "1px 5px",
              borderRadius: 4, fontSize: "0.9em", fontFamily: FONT_MONO,
            }}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => <>{children}</>,
        table: ({ children }) => (
          <div style={{ overflow: "auto", margin: "6px 0 10px", borderRadius: RADIUS.sm, border: `1px solid ${C.border}` }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 12.5 }}>{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead style={{ background: "#f8fafc" }}>{children}</thead>,
        th: ({ children }) => (
          <th style={{ border: `1px solid ${C.border}`, padding: "7px 12px", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap" }}>{children}</th>
        ),
        td: ({ children }) => (
          <td style={{ border: `1px solid ${C.border}`, padding: "6px 12px" }}>{children}</td>
        ),
        tr: ({ children }) => <tr style={{ borderBottom: `1px solid ${C.border}` }}>{children}</tr>,
        blockquote: ({ children }) => (
          <blockquote style={{
            borderLeft: `3px solid ${C.accent}`, paddingLeft: 12,
            margin: "6px 0 10px", color: C.textSec, background: `${C.accent}06`,
            padding: "8px 12px", borderRadius: `0 ${RADIUS.sm}px ${RADIUS.sm}px 0`,
          }}>
            {children}
          </blockquote>
        ),
        input: ({ type, checked, disabled }) => {
          if (type === "checkbox") {
            return (
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                readOnly
                style={{ marginRight: 6, accentColor: C.primary }}
              />
            );
          }
          return <input type={type} />;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

/* ── Message bubble ── */
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
        {/* Tool events (collapsible) */}
        {msg.toolEvents?.length > 0 && <ToolEventsPanel toolEvents={msg.toolEvents} />}

        {/* Thinking indicator (while streaming, before content appears) */}
        {msg.isStreaming && !msg.content && <ThinkingIndicator toolEvents={msg.toolEvents} />}

        {/* Answer content (Markdown) */}
        {(msg.content || (msg.isStreaming && msg.content)) && (
          <div style={{
            padding: "10px 16px", borderRadius: RADIUS.md,
            background: isUser ? C.primary : C.card,
            color: isUser ? "#fff" : C.text,
            border: isUser ? "none" : `1px solid ${C.border}`,
            fontSize: 14, lineHeight: 1.7,
            boxShadow: isUser ? "none" : "0 1px 4px rgba(0,0,0,0.04)",
          }}>
            {isUser ? (
              <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
            ) : (
              <MarkdownContent content={msg.content} />
            )}
            {msg.isStreaming && <span style={{ animation: "blink 1s infinite" }}>|</span>}
          </div>
        )}

        {/* Error */}
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

/* ── Session sidebar item ── */
function SessionItem({ s, active, onClick, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "8px 14px", cursor: "pointer", transition: "background 0.15s",
        background: active ? `${C.primary}0a` : hovered ? "#f8fafc" : "transparent",
        borderLeft: active ? `2px solid ${C.primary}` : "2px solid transparent",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 12.5, color: C.text, overflow: "hidden",
          textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {s.title || "未命名对话"}
        </div>
        <div style={{ fontSize: 10.5, color: C.textDim, marginTop: 2 }}>
          {(s.updated_at || "").slice(0, 16).replace("T", " ")}
        </div>
      </div>
      <IconDelete
        style={{ fontSize: 12, color: C.textDim, cursor: "pointer", flexShrink: 0, marginLeft: 4 }}
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      />
    </div>
  );
}

/* ── Main component ── */
export default function Assistant({ role = "admin" }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);
  const streamRef = useRef(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const saveTimerRef = useRef(null);
  const sessionIdRef = useRef(null);
  const roleRef = useRef(role);
  roleRef.current = role;

  // Load sessions list on mount
  useEffect(() => {
    api.listChatSessions(role).then((d) => setSessions(d.sessions || [])).catch(() => {});
  }, [role]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-save after conversation updates (debounced)
  const scheduleSave = (msgs) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (msgs.length >= 2) {
        const cleanMsgs = msgs.filter((m) => !m.isStreaming).map(({ role, content, toolEvents }) => ({
          role, content, toolEvents: toolEvents || [],
        }));
        if (cleanMsgs.length >= 2) {
          api.saveChatSession(roleRef.current, cleanMsgs, "", sessionIdRef.current).then((d) => {
            if (d.session_id && !sessionIdRef.current) {
              sessionIdRef.current = d.session_id;
              setSessionId(d.session_id);
            }
            // Update sessions list locally instead of re-fetching
            setSessions((prev) => {
              const exists = prev.find((s) => s.id === d.session_id);
              if (exists) {
                return prev.map((s) => s.id === d.session_id ? { ...s, title: d.title || s.title, updated_at: new Date().toISOString() } : s);
              }
              return [{ id: d.session_id, role: roleRef.current, title: d.title || "", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, ...prev];
            });
          }).catch(() => {});
        }
      }
    }, 1500);
  };

  const loadSession = async (sid) => {
    try {
      const session = await api.loadChatSession(sid);
      const loadedMsgs = (session.messages || []).map((m) => ({
        ...m, toolEvents: m.toolEvents || [],
      }));
      setMessages(loadedMsgs);
      sessionIdRef.current = sid;
      setSessionId(sid);
    } catch { /* ignore */ }
  };

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
      const updateLast = (fn) => setMessages((prev) => [...prev.slice(0, -1), fn(prev[prev.length - 1])]);

      if (event === "tool_call") {
        updateLast((last) => ({ ...last, toolEvents: [...(last.toolEvents || []), { event: "tool_call", name: data.name, args: data.args }] }));
      } else if (event === "tool_result") {
        updateLast((last) => ({ ...last, toolEvents: [...(last.toolEvents || []), { event: "tool_result", name: data.name, content: data.content }] }));
      } else if (event === "answer") {
        updateLast((last) => ({ ...last, content: (last.content || "") + data.content }));
      } else if (event === "error") {
        updateLast((last) => ({ ...last, isStreaming: false, error: data.message }));
        setIsStreaming(false);
      } else if (event === "done") {
        setMessages((prev) => {
          const next = [...prev.slice(0, -1), { ...prev[prev.length - 1], isStreaming: false }];
          scheduleSave(next);
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
    sessionIdRef.current = null;
    setSessionId(null);
    setIsStreaming(false);
  };

  const deleteSession = async (sid) => {
    await api.deleteChatSession(sid).catch(() => {});
    setSessions((prev) => prev.filter((s) => s.id !== sid));
    if (sid === sessionId) clearChat();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ display: "flex", gap: 16, height: "calc(100vh - 56px - 48px)" }}>
      {/* Session sidebar */}
      <div style={{
        width: 220, flexShrink: 0, display: "flex", flexDirection: "column",
        background: C.card, borderRadius: RADIUS.lg, border: `1px solid ${C.border}`,
        overflow: "hidden",
      }}>
        <div style={{
          padding: "12px 14px", borderBottom: `1px solid ${C.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>历史对话</span>
          <Button type="text" size="mini" onClick={clearChat} style={{ fontSize: 12, color: C.info }}>+ 新建</Button>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: "4px 0" }}>
          {sessions.length === 0 ? (
            <div style={{ padding: "20px 14px", color: C.textDim, fontSize: 12, textAlign: "center" }}>暂无历史对话</div>
          ) : (
            sessions.map((s) => (
              <SessionItem
                key={s.id}
                s={s}
                active={sessionId === s.id}
                onClick={() => loadSession(s.id)}
                onDelete={() => deleteSession(s.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 16, padding: "14px 20px",
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
            {sessionId && <Tag size="small" color="orangered">已保存</Tag>}
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
      </div>

      {/* Blink animation */}
      <style>{`@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
    </div>
  );
}
