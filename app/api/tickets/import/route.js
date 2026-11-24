import Ticket from '@/models/Ticket';
import { route, json, readJson, badRequest } from '@/lib/http';
import { authenticate } from '@/lib/auth';
import { classify } from '@/lib/classifier';
import { reqString, isObject } from '@/lib/validators';
export const dynamic = 'force-dynamic';

const MAX_BATCH = 1000;

// POST /api/tickets/import  (T-B1 + T-B2)
export const POST = route(async (req) => {
  await authenticate(req);
  const body = await readJson(req);
  const list = Array.isArray(body) ? body : body?.tickets;
  if (!Array.isArray(list)) throw badRequest('Body must be { tickets: [{ externalId, subject, body }] }');
  if (list.length > MAX_BATCH) throw badRequest(`At most ${MAX_BATCH} tickets per import`);

  const items = list.map((t, i) => {
    if (!isObject(t)) throw badRequest(`tickets[${i}] must be an object`);
    return {
      externalId: reqString(t, 'externalId', 1, 100, `tickets[${i}].externalId`),
      subject: reqString(t, 'subject', 3, 150, `tickets[${i}].subject`),
      body: reqString(t, 'body', 5, 2000, `tickets[${i}].body`),
    };
  });

  // One query loads every ticket that already exists.
  const existing = await Ticket.find({ externalId: { $in: items.map((i) => i.externalId) } })
    .select('externalId subject body isHumanOverride')
    .lean();
  const known = new Map(existing.map((t) => [t.externalId, t]));

  let importedCount = 0;
  let updatedCount = 0;
  let skippedOverrideCount = 0;
  const ops = [];

  for (const it of items) {
    const cls = classify(it.subject, it.body);
    const cur = known.get(it.externalId);
    if (!cur) {
      importedCount++;
      ops.push({
        insertOne: {
          document: {
            externalId: it.externalId, subject: it.subject, body: it.body,
            autoCategory: cls.category, category: cls.category, priority: cls.priority,
            status: 'OPEN', isHumanOverride: false, isReviewed: false, assigneeId: null,
          },
        },
      });
      known.set(it.externalId, { ...it, isHumanOverride: false }); // same id twice in one payload => second is an update
      continue;
    }
    const changed = cur.subject !== it.subject || cur.body !== it.body;
    const set = {};
    if (changed) {
      set.subject = it.subject;
      set.body = it.body;
    }
    if (cur.isHumanOverride) {
      // T-B2: an agent-chosen category is NEVER overwritten by the classifier.
      skippedOverrideCount++;
    } else {
      updatedCount++;
      if (changed) {
        set.category = cls.category; // autoCategory is immutable and stays as originally predicted
        set.priority = cls.priority;
      }
    }
    if (Object.keys(set).length) ops.push({ updateOne: { filter: { externalId: it.externalId }, update: { $set: set } } });
    known.set(it.externalId, { ...cur, ...it });
  }

  if (ops.length) await Ticket.bulkWrite(ops, { ordered: true });
  return json({ importedCount, updatedCount, skippedOverrideCount, total: items.length });
});
