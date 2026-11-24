// Deterministic auto-triage (T-B1). CommonJS: shared by API routes and the seed script.
const CATEGORY_RULES = [
  ['BILLING', ['refund', 'invoice', 'charge', 'payment']],
  ['LOGIN', ['password', '2fa', 'sign in', 'locked out', 'login']],
  ['DELIVERY', ['package', 'arrived', 'shipping', 'tracking', 'delivery']],
  ['BUG', ['crash', 'error', '500', 'exception', 'broken']],
];
const PRIORITY_RULES = [
  ['URGENT', ['urgent', 'production down', 'locked out']],
  ['HIGH', ['error', 'refund', 'not arrived']],
];

function classify(subject, body) {
  const text = `${subject} ${body}`.toLowerCase();
  const hit = (words) => words.some((w) => text.includes(w));
  const category = (CATEGORY_RULES.find(([, w]) => hit(w)) || ['FEATURE_REQUEST'])[0];
  const priority = (PRIORITY_RULES.find(([, w]) => hit(w)) || ['MEDIUM'])[0];
  return { category, priority };
}

module.exports = { classify };
