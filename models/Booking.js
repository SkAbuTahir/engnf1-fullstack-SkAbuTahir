const mongoose = require('mongoose');
const { BOOKING_STATUSES } = require('../lib/constants');
const jsonOpts = require('./_json');

const BookingSchema = new mongoose.Schema(
  {
    resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', default: null },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    purpose: { type: String, required: true, trim: true, minlength: 5, maxlength: 200 },
    status: { type: String, enum: BOOKING_STATUSES, default: 'PENDING' },
    decisionNote: { type: String, default: null, trim: true, minlength: 5, maxlength: 200 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, toJSON: jsonOpts }
);

// Overlap lookups per resource, "my bookings", and admin filters.
BookingSchema.index({ resourceId: 1, status: 1, startTime: 1, endTime: 1 });
BookingSchema.index({ userId: 1, status: 1, startTime: -1 });
BookingSchema.index({ startTime: 1 });

module.exports = mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
