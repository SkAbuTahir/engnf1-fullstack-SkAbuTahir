import Ticket from '@/models/Ticket';
import C from '@/lib/constants';

const zero = (keys) => Object.fromEntries(keys.map((k) => [k, 0]));
const fold = (rows, keys) => {
  const out = zero(keys);
  for (const r of rows) if (r._id in out) out[r._id] = r.n;
  return out;
};

export async function ticketStats() {
  const grp = (f) => Ticket.aggregate([{ $group: { _id: `$${f}`, n: { $sum: 1 } } }]);
  const [cat, pri, st, reviewedCount, agreed] = await Promise.all([
    grp('category'),
    grp('priority'),
    grp('status'),
    Ticket.countDocuments({ isReviewed: true }),
    Ticket.countDocuments({ isReviewed: true, $expr: { $eq: ['$category', '$autoCategory'] } }),
  ]);
  return {
    byCategory: fold(cat, C.CATEGORIES),
    byPriority: fold(pri, C.PRIORITIES),
    byStatus: fold(st, C.TICKET_STATUSES),
    reviewedCount,
    // Of the tickets an agent has reviewed, the % where the agent kept the classifier's category.
    modelAgreementRate: reviewedCount ? Math.round((agreed / reviewedCount) * 1000) / 10 : 0,
  };
}
