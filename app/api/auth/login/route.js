import bcrypt from 'bcryptjs';
import User from '@/models/User';
import { route, json, readJson, badRequest, ApiError } from '@/lib/http';
import { signToken } from '@/lib/auth';
import { isObject } from '@/lib/validators';
export const dynamic = 'force-dynamic';

export const POST = route(async (req) => {
  const b = await readJson(req);
  if (!isObject(b)) throw badRequest('Body must be a JSON object');
  if (typeof b.email !== 'string' || !b.email.trim()) throw badRequest('email is required');
  if (typeof b.password !== 'string' || !b.password) throw badRequest('password is required');
  const user = await User.findOne({ email: b.email.trim().toLowerCase() });
  const ok = user && (await bcrypt.compare(b.password, user.passwordHash));
  if (!ok) throw new ApiError(401, 'UNAUTHENTICATED', 'Invalid email or password');
  return json({ token: signToken(user), user }, 200);
});
