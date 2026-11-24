import mongoose from 'mongoose';
import Booking from '@/models/Booking';
import Resource from '@/models/Resource';
import Ticket from '@/models/Ticket';
import User from '@/models/User';
import C from '@/lib/constants';
import { route, json, readJson, badRequest, notFound, conflict } from '@/lib/http';
import { authenticate, requireAdmin } from '@/lib/auth';
import { isId, isObject, parseIso, parseEnum, parsePaging, paginated, qp, reqString } from '@/lib/validators';
import { decorate } from '@/lib/bookingView';
export const dynamic = 'force-dynamic';

const MIN = 60 * 1000;
const MAX_ACTIVE_PER_USER = 3;

const onGrid = (d) => [0, 30].includes(d.getUTCMinutes()) && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0;

function isWriteConflict(e) {
  return e?.code === 112 || e?.codeName === 'WriteConflict' || e?.hasErrorLabel?.('TransientTransactionError') || e?.errorLabels?.includes?.('TransientTransactionError');
}

// POST /api/bookings  (B1-B9 + race-safe B6)
export const POST = route(async (req) => {
  const user = await authenticate(req);
  const b = await readJson(req);
  if (!isObject(b)) throw badRequest('Body must be a JSON object');

  // ---- 400: validation ----
  if (!isId(b.resourceId)) throw badRequest('resourceId must be a valid id');
  const start = parseIso(b.startTime, 'startTime');
  const end = parseIso(b.endTime, 'endTime');
  if (!onGrid(start) || !onGrid(end)) throw badRequest('startTime and endTime must fall on :00 or :30 UTC with zero seconds');
  const minutes = (end - start) / MIN;
  if (minutes < 30 || minutes > 240) throw badRequest('Duration must be between 30 and 240 minutes');
  const now = Date.now();
  if (start.getTime() <= now) throw badRequest('startTime must be in the future');
  if (start.getTime() > now + 30 * 24 * 3600 * 1000) throw badRequest('startTime must be at most 30 days ahead');
  const purpose = reqString(b, 'purpose', 5, 200);
  let ticketId = null;
  if (b.ticketId !== undefined && b.ticketId !== null && b.ticketId !== '') {
    if (!isId(b.ticketId)) throw badRequest('ticketId must be a valid id');
    ticketId = b.ticketId;
  }

  // ---- 404: referenced ids ----
  const resource = await Resource.findById(b.resourceId).select('isActive');
  if (!resource) throw notFound('Resource not found');
  if (ticketId && !(await Ticket.exists({ _id: ticketId }))) throw notFound('Ticket not found');

  // ---- 409: conflicts, evaluated atomically inside a transaction ----
  const session = await mongoose.startSession();
  let created = null;
  try {
    await session.withTransaction(async () => {
      created = null; // callback may be retried on transient errors
      // Write-lock the parent Resource doc: concurrent transactions for the same resource collide here
      // (WriteConflict) and are serialized, so the overlap check below can never miss a competing insert.
      const locked = await Resource.findOneAndUpdate({ _id: resource._id, isActive: true }, { $inc: { __v: 1 } }, { session });
      if (!locked) throw conflict('Resource is not active');
      // Same trick on the user doc so the "max 3 future bookings" limit is race-safe too.
      await User.updateOne({ _id: user._id }, { $inc: { __v: 1 } }, { session });

      const active = await Booking.countDocuments(
        { userId: user._id, status: { $in: C.BLOCKING_STATUSES }, startTime: { $gt: new Date() } },
        { session }
      );
      if (active >= MAX_ACTIVE_PER_USER) throw conflict(`You already have ${MAX_ACTIVE_PER_USER} upcoming pending/approved bookings`);

      const clash = await Booking.exists({
        resourceId: resource._id,
        status: { $in: C.BLOCKING_STATUSES },
        startTime: { $lt: end }, // newEnd > existingStart
        endTime: { $gt: start }, // newStart < existingEnd
      }).session(session);
      if (clash) throw conflict('That time slot overlaps an existing booking');

      const [doc] = await Booking.create([{ resourceId: resource._id, userId: user._id, ticketId, startTime: start, endTime: end, purpose, status: 'PENDING' }], { session });
      created = doc;
    });
  } catch (e) {
    if (isWriteConflict(e)) throw conflict('That time slot was just taken by a concurrent request'); // WriteConflict (112) => 409, never 500
    throw e;
  } finally {
    await session.endSession();
  }
  return json(created, 201);
});

// GET /api/bookings - ADMIN
export const GET = route(async (req) => {
  const user = await authenticate(req);
  requireAdmin(user);
  const sp = new URL(req.url).searchParams;
  const { page, limit, skip } = parsePaging(sp, { defaultLimit: 10 });
  const filter = {};
  const status = qp(sp, 'status');
  const resourceId = qp(sp, 'resourceId');
  if (status) filter.status = parseEnum(status, C.BOOKING_STATUSES, 'status');
  if (resourceId) {
    if (!isId(resourceId)) throw badRequest('resourceId must be a valid id');
    filter.resourceId = resourceId;
  }
  const f = qp(sp, 'from');
  const t = qp(sp, 'to');
  const from = f ? parseIso(f, 'from') : null;
  const to = t ? parseIso(t, 'to') : null;
  if (from && to && to <= from) throw badRequest('to must be after from');
  if (to) filter.startTime = { $lt: to }; // overlap semantics
  if (from) filter.endTime = { $gt: from };
  const [rows, total] = await Promise.all([
    Booking.find(filter).sort({ startTime: -1, _id: -1 }).skip(skip).limit(limit).lean(),
    Booking.countDocuments(filter),
  ]);
  return json(paginated(await decorate(rows, { withUser: true }), page, limit, total));
});
