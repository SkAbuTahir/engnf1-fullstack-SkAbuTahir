const mongoose = require('mongoose');
const { CATEGORIES, PRIORITIES, TICKET_STATUSES } = require('../lib/constants');
const jsonOpts = require('./_json');

const TicketSchema = new mongoose.Schema(
  {
    externalId: { type: String, required: true, unique: true, trim: true },
    subject: { type: String, required: true, trim: true, minlength: 3, maxlength: 150 },
    body: { type: String, required: true, trim: true, minlength: 5, maxlength: 2000 },
    autoCategory: { type: String, enum: CATEGORIES, required: true, immutable: true },
    category: { type: String, enum: CATEGORIES, required: true },
    isHumanOverride: { type: Boolean, default: false },
    priority: { type: String, enum: PRIORITIES, required: true },
    status: { type: String, enum: TICKET_STATUSES, default: 'OPEN' },
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isReviewed: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: jsonOpts }
);

// Indexes for the filter bar (status/category/priority) + newest-first sort, and a text index on subject/body.
TicketSchema.index({ status: 1, category: 1, priority: 1, createdAt: -1 });
TicketSchema.index({ createdAt: -1 });
TicketSchema.index({ category: 1 });
TicketSchema.index({ priority: 1 });
TicketSchema.index({ subject: 'text', body: 'text' });

module.exports = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);
