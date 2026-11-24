/* Usage: BASE_URL=http://localhost:3000 node scripts/benchmark.js [runs]
   Measures GET /api/tickets?limit=100 (and a filtered variant). Node 18+. */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const RUNS = Number(process.argv[2]) || 30;

const pct = (a, p) => a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];

async function time(url, token) {
  const t0 = performance.now();
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return performance.now() - t0;
}

(async () => {
  const login = await fetch(`${BASE}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'user@triagesync.test', password: 'User@123' }) });
  const { token } = await login.json();
  for (const q of ['limit=100', 'limit=100&status=OPEN&category=BUG&priority=HIGH', 'limit=100&q=refund']) {
    const url = `${BASE}/api/tickets?${q}`;
    await time(url, token); // warm-up
    const xs = [];
    for (let i = 0; i < RUNS; i++) xs.push(await time(url, token));
    xs.sort((a, b) => a - b);
    const avg = xs.reduce((s, x) => s + x, 0) / xs.length;
    console.log(`${q.padEnd(52)} avg=${avg.toFixed(1)}ms p50=${pct(xs, 50).toFixed(1)}ms p95=${pct(xs, 95).toFixed(1)}ms`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
