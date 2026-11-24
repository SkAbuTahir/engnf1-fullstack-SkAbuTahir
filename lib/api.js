// Browser-side API client. All data comes from /api; the JWT lives in localStorage.
const TOKEN_KEY = 'triagesync_token';

export const getToken = () => (typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY));
export const setToken = (t) => window.localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => window.localStorage.removeItem(TOKEN_KEY);

export class ApiClientError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function api(path, { method = 'GET', body, headers = {}, params } = {}) {
  const qs = params
    ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString()
    : '';
  const token = getToken();
  let res;
  try {
    res = await fetch(`/api${path}${qs}`, {
      method,
      headers: { ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiClientError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and try again.');
  }
  let data = null;
  try { data = await res.json(); } catch { /* empty body */ }
  if (!res.ok) {
    if (res.status === 401 && token && !path.startsWith('/auth/login')) {
      clearToken();
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    throw new ApiClientError(res.status, data?.error?.code || 'ERROR', data?.error?.message || `Request failed (${res.status})`);
  }
  return data;
}
