import Booking from '@/models/Booking';
import C from '@/lib/constants';
import { route, json } from '@/lib/http';
import { authenticate } from '@/lib/auth';
import { parseEnum, parsePaging, paginated, qp } from '@/lib/validators';
import { decorate } from '@/lib/bookingView';
export const dynamic = 'force-dynamic';

export const GET = route(async (req) => {
  const user = await authenticate(req);
  const sp = new URL(req.url).searchParams;
  const { page, limit, skip } = parsePaging(sp, { defaultLimit: 10 });
  const filter = { userId: user._id };
  const status = qp(sp, 'status');
  if (status) filter.status = parseEnum(status, C.BOOKING_STATUSES, 'status');
  const [rows, total] = await Promise.all([
    Booking.find(filter).sort({ startTime: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Booking.countDocuments(filter),
  ]);
  return json(paginated(await decorate(rows), page, limit, total));
});
