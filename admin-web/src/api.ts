const BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? 'http://localhost:3000';

let token: string | null = sessionStorage.getItem('admin_token');

export function setToken(t: string | null): void {
  token = t;
  if (t) sessionStorage.setItem('admin_token', t);
  else sessionStorage.removeItem('admin_token');
}

export function getToken(): string | null {
  return token;
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

export interface IntegratorSummary {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export interface ApiKeyInfo {
  id: string;
  label: string;
  prefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface IntegratorDetail extends IntegratorSummary {
  keys: ApiKeyInfo[];
}

export interface Overview {
  integrators: number;
  calls: number;
  activeCalls: number;
  recordings: number;
  billableSeconds: number;
  revenue: number; // minor units (paise)
}

export interface EndUser {
  userRef: string;
  status: string; // active | blocked
  balance: number; // paise
  totalCalls: number;
  lastCallAt: string | null;
}

export interface CallRecord {
  id: string;
  integratorName: string;
  userRef: string | null;
  callerRef: string | null;
  receiverRef: string | null;
  ticket: string | null;
  bookingId: string | null;
  status: string;
  provider: string;
  virtualNumber: string | null;
  billableSeconds: number;
  maxSeconds: number | null;
  ratePerMinute: number | null; // paise / minute
  cost: number | null; // paise
  recordingUrl: string | null;
  createdAt: string;
  ringingAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
}

export const api = {
  login: (email: string, password: string) =>
    req<{ token: string }>('/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  listIntegrators: (params: { search?: string; status?: string; cursor?: string }) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.status) q.set('status', params.status);
    if (params.cursor) q.set('cursor', params.cursor);
    return req<{ integrators: IntegratorSummary[]; nextCursor: string | null }>(`/admin/integrators?${q.toString()}`);
  },

  getIntegrator: (id: string) => req<IntegratorDetail>(`/admin/integrators/${id}`),

  overview: () => req<Overview>('/admin/overview'),

  listCalls: (params: { status?: string; cursor?: string; limit?: number; integratorId?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.cursor) q.set('cursor', params.cursor);
    if (params.limit) q.set('limit', String(params.limit));
    if (params.integratorId) q.set('integratorId', params.integratorId);
    return req<{ calls: CallRecord[]; nextCursor: string | null }>(`/admin/calls?${q.toString()}`);
  },

  getCall: (id: string) => req<CallRecord>(`/admin/calls/${id}`),

  listUsers: (integratorId: string) =>
    req<{ users: EndUser[] }>(`/admin/integrators/${integratorId}/users`),

  blockUser: (integratorId: string, userRef: string) =>
    req<{ userRef: string; status: string; cutCalls: string[] }>(
      `/admin/integrators/${integratorId}/users/${encodeURIComponent(userRef)}/block`,
      { method: 'POST' },
    ),

  unblockUser: (integratorId: string, userRef: string) =>
    req<{ userRef: string; status: string; cutCalls: string[] }>(
      `/admin/integrators/${integratorId}/users/${encodeURIComponent(userRef)}/unblock`,
      { method: 'POST' },
    ),

  createIntegrator: (name: string) =>
    req<{ integratorId: string; apiKey: string; keyId: string }>('/admin/integrators', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  suspend: (id: string) => req<{ id: string; status: string }>(`/admin/integrators/${id}/suspend`, { method: 'POST' }),
  activate: (id: string) => req<{ id: string; status: string }>(`/admin/integrators/${id}/activate`, { method: 'POST' }),

  issueKey: (id: string, label: string) =>
    req<{ keyId: string; apiKey: string; prefix: string; label: string }>(`/admin/integrators/${id}/keys`, {
      method: 'POST',
      body: JSON.stringify({ label }),
    }),

  revokeKey: (keyId: string) => req<{ id: string; revokedAt: string }>(`/admin/api-keys/${keyId}/revoke`, { method: 'POST' }),
};
