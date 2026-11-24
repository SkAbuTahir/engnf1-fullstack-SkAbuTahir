import bcrypt from 'bcryptjs';
import User from '@/models/User';
import { route, json, readJson, conflict, badRequest } from '@/lib/http';
import { reqString, parseEmail, parsePassword, isObject } from '@/lib/validators';
export const dynamic = 'force-dynamic';

export const POST = route(async (req) => {
  const b = await readJson(req);
  if (!isObject(b)) throw badRequest('Body must be a JSON object');
  const name = reqString(b, 'name', 2, 50);
  const email = parseEmail(b.email);
  const password = parsePassword(b.password);
  if (await User.exists({ email })) throw conflict('An account with this email already exists');
  // Role is ALWAYS USER here; any "role" in the body is ignored.
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10), role: 'USER' });
  return json({ user }, 201);
});
