import Booking from '@/models/Booking';
import { route, json, readJson, notFound, conflict, badRequest } from '@/lib/http';
import { authenticate, requireAdmin } from '@/lib/auth';
import { isId, isObject, reqString } from '@/lib/validators';
export const dynamic = 'force-dynamic';

export const PATCH = route(async (req, { params }) => {
  const user = await authenticate(req);
  requireAdmin(user);
  if (!isId(params.id)) throw notFound('Booking not found');
  if (!(await Booking.exists({ _id: params.id }))) throw notFound('Booking not found');
  const body = await readJson(req);
  if (!isObject(body)) throw badRequest('Body must be a JSON object');
  const note = reqString(body, 'note', 5, 200, 'note');
  const updated = await Booking.findOneAndUpdate(
    { _id: params.id, status: 'PENDING', startTime: { $gt: new Date() } },
    { $set: { status: 'REJECTED', decisionNote: note } },
    { new: true }
  );
  if (!updated) throw conflict('Only upcoming pending bookings can be rejected');
  return json(updated);
});
