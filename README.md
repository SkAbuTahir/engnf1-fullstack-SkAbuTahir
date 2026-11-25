# TriageSync

## 1. Overview
TriageSync is a full-stack support-triage and resource-slot scheduling app. Support agents import ticket feeds that are auto-categorised and prioritised by a deterministic classifier, review and override them (with an immutable audit trail), and book 30-minute slots on shared rooms, labs and equipment that an administrator approves. Booking creation is race-safe under concurrent load.

**Project structure note (Rule Q2):** this repo uses a **combined Next.js `app/` directory** for both the frontend pages and the `/api` Route Handlers (no separate `frontend/` / `backend/` folders).

## 2. Live links
| What | URL |
|---|---|
| App | `https://engnf1-fullstack-sk-abu-tahir.vercel.app/login`  |
| API base | `https://engnf1-fullstack-sk-abu-tahir.vercel.app/api` |
| Repo | `https://github.com/SkAbuTahir/engnf1-fullstack-SkAbuTahir` |

## 3. Seeded credentials
| Role | Name | Email | Password |
|---|---|---|---|
| ADMIN | Admin Lead | admin@triagesync.test | Admin@123 |
| USER | Agent Demo | user@triagesync.test | User@123 |

## 4. Tech stack
Next.js 14 (App Router, JavaScript only) · Tailwind CSS · MongoDB + Mongoose 8 · JWT (`jsonwebtoken`, 12h default) · bcryptjs (cost 10).

## 5. Folder structure (combined `app/`)
```
app/
  api/                 21 endpoints as Route Handlers (auth, tickets, stats, resources, bookings, admin)
  login/ register/     auth pages
  tickets/             triage queue
  resources/ [id]/     resource list + detail/booking
  bookings/            my bookings
  admin/               analytics, resources CRUD, booking approvals
components/            Shell (nav + auth guard), TicketDrawer, ImportModal, AuthForm, ui
lib/                   mongodb.js (cached connection), http.js (error contract), auth.js, validators.js,
                       classifier.js, stats.js, bookingView.js, api.js (browser client), time.js
models/                User, Ticket, TicketEvent, Resource, Booking
scripts/               seed.js, seed-bulk.js, indexes.js, benchmark.js, race-test.js
```

## 6. Local setup & seed
```bash
git clone <repo> && cd <repo>
npm install
cp .env.example .env.local        # set MONGODB_URI and JWT_SECRET
npm run seed                      # idempotent: safe to run repeatedly
npm run dev                       # http://localhost:3000
```
`MONGODB_URI` must point to a **replica set** (MongoDB Atlas free tier works; a standalone local `mongod` does not support transactions — start it with `--replSet rs0` and run `rs.initiate()`).

Extras: `npm run seed:bulk` (600 tickets for latency tests), `npm run indexes -- drop|sync`, `npm run benchmark`, `npm run race-test` (fires 10 concurrent bookings for one slot; expects one 201 and nine 409).

## 7. MongoDB schema
- **users**: name, email (unique, lowercase), passwordHash, role `USER|ADMIN`, createdAt
- **tickets**: externalId (unique), subject, body, autoCategory (immutable), category, isHumanOverride, priority, status, assigneeId, isReviewed, createdAt, updatedAt. Indexes: `{status,category,priority,createdAt}`, `{createdAt}`, `{category}`, `{priority}`, text(subject, body)
- **ticketevents**: ticketId, field, oldValue, newValue, actor, createdAt. Index `{ticketId, createdAt}`
- **resources**: name (unique, case-insensitive via collation), type, capacity 1–500, description, isActive, createdAt
- **bookings**: resourceId, userId, ticketId, startTime, endTime, purpose, status, decisionNote, createdAt. Indexes `{resourceId,status,startTime,endTime}`, `{userId,status,startTime}`

All JSON responses expose `id` (not `_id`); `passwordHash` and `__v` are never returned.

## 8. API summary (all under `/api`; errors are `{ error: { code, message } }`)
| # | Endpoint | Access |
|---|---|---|
| 1 | POST /auth/register | Public (always USER) |
| 2 | POST /auth/login | Public |
| 3 | GET /auth/me | Logged in |
| 4 | POST /tickets/import | Logged in |
| 5 | GET /tickets (status, category, priority, q, page, limit) | Logged in |
| 6 | GET /tickets/:id | Logged in |
| 7 | PATCH /tickets/:id (+ `X-Agent`) | Logged in |
| 8 | GET /stats | Logged in |
| 9 | GET /resources | Logged in (USER: active only) |
| 10 | GET /resources/:id | Logged in |
| 11 | POST /resources | ADMIN |
| 12 | PATCH /resources/:id | ADMIN |
| 13 | GET /resources/:id/availability?from&to | Logged in |
| 14 | POST /bookings | Logged in |
| 15 | GET /bookings/mine | Logged in |
| 16 | GET /bookings/:id | Owner / ADMIN |
| 17 | GET /bookings | ADMIN |
| 18 | PATCH /bookings/:id/cancel | Owner |
| 19 | PATCH /bookings/:id/approve | ADMIN |
| 20 | PATCH /bookings/:id/reject (`note`) | ADMIN |
| 21 | GET /admin/stats | ADMIN |

Check order everywhere: 401 → 403 (role) → 404 (path id) → 403 (ownership) → 400/422 → 404 (referenced id) → 409.

## 9. Completed features checklist
- [x] Deterministic classifier, idempotent import, human-override protection
- [x] PATCH with override/review flags and per-field `TicketEvent` audit rows (`X-Agent` or email)
- [x] AND-combined filters, regex-escaped `q`
- [x] Stats incl. model agreement rate
- [x] Resources CRUD, RBAC, case-insensitive unique names
- [x] Bookings: grid/duration/horizon rules, overlap, 3-booking cap, transactional race safety
- [x] Approve / reject (note) / cancel state machine
- [x] Availability endpoint exposing only start/end/status
- [x] Admin stats
- [x] UI: auth redirects, stats strip, live filters, drawer with optimistic update + rollback, XSS-safe rendering, booking form, my bookings, admin panel, loading/empty/error states, responsive layout
- [x] Idempotent seed (2 users, 6 resources, 15 tickets incl. XSS payload and 5 reviewed)

## 10. Known limitations
- Transactions need a MongoDB replica set (Atlas is fine).
- Ticket `q` search uses an escaped case-insensitive regex (substring match) so it cannot use the text index; it scans the filtered set.
- Assignee is set via "Assign to me" / "Unassign" because the contract has no users-list endpoint.
- JWT is kept in `localStorage` (simple, but exposed to XSS; mitigated by never rendering raw HTML).
- No rate limiting on login.
- The 30-minute grid is validated in UTC, so time zones with 45-minute offsets cannot pick local half-hour slots.
