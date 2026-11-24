import Booking from '@/models/Booking';
import Resource from '@/models/Resource';
import C from '@/lib/constants';
import { route, json } from '@/lib/http';
import { authenticate, requireAdmin } from '@/lib/auth';
import { ticketStats } from '@/lib/stats';
export const dynamic = 'force-dynamic';

export const GET = route(async (req) => {
  const user = await authenticate(req);
  requireAdmin(user);
  const [activeResources, byStatus, top, tickets] = await Promise.all([
    Resource.countDocuments({ isActive: true }),
    Booking.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]),
    Booking.aggregate([
      { $group: { _id: '$resourceId', bookingCount: { $sum: 1 } } },
      { $sort: { bookingCount: -1, _id: 1 } },
      { $limit: 3 },
    ]),
    ticketStats(),
  ]);
  const bookingsByStatus = Object.fromEntries(C.BOOKING_STATUSES.map((s) => [s, 0]));
  for (const r of byStatus) if (r._id in bookingsByStatus) bookingsByStatus[r._id] = r.n;
  const names = await Resource.find({ _id: { $in: top.map((t) => t._id) } }).select('name').lean();
  const nameMap = new Map(names.map((n) => [String(n._id), n.name]));
  const topResources = top.map((t) => ({ resourceId: String(t._id), name: nameMap.get(String(t._id)) || 'Unknown', bookingCount: t.bookingCount }));
  return json({ activeResources, bookingsByStatus, topResources, ticketStats: tickets });
});
