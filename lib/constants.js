// CommonJS so that both Next.js and the standalone seed script (plain Node) can load it.
module.exports = {
  ROLES: ['USER', 'ADMIN'],
  CATEGORIES: ['BILLING', 'BUG', 'FEATURE_REQUEST', 'LOGIN', 'DELIVERY'],
  PRIORITIES: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
  TICKET_STATUSES: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
  EVENT_FIELDS: ['category', 'priority', 'status', 'assigneeId'],
  RESOURCE_TYPES: ['ROOM', 'LAB', 'EQUIPMENT'],
  BOOKING_STATUSES: ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'],
  BLOCKING_STATUSES: ['PENDING', 'APPROVED'],
};
