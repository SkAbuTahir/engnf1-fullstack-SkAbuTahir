/* Inserts 600 synthetic tickets (idempotent by externalId BULK-0001..) for the Part C latency measurement. */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Ticket = require('../models/Ticket');
const { classify } = require('../lib/classifier');

const SUBJECTS = ['Refund request', 'Cannot sign in', 'Package delayed', 'App crash', 'Feature idea', 'Invoice question', 'Tracking stuck', 'Error 500 on page', 'Password reset loop', 'Export is broken'];
const STATUSES = ['OPEN', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const N = Number(process.argv[2]) || 600;

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const ops = [];
  for (let i = 1; i <= N; i++) {
    const subject = `${SUBJECTS[i % SUBJECTS.length]} #${i}`;
    const body = `Synthetic ticket ${i} used for benchmarking the ticket list endpoint.`;
    const c = classify(subject, body);
    const createdAt = new Date(Date.now() - i * 60000);
    ops.push({ updateOne: { filter: { externalId: `BULK-${String(i).padStart(4, '0')}` }, upsert: true, update: { $setOnInsert: {
      subject, body, autoCategory: c.category, category: c.category, priority: c.priority, status: STATUSES[i % STATUSES.length],
      isHumanOverride: false, isReviewed: false, assigneeId: null, createdAt, updatedAt: createdAt } } } });
  }
  const r = await Ticket.bulkWrite(ops, { timestamps: false });
  console.log(`bulk seed: upserted=${r.upsertedCount} total tickets=${await Ticket.countDocuments()}`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
