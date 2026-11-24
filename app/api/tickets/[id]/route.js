import Ticket from '@/models/Ticket';
import TicketEvent from '@/models/TicketEvent';
import User from '@/models/User';
import C from '@/lib/constants';
import { route, json, readJson, notFound, badRequest } from '@/lib/http';
import { authenticate } from '@/lib/auth';
import { isId, isObject, parseEnum } from '@/lib/validators';
export const dynamic = 'force-dynamic';

const loadEvents = (ticketId) => TicketEvent.find({ ticketId }).sort({ createdAt: -1, _id: -1 });

async function loadTicket(id) {
  if (!isId(id)) throw notFound('Ticket not found');
  const t = await Ticket.findById(id);
  if (!t) throw notFound('Ticket not found');
  return t;
}

export const GET = route(async (req, { params }) => {
  await authenticate(req);
  const ticket = await loadTicket(params.id);
  return json({ ticket, events: await loadEvents(ticket._id) });
});

// PATCH /api/tickets/:id  (T-B3)
export const PATCH = route(async (req, { params }) => {
  const user = await authenticate(req);
  const ticket = await loadTicket(params.id); // 404 (path id) before validation
  const b = await readJson(req);
  if (!isObject(b)) throw badRequest('Body must be a JSON object');

  const fields = C.EVENT_FIELDS.filter((f) => f in b);
  if (!fields.length) throw badRequest('Provide at least one of: ' + C.EVENT_FIELDS.join(', '));

  const next = {};
  if ('category' in b) next.category = parseEnum(b.category, C.CATEGORIES, 'category');
  if ('priority' in b) next.priority = parseEnum(b.priority, C.PRIORITIES, 'priority');
  if ('status' in b) next.status = parseEnum(b.status, C.TICKET_STATUSES, 'status');
  if ('assigneeId' in b) {
    if (b.assigneeId !== null && !isId(b.assigneeId)) throw badRequest('assigneeId must be a user id or null');
    next.assigneeId = b.assigneeId;
    if (b.assigneeId && !(await User.exists({ _id: b.assigneeId }))) throw notFound('Assignee not found'); // referenced id
  }

  const actor = (req.headers.get('x-agent') || '').trim().slice(0, 100) || user.email;
  const str = (v) => (v === null || v === undefined ? null : String(v));
  const events = [];
  for (const f of Object.keys(next)) {
    const oldV = str(ticket[f]);
    const newV = str(next[f]);
    if (oldV === newV) continue; // unchanged fields are not logged (idempotent PATCH)
    events.push({ ticketId: ticket._id, field: f, oldValue: oldV, newValue: newV, actor });
  }

  if (events.length) {
    const categoryChanged = events.some((e) => e.field === 'category');
    const leftOpen = events.some((e) => e.field === 'status' && e.oldValue === 'OPEN');
    for (const e of events) ticket[e.field] = e.newValue;
    if (categoryChanged) ticket.isHumanOverride = true;
    if (categoryChanged || leftOpen) ticket.isReviewed = true;
    await ticket.save();
    await TicketEvent.insertMany(events);
  }
  return json({ ticket, events: await loadEvents(ticket._id) });
});
