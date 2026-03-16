/* ------------------------------------------------------------------ */
/*  API client – communicates with the PrMS backend (port 4001)       */
/* ------------------------------------------------------------------ */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001";
const TOKEN_KEY = "prms_auth_token";

/* ---- Token helpers ------------------------------------------------ */

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/* ---- Snake ↔ camel conversion ------------------------------------- */

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** Recursively convert all object keys from snake_case to camelCase */
export function keysToCamel<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map((v) => keysToCamel(v)) as T;
  }
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    const entries = Object.entries(obj as Record<string, unknown>).map(
      ([k, v]) => [snakeToCamel(k), keysToCamel(v)]
    );
    return Object.fromEntries(entries) as T;
  }
  return obj as T;
}

/** Recursively convert all object keys from camelCase to snake_case */
export function keysToSnake<T>(obj: unknown): T {
  if (Array.isArray(obj)) {
    return obj.map((v) => keysToSnake(v)) as T;
  }
  if (obj !== null && typeof obj === "object" && !(obj instanceof Date)) {
    const entries = Object.entries(obj as Record<string, unknown>).map(
      ([k, v]) => [camelToSnake(k), keysToSnake(v)]
    );
    return Object.fromEntries(entries) as T;
  }
  return obj as T;
}

/* ---- API response type -------------------------------------------- */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/* ---- Enterprise request helper ------------------------------------ */

let _enterpriseId: string | null = null;

export function setEnterpriseId(id: string | null): void {
  _enterpriseId = id;
}

export function getEnterpriseId(): string | null {
  return _enterpriseId;
}

/* ---- Core fetch wrapper ------------------------------------------- */

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (_enterpriseId) {
    headers["x-enterprise-id"] = _enterpriseId;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const json = (await res.json()) as ApiResponse<unknown>;

  if (!res.ok || !json.success) {
    return {
      success: false,
      error: json.error || `Request failed (${res.status})`,
    };
  }

  // Convert snake_case keys from the backend to camelCase for the frontend
  return {
    success: true,
    data: json.data ? keysToCamel<T>(json.data) : undefined,
    message: json.message,
  };
}

/* ---- Typed HTTP method helpers ------------------------------------- */

export function get<T>(path: string): Promise<ApiResponse<T>> {
  return request<T>(path, { method: "GET" });
}

export function post<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  return request<T>(path, {
    method: "POST",
    body: body ? JSON.stringify(keysToSnake(body)) : undefined,
  });
}

export function put<T>(path: string, body?: unknown): Promise<ApiResponse<T>> {
  return request<T>(path, {
    method: "PUT",
    body: body ? JSON.stringify(keysToSnake(body)) : undefined,
  });
}

export function del<T = void>(path: string): Promise<ApiResponse<T>> {
  return request<T>(path, { method: "DELETE" });
}

/* ---- Resource-specific helpers ------------------------------------- */

