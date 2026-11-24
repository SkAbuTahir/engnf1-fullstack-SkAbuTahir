import Booking from '@/models/Booking';
import { route, json, notFound, conflict } from '@/lib/http';
import { authenticate, requireAdmin } from '@/lib/auth';
import { isId } from '@/lib/validators';
export const dynamic = 'force-dynamic';

export const PATCH = route(async (req, { params }) => {
  const user = await authenticate(req);
  requireAdmin(user);
  if (!isId(params.id)) throw notFound('Booking not found');
  if (!(await Booking.exists({ _id: params.id }))) throw notFound('Booking not found');
  const updated = await Booking.findOneAndUpdate(
    { _id: params.id, status: 'PENDING', startTime: { $gt: new Date() } },
    { $set: { status: 'APPROVED' } },
    { new: true }
  );
  if (!updated) throw conflict('Only upcoming pending bookings can be approved');
  return json(updated);
});
