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
};
