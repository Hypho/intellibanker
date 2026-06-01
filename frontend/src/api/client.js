const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  // 洞察报告
  getInsightReport: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/insight/report?${qs}`);
  },

  // 画像列表
  listPersonalProfiles: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/profile/list/personal?${qs}`);
  },
  listEnterpriseProfiles: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/profile/list/enterprise?${qs}`);
  },

  // 画像详情
  getProfile: (type, id) => request(`/profile/${type}/${id}`),

  // AI内容（异步加载）
  getAiSummary: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/insight/ai-summary?${qs}`);
  },
  getAiNarrative: (type, id) => request(`/profile/${type}/${id}/ai-narrative`),

  // 拜访流程
  visitWorkflow: (body) =>
    request("/workflow/visit", { method: "POST", body: JSON.stringify(body) }),

  // 事件触发器
  getEventTriggers: (type, id) =>
    request(`/workflow/event-triggers?customer_type=${type}&customer_id=${id}`),

  // Agent chat (SSE streaming)
  streamChat: (message, history = [], onEvent) => {
    const controller = new AbortController();
    fetch(BASE + "/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history }),
      signal: controller.signal,
    })
      .then((res) => {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        function read() {
          reader.read().then(({ done, value }) => {
            if (done) { onEvent({ event: "done", data: {} }); return; }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();
            let eventType = null;
            for (const line of lines) {
              if (line.startsWith("event: ")) {
                eventType = line.slice(7).trim();
              } else if (line.startsWith("data: ") && eventType) {
                try {
                  const data = JSON.parse(line.slice(6));
                  onEvent({ event: eventType, data });
                } catch { /* skip */ }
                eventType = null;
              }
            }
            read();
          });
        }
        read();
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          onEvent({ event: "error", data: { message: err.message } });
        }
      });
    return controller;
  },

  // Report generation (SSE streaming, data-only protocol)
  streamReport: (params, onEvent) => {
    const qs = new URLSearchParams(params).toString();
    const controller = new AbortController();
    fetch(BASE + "/report/generate/stream?" + qs, { signal: controller.signal })
      .then((res) => {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        function read() {
          reader.read().then(({ done, value }) => {
            if (done) { onEvent({ event: "done", data: {} }); return; }
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop();
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  onEvent({ event: "data", data: JSON.parse(line.slice(6)) });
                } catch { /* skip */ }
              }
            }
            read();
          });
        }
        read();
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          onEvent({ event: "error", data: { message: err.message } });
        }
      });
    return controller;
  },

  // Chat session persistence
  saveChatSession: (role, messages, title, sessionId) =>
    request("/agent/chat/save", {
      method: "POST",
      body: JSON.stringify({ role, messages, title, session_id: sessionId }),
    }),
  listChatSessions: (role) =>
    request(`/agent/chat/sessions?role=${role}`),
  loadChatSession: (sessionId) =>
    request(`/agent/chat/sessions/${sessionId}`),
  deleteChatSession: (sessionId) =>
    request(`/agent/chat/sessions/${sessionId}`, { method: "DELETE" }),

  // Operation logs
  getLogs: (role, limit = 50) =>
    request(`/logs?role=${role || ""}&limit=${limit}`),

  // Report builder
  listReportThemes: () => request("/report/themes"),
  getReportTheme: (id) => request(`/report/themes/${id}`),
  generateReport: (themeId, user = "admin", managerId, branchId) =>
    request("/report/generate", {
      method: "POST",
      body: JSON.stringify({
        theme_id: themeId, user,
        manager_id: managerId || null,
        branch_id: branchId || null,
      }),
    }),
  getReport: (reportId) => request(`/report/${reportId}`),
  exportReportWord: (reportId) =>
    fetch(`${BASE}/report/${reportId}/export/word`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ desensitize: true }),
    }).then((res) => {
      if (!res.ok) throw new Error("导出失败");
      return res.blob();
    }),
  exportReportPdf: (reportId) =>
    fetch(`${BASE}/report/${reportId}/export/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ desensitize: true }),
    }).then((res) => {
      if (!res.ok) throw new Error("导出失败");
      return res.blob();
    }),
};
