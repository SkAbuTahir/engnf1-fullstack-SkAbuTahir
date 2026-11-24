/* Idempotent seed: `npm run seed`. Re-running creates no duplicates and never overwrites live data
   (everything is $setOnInsert, keyed by email / name / externalId). */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Resource = require('../models/Resource');
const Ticket = require('../models/Ticket');
const TicketEvent = require('../models/TicketEvent');
const { classify } = require('../lib/classifier');

const CI = { locale: 'en', strength: 2 };
const NOW = Date.now();
const hoursAgo = (h) => new Date(NOW - h * 3600 * 1000);

const USERS = [
  { name: 'Admin Lead', email: 'admin@triagesync.test', password: 'Admin@123', role: 'ADMIN' },
  { name: 'Agent Demo', email: 'user@triagesync.test', password: 'User@123', role: 'USER' },
];

const RESOURCES = [
  { name: 'Conference Room A', type: 'ROOM', capacity: 12, description: 'Main conference room with a wall display for live troubleshooting calls.' },
  { name: 'Support War Room', type: 'ROOM', capacity: 8, description: 'Quiet room for escalations and incident bridges.' },
  { name: 'Device Testing Lab', type: 'LAB', capacity: 20, description: 'Bench space with phones, tablets and routers for reproducing customer issues.' },
  { name: 'Legacy QA Lab', type: 'LAB', capacity: 10, description: 'Retired lab, kept for reference.', isActive: false },
  { name: 'Packet Analyzer Kit', type: 'EQUIPMENT', capacity: 2, description: 'Portable network capture kit.' },
  { name: 'Screen Share Rig', type: 'EQUIPMENT', capacity: 1, description: 'Dual-monitor rig with remote-assist tooling.' },
];

// priority/category omitted => taken from the deterministic classifier
const TICKETS = [
  { externalId: 'TKT-1001', subject: 'Refund not received for order #4521', body: 'I requested a refund two weeks ago and it has not arrived yet.', h: 70 },
  { externalId: 'TKT-1002', subject: 'Invoice shows duplicate charge', body: 'My March invoice has a duplicate charge for the same subscription.', status: 'IN_PROGRESS', isReviewed: true, h: 66 },
  { externalId: 'TKT-1003', subject: 'Cannot sign in after password reset', body: 'I reset my password but I still cannot sign in to my account.', h: 60 },
  { externalId: 'TKT-1004', subject: 'Locked out of admin account', body: 'I am locked out of my admin account and need access immediately.', h: 55 },
  { externalId: 'TKT-1005', subject: 'My package has not arrived', body: 'Tracking says delivered last Tuesday but nothing was received.', h: 50 },
  { externalId: 'TKT-1006', subject: 'Shipping address change', body: 'Please update the shipping address on my open order before dispatch.', h: 46 },
  { externalId: 'TKT-1007', subject: 'App crash on startup', body: 'The mobile app crashes immediately after the splash screen on Android 14.', h: 40 },
  { externalId: 'TKT-1008', subject: 'Production down: checkout returns 500', body: 'Production down since 09:00 UTC, every checkout request returns a 500 error.', h: 36 },
  { externalId: 'TKT-1009', subject: 'Export to CSV button broken', body: 'Clicking export does nothing and the page stays the same.', priority: 'LOW', status: 'RESOLVED', isReviewed: true, h: 30 },
  { externalId: 'TKT-1010', subject: 'Dark mode support', body: 'It would be great to have a dark theme for the dashboard.', priority: 'LOW', h: 26 },
  { externalId: 'TKT-1011', subject: 'Add bulk ticket tagging', body: 'Please let us tag many tickets at once to save time during triage.', h: 20 },
  { externalId: 'TKT-1012', subject: "<script>alert('xss')</script><h1>Header</h1>", body: 'Payload test: <img src=x onerror=alert(1)> please ignore, this ticket verifies safe rendering.', h: 16 },
  { externalId: 'TKT-1013', subject: 'Payment failed with error code 402', body: 'The payment page shows an error when I try to pay with my card.', status: 'IN_PROGRESS', isReviewed: true, h: 12 },
  { externalId: 'TKT-1014', subject: 'Login page error after credentials', body: 'The login page shows a 500 exception after I enter my credentials.', category: 'BUG', priority: 'HIGH', status: 'IN_PROGRESS', isReviewed: true, isHumanOverride: true, h: 8 },
  { externalId: 'TKT-1015', subject: 'Delivery tracking not updating', body: 'Tracking for my shipment has shown the same status for a week.', status: 'CLOSED', isReviewed: true, h: 4 },
];

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set (see .env.example)');
  await mongoose.connect(process.env.MONGODB_URI);
  await Promise.all([User.init(), Resource.init(), Ticket.init()]); // make sure unique indexes exist first

  for (const u of USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await User.updateOne(
      { email: u.email },
      { $setOnInsert: { name: u.name, email: u.email, passwordHash, role: u.role, createdAt: new Date() } },
      { upsert: true, timestamps: false }
    );
  }

  for (const r of RESOURCES) {
    await Resource.updateOne(
      { name: r.name },
      { $setOnInsert: { ...r, isActive: r.isActive !== false, description: r.description || null, createdAt: new Date() } },
      { upsert: true, collation: CI, timestamps: false }
    );
  }

  const agent = await User.findOne({ email: 'user@triagesync.test' });
  for (const t of TICKETS) {
    const cls = classify(t.subject, t.body);
    const createdAt = hoursAgo(t.h);
    await Ticket.updateOne(
      { externalId: t.externalId },
      {
        $setOnInsert: {
          externalId: t.externalId, subject: t.subject, body: t.body,
          autoCategory: cls.category, // always the classifier's original prediction
          category: t.category || cls.category,
          priority: t.priority || cls.priority,
          status: t.status || 'OPEN',
          isHumanOverride: !!t.isHumanOverride,
          isReviewed: !!t.isReviewed,
          assigneeId: t.isReviewed ? agent._id : null,
          createdAt, updatedAt: createdAt,
        },
      },
      { upsert: true, timestamps: false }
    );
  }

  // A few audit-trail rows for already-reviewed tickets (idempotent upserts).
  const events = [
    ['TKT-1014', 'category', 'LOGIN', 'BUG'],
    ['TKT-1014', 'priority', 'MEDIUM', 'HIGH'],
    ['TKT-1002', 'status', 'OPEN', 'IN_PROGRESS'],
    ['TKT-1009', 'status', 'OPEN', 'RESOLVED'],
  ];
  for (const [ext, field, oldValue, newValue] of events) {
    const tk = await Ticket.findOne({ externalId: ext }).select('_id');
    await TicketEvent.updateOne(
      { ticketId: tk._id, field, oldValue, newValue },
      { $setOnInsert: { ticketId: tk._id, field, oldValue, newValue, actor: agent.email, createdAt: new Date() } },
      { upsert: true, timestamps: false }
    );
  }

  const [u, r, t] = await Promise.all([User.countDocuments(), Resource.countDocuments(), Ticket.countDocuments()]);
  console.log(`Seed complete. users=${u} resources=${r} tickets=${t}`);
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
