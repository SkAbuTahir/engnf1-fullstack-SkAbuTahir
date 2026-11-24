import { route, json } from '@/lib/http';
import { authenticate } from '@/lib/auth';
import { ticketStats } from '@/lib/stats';
export const dynamic = 'force-dynamic';

export const GET = route(async (req) => {
  await authenticate(req);
  return json(await ticketStats());
});
