import Resource from '@/models/Resource';
import Booking from '@/models/Booking';
import C from '@/lib/constants';
import { route, json, notFound, badRequest } from '@/lib/http';
import { authenticate } from '@/lib/auth';
import { isId, parseIso, qp } from '@/lib/validators';
export const dynamic = 'force-dynamic';

const WEEK_MS = 7 * 24 * 3600 * 1000;

// GET /api/resources/:id/availability?from&to  - exposes ONLY startTime, endTime, status (B15)
export const GET = route(async (req, { params }) => {
  const user = await authenticate(req);
  if (!isId(params.id)) throw notFound('Resource not found');
  const r = await Resource.findById(params.id).select('isActive');
  if (!r || (!r.isActive && user.role !== 'ADMIN')) throw notFound('Resource not found');

  const sp = new URL(req.url).searchParams;
  const f = qp(sp, 'from');
  const t = qp(sp, 'to');
  if (!f || !t) throw badRequest('from and to are required (ISO 8601 UTC)');
  const from = parseIso(f, 'from');
  const to = parseIso(t, 'to');
  if (to <= from) throw badRequest('to must be after from');
  if (to - from > WEEK_MS) throw badRequest('Range must not exceed 7 days');

  const rows = await Booking.find({
    resourceId: r._id,
    status: { $in: C.BLOCKING_STATUSES },
    startTime: { $lt: to },
    endTime: { $gt: from },
  })
    .sort({ startTime: 1 })
    .select('startTime endTime status -_id')
    .lean();

  return json({
    resourceId: String(r._id),
    from: from.toISOString(),
    to: to.toISOString(),
    bookings: rows.map((b) => ({ startTime: b.startTime, endTime: b.endTime, status: b.status })),
  });
});
