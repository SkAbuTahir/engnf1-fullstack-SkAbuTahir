import Ticket from '@/models/Ticket';
import C from '@/lib/constants';
import { route, json, badRequest } from '@/lib/http';
import { authenticate } from '@/lib/auth';
import { parseEnum, parsePaging, paginated, qp, escapeRegex } from '@/lib/validators';
import { toApi } from '@/lib/serialize';
export const dynamic = 'force-dynamic';

// GET /api/tickets  (T-B4) - filters combine with AND; q is regex-escaped.
export const GET = route(async (req) => {
  await authenticate(req);
  const sp = new URL(req.url).searchParams;
  const { page, limit, skip } = parsePaging(sp, { defaultLimit: 10, maxLimit: 100, allowLimit: true });
  const filter = {};
  const status = qp(sp, 'status');
  const category = qp(sp, 'category');
  const priority = qp(sp, 'priority');
  const q = qp(sp, 'q');
  if (status) filter.status = parseEnum(status, C.TICKET_STATUSES, 'status');
  if (category) filter.category = parseEnum(category, C.CATEGORIES, 'category');
  if (priority) filter.priority = parseEnum(priority, C.PRIORITIES, 'priority');
  if (q) {
    if (q.length > 200) throw badRequest('q must be at most 200 characters');
    const rx = new RegExp(escapeRegex(q.trim()), 'i'); // special characters are literals => no ReDoS / NoSQL injection
    filter.$or = [{ subject: rx }, { body: rx }];
  }
  const [rows, total] = await Promise.all([
    Ticket.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Ticket.countDocuments(filter),
  ]);
  return json(paginated(rows.map(toApi), page, limit, total));
});
