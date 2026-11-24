# SOLUTION.md

## Part A – Architecture and trace

```
 Browser (Next.js client pages, Tailwind)
   │  fetch /api/*  (Bearer JWT, X-Agent)
   ▼
 Next.js Route Handlers  app/api/**/route.js
   │  route() wrapper ── connectDB() ── error formatter {error:{code,message}}
   │  authenticate() → requireAdmin() → path-id 404 → ownership 403 → validators → 404 refs → 409
   ▼
 lib/ (classifier, validators, stats, bookingView)      models/ (Mongoose schemas)
   ▼
 MongoDB Atlas replica set: users · tickets · ticketevents · resources · bookings
```

### Trace: `POST /api/tickets/import` → dashboard
1. `ImportModal.run()` (components/ImportModal.jsx) → `api('/tickets/import')` (lib/api.js) adds the Bearer token.
2. `route()` (lib/http.js) opens the cached DB connection (`connectDB`, lib/mongodb.js).
3. `authenticate()` (lib/auth.js) verifies the JWT and reloads the user → 401 otherwise.
4. `POST` in app/api/tickets/import/route.js validates each item with `reqString` (lib/validators.js).
5. One `Ticket.find({externalId: {$in}})` loads existing tickets.
6. Per item `classify()` (lib/classifier.js) produces category + priority. New → `insertOne` (autoCategory = category). Existing + `isHumanOverride` → only subject/body refreshed and counted in `skippedOverrideCount`. Existing + not overridden → counted in `updatedCount`; reclassified only if text changed.
7. `Ticket.bulkWrite` applies everything in one round trip; the handler returns `{importedCount, updatedCount, skippedOverrideCount, total}`.
8. `onDone()` makes the Triage page call `loadList()` (GET /api/tickets → `Ticket.find().lean()` + `toApi`) and `loadStats()` (GET /api/stats → `ticketStats()`, lib/stats.js, aggregations). `StatsStrip` and the list re-render; text is rendered as React text nodes (XSS-safe).

Totals satisfy `importedCount + updatedCount + skippedOverrideCount = total`.

### Definition of "reviewed"
`isReviewed` becomes `true` when an agent, through `PATCH /api/tickets/:id`, **changes the category** (any value different from the current one) **or moves the status away from OPEN** (e.g. OPEN→IN_PROGRESS). Changing only priority or assignee, a no-op PATCH, or an import never sets it. It is never reset to false. `modelAgreementRate` = reviewed tickets whose `category === autoCategory` ÷ reviewed tickets × 100 (rounded to 0.1; 0 when nothing is reviewed).

## Part B – Concurrency and idempotency

### B6: race-safe booking
`POST /api/bookings` (app/api/bookings/route.js) does all cheap validation (400) and referenced-id checks (404) first, then runs inside `session.withTransaction()`:
1. `Resource.findOneAndUpdate({_id, isActive:true}, {$inc:{__v:1}}, {session})` takes a **write lock on the parent Resource document**. Two concurrent transactions touching the same resource conflict here; MongoDB aborts one with `WriteConflict` (code 112, label `TransientTransactionError`).
2. The same `$inc` on the user document serialises that user's concurrent requests, making the "max 3 upcoming" count race-safe.
3. Count of the user's future PENDING/APPROVED bookings (≥3 → 409).
4. Overlap query `startTime < newEnd && endTime > newStart` on PENDING/APPROVED bookings, inside the same session (snapshot). A hit → 409.
5. `Booking.create([..], {session})`.

`withTransaction` automatically retries the callback on transient errors; on the retry the winner's booking is visible, step 4 throws 409. If retries are exhausted, or a WriteConflict escapes, `isWriteConflict()` maps it to **409 CONFLICT** (also in `errorResponse`, lib/http.js) so it never surfaces as a 500. Result for 10 simultaneous identical requests: exactly one 201, nine 409. Verify with `npm run race-test`. Cancel/approve/reject use a single conditional `findOneAndUpdate` (status + `startTime > now`) as an atomic compare-and-set.

### T-B2: idempotent override protection
- `autoCategory` is `immutable` in the schema, so it stays as the original prediction.
- PATCH changing `category` sets `isHumanOverride = true` (app/api/tickets/[id]/route.js) and logs a `TicketEvent`; patching the same value again changes nothing and logs nothing.
- Import re-reads `isHumanOverride` from the DB for every existing ticket; if true, category/priority are never written. Running the same import twice yields the same database state (no duplicates thanks to the unique `externalId` and the existing-ticket lookup).

## Part C – Measure first, then optimise
Method: `npm run seed:bulk` (600 extra tickets) → `npm run indexes -- drop` → start the app → `npm run benchmark` → `npm run indexes -- sync` → `npm run benchmark`. (30 runs each after a warm-up; same machine, same Atlas cluster.)

| Query | Before (no secondary indexes) avg / p95 | After (indexes) avg / p95 |
|---|---|---|
| `GET /api/tickets?limit=100` | _fill in_ ms / _fill in_ ms | _fill in_ ms / _fill in_ ms |
| `…&status=OPEN&category=BUG&priority=HIGH` | _fill in_ | _fill in_ |
| `…&q=refund` | _fill in_ (regex cannot use an index) | _fill in_ |

Optimisations applied: compound index `{status,category,priority,createdAt:-1}` + `{createdAt:-1}` for the default sort, `.lean()` with a manual `toApi` mapper instead of hydrating documents, and a single `Promise.all` for rows + count.

**Trade-off (write amplification):** each ticket insert/update now maintains up to five extra B-tree indexes plus the text index, so imports and PATCHes do more I/O and use more RAM/disk. For a read-heavy triage queue this is worth it, but a very write-heavy feed would justify dropping the single-field indexes.

## Part D – What I would improve with one more day
1. **Rate-limit and lock out brute-force logins** – app/api/auth/login/route.js:17 (add a per-IP/email limiter).
2. **Use cursor pagination and a real text-search strategy** (Atlas Search) instead of an escaped regex that scans – app/api/tickets/route.js:24.
3. **Wrap PATCH ticket + event insert in one transaction** so audit rows can never be lost – app/api/tickets/[id]/route.js:60-61.
4. **Add a users endpoint / assignee picker** instead of "Assign to me" only – components/TicketDrawer.jsx:84.
5. **Move the JWT to an httpOnly cookie** to remove XSS token-theft risk – lib/api.js:2 and lib/auth.js:19.
6. **Automated tests** (Jest + mongodb-memory-server replica set) for the classifier, import idempotency and the race scenario – lib/classifier.js:12, app/api/bookings/route.js:54.
7. **Batch the availability lookups / cache the ticket dropdown** on the resource page – app/resources/[id]/page.js:25.
