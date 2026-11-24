import { badRequest } from './http';

const bad = badRequest;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isId = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);
export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function isObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

export function reqString(obj, key, min, max, label = key) {
  const v = obj?.[key];
  if (typeof v !== 'string') throw bad(`${label} is required and must be a string`);
  const t = v.trim();
  if (t.length < min || t.length > max) throw bad(`${label} must be ${min}-${max} characters`);
  return t;
}

export function optString(obj, key, max, label = key) {
  const v = obj?.[key];
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') throw bad(`${label} must be a string or null`);
  const t = v.trim();
  if (t.length > max) throw bad(`${label} must be at most ${max} characters`);
  return t === '' ? null : t;
}

export function parseEmail(v) {
  if (typeof v !== 'string') throw bad('email is required');
  const e = v.trim().toLowerCase();
  if (e.length > 254 || !EMAIL_RE.test(e)) throw bad('email must be a valid address (max 254 chars)');
  return e;
}

export function parsePassword(v) {
  if (typeof v !== 'string' || v.length < 8 || v.length > 64) throw bad('password must be 8-64 characters');
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) throw bad('password must contain at least one letter and one digit');
  return v;
}

export function parseEnum(v, list, label) {
  if (typeof v !== 'string' || !list.includes(v)) throw bad(`${label} must be one of: ${list.join(', ')}`);
  return v;
}

export function parseIso(v, label) {
  if (typeof v !== 'string' || !ISO_RE.test(v)) throw bad(`${label} must be an ISO 8601 UTC timestamp`);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) throw bad(`${label} is not a valid date`);
  return d;
}

// Query-string helpers --------------------------------------------------------
export const qp = (sp, key) => {
  const v = sp.get(key);
  return v === null || v === '' ? null : v;
};

export function parsePaging(sp, { defaultLimit = 10, maxLimit = 100, allowLimit = false } = {}) {
  let page = 1;
  const p = qp(sp, 'page');
  if (p !== null) {
    if (!/^\d+$/.test(p) || Number(p) < 1) throw bad('page must be a positive integer');
    page = Number(p);
  }
  let limit = defaultLimit;
  const l = allowLimit ? qp(sp, 'limit') : null;
  if (l !== null) {
    if (!/^\d+$/.test(l) || Number(l) < 1 || Number(l) > maxLimit) throw bad(`limit must be an integer between 1 and ${maxLimit}`);
    limit = Number(l);
  }
  return { page, limit, skip: (page - 1) * limit };
}

export const paginated = (data, page, pageSize, total) => ({
  data,
  page,
  pageSize,
  total,
  totalPages: Math.ceil(total / pageSize),
});

export function parseCapacity(v) {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 1 || v > 500) throw bad('capacity must be an integer between 1 and 500');
  return v;
}
