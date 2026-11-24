import { route, json } from '@/lib/http';
import { authenticate } from '@/lib/auth';
export const dynamic = 'force-dynamic';

export const GET = route(async (req) => {
  const user = await authenticate(req);
  return json({ user });
});
