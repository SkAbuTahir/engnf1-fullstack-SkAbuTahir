import Booking from '@/models/Booking';
import { route, json, notFound, forbidden } from '@/lib/http';
import { authenticate } from '@/lib/auth';
import { isId } from '@/lib/validators';
import { decorate } from '@/lib/bookingView';
export const dynamic = 'force-dynamic';

export const GET = route(async (req, { params }) => {
  const user = await authenticate(req);
  if (!isId(params.id)) throw notFound('Booking not found');
  const b = await Booking.findById(params.id).lean();
  if (!b) throw notFound('Booking not found');
  if (user.role !== 'ADMIN' && String(b.userId) !== String(user._id)) throw forbidden('You can only view your own bookings');
  const [out] = await decorate([b], { withUser: user.role === 'ADMIN' });
  return json(out);
});
