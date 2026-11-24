import Booking from '@/models/Booking';
import { route, json, notFound, forbidden, conflict } from '@/lib/http';
import { authenticate } from '@/lib/auth';
import { isId } from '@/lib/validators';
export const dynamic = 'force-dynamic';

// Owner only. Allowed: PENDING/APPROVED while startTime is in the future (B10/B11).
export const PATCH = route(async (req, { params }) => {
  const user = await authenticate(req);
  if (!isId(params.id)) throw notFound('Booking not found');
  const b = await Booking.findById(params.id).select('userId');
  if (!b) throw notFound('Booking not found');
  if (String(b.userId) !== String(user._id)) throw forbidden('You can only cancel your own bookings');
  // Conditional update = atomic compare-and-set on status + start time.
  const updated = await Booking.findOneAndUpdate(
    { _id: b._id, status: { $in: ['PENDING', 'APPROVED'] }, startTime: { $gt: new Date() } },
    { $set: { status: 'CANCELLED' } },
    { new: true }
  );
  if (!updated) throw conflict('Only upcoming pending or approved bookings can be cancelled');
  return json(updated);
});
