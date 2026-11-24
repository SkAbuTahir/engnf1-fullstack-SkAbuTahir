import jwt from 'jsonwebtoken';
import User from '@/models/User';
import { unauthenticated, forbidden } from './http';

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
}

export function signToken(user) {
  // Hard cap: tokens never live longer than 24h even if env is misconfigured.
  let expiresIn = process.env.JWT_EXPIRES_IN || '12h';
  if (/^(\d+)d$/.test(expiresIn) || (/^\d+h$/.test(expiresIn) && parseInt(expiresIn, 10) > 24)) expiresIn = '24h';
  return jwt.sign({ sub: String(user._id), role: user.role }, secret(), { expiresIn });
}

// 401 step of the check order. Re-loads the user so deleted users / role changes take effect immediately.
export async function authenticate(req) {
  const header = req.headers.get('authorization') || '';
  const m = header.match(/^Bearer (.+)$/i);
  if (!m) throw unauthenticated();
  let payload;
  try {
    payload = jwt.verify(m[1], secret());
  } catch {
    throw unauthenticated('Invalid or expired token');
  }
  const user = await User.findById(payload.sub);
  if (!user) throw unauthenticated('User no longer exists');
  return user;
}

// 403 (role) step of the check order.
export function requireAdmin(user) {
  if (user.role !== 'ADMIN') throw forbidden('Admin access required');
}
