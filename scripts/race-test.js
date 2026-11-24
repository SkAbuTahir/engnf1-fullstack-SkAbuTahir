/* Usage: BASE_URL=... node scripts/race-test.js [n=10]
   Fires n simultaneous POST /api/bookings for the SAME slot as n different users -> expect exactly one 201, rest 409.
   (Registers throwaway users so the per-user booking limit doesn't mask the result.) */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const N = Number(process.argv[2]) || 10;
const post = (p, body, token) => fetch(`${BASE}/api${p}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });

(async () => {
  const admin = await (await post('/auth/login', { email: 'admin@triagesync.test', password: 'Admin@123' })).json();
  const list = await (await fetch(`${BASE}/api/resources?search=Screen`, { headers: { Authorization: `Bearer ${admin.token}` } })).json();
  const resourceId = list.data[0].id;
  const start = new Date(Date.now() + 5 * 86400000); start.setUTCMinutes(0, 0, 0);
  const end = new Date(start.getTime() + 3600000);
  const tag = Date.now();
  const tokens = [];
  for (let i = 0; i < N; i++) {
    const email = `race${tag}${i}@triagesync.test`;
    await post('/auth/register', { name: `Racer ${i}`, email, password: 'Racer1234' });
    tokens.push((await (await post('/auth/login', { email, password: 'Racer1234' })).json()).token);
  }
  const results = await Promise.all(tokens.map((t) => post('/bookings', { resourceId, startTime: start.toISOString(), endTime: end.toISOString(), purpose: 'Concurrency race test' }, t).then((r) => r.status)));
  const tally = results.reduce((a, s) => ((a[s] = (a[s] || 0) + 1), a), {});
  console.log('status counts:', tally, tally[201] === 1 && tally[409] === N - 1 ? 'PASS' : 'FAIL');
})().catch((e) => { console.error(e); process.exit(1); });
