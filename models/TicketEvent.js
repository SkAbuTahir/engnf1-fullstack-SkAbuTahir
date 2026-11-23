const mongoose = require('mongoose');
const { EVENT_FIELDS } = require('../lib/constants');
const jsonOpts = require('./_json');

const TicketEventSchema = new mongoose.Schema(
  {
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
    field: { type: String, enum: EVENT_FIELDS, required: true },
    oldValue: { type: String, default: null },
    newValue: { type: String, default: null },
    actor: { type: String, required: true, trim: true, maxlength: 254 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: jsonOpts }
);
TicketEventSchema.index({ ticketId: 1, createdAt: -1 });

module.exports = mongoose.models.TicketEvent || mongoose.model('TicketEvent', TicketEventSchema);