export const api = {
  /* Auth */
  auth: {
    login: (email: string, password: string) =>
      post<{ token: string; user: Record<string, unknown> }>("/api/auth/login", { email, password }),
    register: (email: string, password: string, name: string) =>
      post<{ token: string; user: Record<string, unknown> }>("/api/auth/register", { email, password, name }),
    me: () => get<Record<string, unknown>>("/api/auth/me"),
  },

  /* Tasks */
  tasks: {
    list: () => get<Record<string, unknown>[]>("/api/tasks"),
    get: (id: string) => get<Record<string, unknown>>(`/api/tasks/${id}`),
    create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/tasks", data),
    update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/tasks/${id}`, data),
    delete: (id: string) => del(`/api/tasks/${id}`),
  },

  /* Events */
  events: {
    list: () => get<Record<string, unknown>[]>("/api/events"),
    get: (id: string) => get<Record<string, unknown>>(`/api/events/${id}`),
    create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/events", data),
    update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/events/${id}`, data),
    delete: (id: string) => del(`/api/events/${id}`),
  },

  /* Notes */
  notes: {
    list: () => get<Record<string, unknown>[]>("/api/notes"),
    get: (id: string) => get<Record<string, unknown>>(`/api/notes/${id}`),
    create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/notes", data),
    update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/notes/${id}`, data),
    delete: (id: string) => del(`/api/notes/${id}`),
  },

  /* Transactions */
  transactions: {
    list: () => get<Record<string, unknown>[]>("/api/transactions"),
    get: (id: string) => get<Record<string, unknown>>(`/api/transactions/${id}`),
    create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/transactions", data),
    update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/transactions/${id}`, data),
    delete: (id: string) => del(`/api/transactions/${id}`),
  },

  /* Budgets */
  budgets: {
    list: () => get<Record<string, unknown>[]>("/api/budgets"),
    get: (id: string) => get<Record<string, unknown>>(`/api/budgets/${id}`),
    create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/budgets", data),
    update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/budgets/${id}`, data),
    delete: (id: string) => del(`/api/budgets/${id}`),
  },

  /* Habits */
  habits: {
    list: () => get<Record<string, unknown>[]>("/api/habits"),
    get: (id: string) => get<Record<string, unknown>>(`/api/habits/${id}`),
    create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/habits", data),
    update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/habits/${id}`, data),
    delete: (id: string) => del(`/api/habits/${id}`),
    completions: (habitId: string) => get<Record<string, unknown>[]>(`/api/habits/${habitId}/completions`),
    complete: (habitId: string, data: Record<string, unknown>) =>
      post<Record<string, unknown>>(`/api/habits/${habitId}/completions`, data),
  },

  /* Goals */
  goals: {
    list: () => get<Record<string, unknown>[]>("/api/goals"),
    get: (id: string) => get<Record<string, unknown>>(`/api/goals/${id}`),
    create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/goals", data),
    update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/goals/${id}`, data),
    delete: (id: string) => del(`/api/goals/${id}`),
  },

  /* Journal */
  journal: {
    list: () => get<Record<string, unknown>[]>("/api/journal"),
    get: (id: string) => get<Record<string, unknown>>(`/api/journal/${id}`),
    create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/journal", data),
    update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/journal/${id}`, data),
    delete: (id: string) => del(`/api/journal/${id}`),
  },

  /* Focus Sessions */
  focusSessions: {
    list: () => get<Record<string, unknown>[]>("/api/focus-sessions"),
    get: (id: string) => get<Record<string, unknown>>(`/api/focus-sessions/${id}`),
    create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/focus-sessions", data),
    update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/focus-sessions/${id}`, data),
    delete: (id: string) => del(`/api/focus-sessions/${id}`),
  },

  /* Health Metrics */
  health: {
    list: () => get<Record<string, unknown>[]>("/api/health"),
    get: (id: string) => get<Record<string, unknown>>(`/api/health/${id}`),
    create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/health", data),
    update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/health/${id}`, data),
    delete: (id: string) => del(`/api/health/${id}`),
  },

  /* ---- Enterprise -------------------------------------------------- */

  enterprise: {
    create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/enterprise", data),
    list: () => get<Record<string, unknown>[]>("/api/enterprise"),
    get: () => get<Record<string, unknown>>("/api/enterprise/details"),
    update: (data: Record<string, unknown>) => put<Record<string, unknown>>("/api/enterprise", data),
    members: {
      list: () => get<Record<string, unknown>[]>("/api/enterprise/members"),
      add: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/enterprise/members", data),
      update: (userId: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/members/${userId}`, data),
      remove: (userId: string) => del(`/api/enterprise/members/${userId}`),
    },
  },

  projects: {
    list: () => get<Record<string, unknown>[]>("/api/enterprise/projects"),
    get: (id: string) => get<Record<string, unknown>>(`/api/enterprise/projects/${id}`),
    create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/enterprise/projects", data),
    update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/projects/${id}`, data),
    delete: (id: string) => del(`/api/enterprise/projects/${id}`),
    sprints: {
      list: (projectId: string) => get<Record<string, unknown>[]>(`/api/enterprise/projects/${projectId}/sprints`),
      create: (projectId: string, data: Record<string, unknown>) => post<Record<string, unknown>>(`/api/enterprise/projects/${projectId}/sprints`, data),
      update: (projectId: string, sprintId: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/projects/${projectId}/sprints/${sprintId}`, data),
    },
    tasks: {
      list: (projectId: string) => get<Record<string, unknown>[]>(`/api/enterprise/projects/${projectId}/tasks`),
      create: (projectId: string, data: Record<string, unknown>) => post<Record<string, unknown>>(`/api/enterprise/projects/${projectId}/tasks`, data),
      update: (projectId: string, taskId: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/projects/${projectId}/tasks/${taskId}`, data),
      delete: (projectId: string, taskId: string) => del(`/api/enterprise/projects/${projectId}/tasks/${taskId}`),
    },
    members: {
      list: (projectId: string) => get<Record<string, unknown>[]>(`/api/enterprise/projects/${projectId}/members`),
      add: (projectId: string, data: Record<string, unknown>) => post<Record<string, unknown>>(`/api/enterprise/projects/${projectId}/members`, data),
      remove: (projectId: string, userId: string) => del(`/api/enterprise/projects/${projectId}/members/${userId}`),
    },
  },

  inventory: {
    list: () => get<Record<string, unknown>[]>("/api/enterprise/inventory"),
    get: (id: string) => get<Record<string, unknown>>(`/api/enterprise/inventory/${id}`),
    create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/enterprise/inventory", data),
    update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/inventory/${id}`, data),
    delete: (id: string) => del(`/api/enterprise/inventory/${id}`),
    stock: {
      list: (productId: string) => get<Record<string, unknown>[]>(`/api/enterprise/inventory/${productId}/stock`),
      create: (productId: string, data: Record<string, unknown>) => post<Record<string, unknown>>(`/api/enterprise/inventory/${productId}/stock`, data),
    },
  },

  orders: {
    list: () => get<Record<string, unknown>[]>("/api/enterprise/orders"),
    get: (id: string) => get<Record<string, unknown>>(`/api/enterprise/orders/${id}`),
    create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/enterprise/orders", data),
    update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/orders/${id}`, data),
    delete: (id: string) => del(`/api/enterprise/orders/${id}`),
    updateFulfillment: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/orders/${id}/fulfillment`, data),
    updatePayment: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/orders/${id}/payment`, data),
  },

  crm: {
    contacts: {
      list: () => get<Record<string, unknown>[]>("/api/enterprise/crm/contacts"),
      get: (id: string) => get<Record<string, unknown>>(`/api/enterprise/crm/contacts/${id}`),
      create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/enterprise/crm/contacts", data),
      update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/crm/contacts/${id}`, data),
      delete: (id: string) => del(`/api/enterprise/crm/contacts/${id}`),
    },
    deals: {
      list: () => get<Record<string, unknown>[]>("/api/enterprise/crm/deals"),
      get: (id: string) => get<Record<string, unknown>>(`/api/enterprise/crm/deals/${id}`),
      create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/enterprise/crm/deals", data),
      update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/crm/deals/${id}`, data),
      delete: (id: string) => del(`/api/enterprise/crm/deals/${id}`),
    },
    pipelines: {
      list: () => get<Record<string, unknown>[]>("/api/enterprise/crm/pipelines"),
      create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/enterprise/crm/pipelines", data),
      update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/crm/pipelines/${id}`, data),
      delete: (id: string) => del(`/api/enterprise/crm/pipelines/${id}`),
    },
  },

  invoices: {
    list: () => get<Record<string, unknown>[]>("/api/enterprise/invoices"),
    get: (id: string) => get<Record<string, unknown>>(`/api/enterprise/invoices/${id}`),
    create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/enterprise/invoices", data),
    update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/invoices/${id}`, data),
    delete: (id: string) => del(`/api/enterprise/invoices/${id}`),
    send: (id: string) => post<Record<string, unknown>>(`/api/enterprise/invoices/${id}/send`),
    payments: {
      list: (invoiceId: string) => get<Record<string, unknown>[]>(`/api/enterprise/invoices/${invoiceId}/payments`),
      add: (invoiceId: string, data: Record<string, unknown>) => post<Record<string, unknown>>(`/api/enterprise/invoices/${invoiceId}/payments`, data),
    },
  },

  timeClock: {
    list: () => get<Record<string, unknown>[]>("/api/enterprise/time-clock"),
    my: () => get<Record<string, unknown>[]>("/api/enterprise/time-clock/my"),
    get: (id: string) => get<Record<string, unknown>>(`/api/enterprise/time-clock/${id}`),
    update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/time-clock/${id}`, data),
    clockIn: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/enterprise/time-clock/clock-in", data),
    clockOut: () => post<Record<string, unknown>>("/api/enterprise/time-clock/clock-out"),
    leave: {
      list: () => get<Record<string, unknown>[]>("/api/enterprise/time-clock/leave"),
      my: () => get<Record<string, unknown>[]>("/api/enterprise/time-clock/leave/my"),
      create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/enterprise/time-clock/leave", data),
      update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/time-clock/leave/${id}`, data),
      delete: (id: string) => del(`/api/enterprise/time-clock/leave/${id}`),
    },
  },

  vendors: {
    list: () => get<Record<string, unknown>[]>("/api/enterprise/vendors"),
    get: (id: string) => get<Record<string, unknown>>(`/api/enterprise/vendors/${id}`),
    create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/enterprise/vendors", data),
    update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/vendors/${id}`, data),
    delete: (id: string) => del(`/api/enterprise/vendors/${id}`),
    purchaseOrders: {
      list: () => get<Record<string, unknown>[]>("/api/enterprise/vendors/purchase-orders"),
      get: (id: string) => get<Record<string, unknown>>(`/api/enterprise/vendors/purchase-orders/${id}`),
      create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/enterprise/vendors/purchase-orders", data),
      update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/vendors/purchase-orders/${id}`, data),
      delete: (id: string) => del(`/api/enterprise/vendors/purchase-orders/${id}`),
    },
  },

  channels: {
    list: () => get<Record<string, unknown>[]>("/api/enterprise/channels"),
    get: (id: string) => get<Record<string, unknown>>(`/api/enterprise/channels/${id}`),
    create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/enterprise/channels", data),
    update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/channels/${id}`, data),
    delete: (id: string) => del(`/api/enterprise/channels/${id}`),
    addMember: (id: string, data: Record<string, unknown>) => post<Record<string, unknown>>(`/api/enterprise/channels/${id}/members`, data),
    removeMember: (id: string, userId: string) => del(`/api/enterprise/channels/${id}/members/${userId}`),
    messages: {
      list: (channelId: string) => get<Record<string, unknown>[]>(`/api/enterprise/channels/${channelId}/messages`),
      create: (channelId: string, data: Record<string, unknown>) => post<Record<string, unknown>>(`/api/enterprise/channels/${channelId}/messages`, data),
      update: (channelId: string, messageId: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/channels/${channelId}/messages/${messageId}`, data),
      delete: (channelId: string, messageId: string) => del(`/api/enterprise/channels/${channelId}/messages/${messageId}`),
      addReaction: (channelId: string, messageId: string, data: Record<string, unknown>) => post<Record<string, unknown>>(`/api/enterprise/channels/${channelId}/messages/${messageId}/reactions`, data),
    },
  },

  documents: {
    list: (parentId?: string) => get<Record<string, unknown>[]>(`/api/enterprise/documents${parentId ? `?parentId=${parentId}` : ""}`),
    get: (id: string) => get<Record<string, unknown>>(`/api/enterprise/documents/${id}`),
    create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/enterprise/documents", data),
    update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/documents/${id}`, data),
    delete: (id: string) => del(`/api/enterprise/documents/${id}`),
    createVersion: (id: string, data: Record<string, unknown>) => post<Record<string, unknown>>(`/api/enterprise/documents/${id}/versions`, data),
    move: (id: string, data: Record<string, unknown>) => request<Record<string, unknown>>(`/api/enterprise/documents/${id}/move`, { method: "PATCH", body: JSON.stringify(keysToSnake(data)), headers: { "Content-Type": "application/json" } }),
  },

  finance: {
    accounts: {
      list: () => get<Record<string, unknown>[]>("/api/enterprise/finance/accounts"),
      get: (id: string) => get<Record<string, unknown>>(`/api/enterprise/finance/accounts/${id}`),
      create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/enterprise/finance/accounts", data),
      update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/finance/accounts/${id}`, data),
      delete: (id: string) => del(`/api/enterprise/finance/accounts/${id}`),
    },
    entries: {
      list: () => get<Record<string, unknown>[]>("/api/enterprise/finance/entries"),
      get: (id: string) => get<Record<string, unknown>>(`/api/enterprise/finance/entries/${id}`),
      create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/enterprise/finance/entries", data),
      update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/finance/entries/${id}`, data),
      delete: (id: string) => del(`/api/enterprise/finance/entries/${id}`),
      approve: (id: string) => post<Record<string, unknown>>(`/api/enterprise/finance/entries/${id}/approve`),
    },
  },

  analytics: {
    dashboard: () => get<Record<string, unknown>>("/api/enterprise/analytics/dashboard"),
    projects: () => get<Record<string, unknown>>("/api/enterprise/analytics/projects"),
    sales: () => get<Record<string, unknown>>("/api/enterprise/analytics/sales"),
    finance: () => get<Record<string, unknown>>("/api/enterprise/analytics/finance"),
    team: () => get<Record<string, unknown>>("/api/enterprise/analytics/team"),
  },

  resources: {
    list: () => get<Record<string, unknown>[]>("/api/enterprise/resources"),
    get: (id: string) => get<Record<string, unknown>>(`/api/enterprise/resources/${id}`),
    create: (data: Record<string, unknown>) => post<Record<string, unknown>>("/api/enterprise/resources", data),
    update: (id: string, data: Record<string, unknown>) => put<Record<string, unknown>>(`/api/enterprise/resources/${id}`, data),
    delete: (id: string) => del(`/api/enterprise/resources/${id}`),
  },
};
