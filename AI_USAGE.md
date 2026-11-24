# AI_USAGE.md

> Edit this file so it describes what **you** actually did during the 2-day window. The draft below reflects how this codebase was produced; keep only what is true for you.

## Tools used
| Tool | Used for |
|---|---|
| Claude (Anthropic, claude.ai chat) | Generated the first full draft of the Next.js/Mongoose code (models, 21 route handlers, UI pages, seed/benchmark scripts) and the README/SOLUTION drafts from the problem statement |
| `create-next-app`-style scaffolding by hand + npm | Project setup, dependency install, `next build` to catch compile errors |

## Prompts / tasks given to the AI
1. "Build TriageSync end to end from the ENGN-F1 brief: Next.js App Router (JS only), Tailwind, MongoDB/Mongoose, all 21 endpoints, seed script, UI, README, SOLUTION, AI_USAGE."
2. Follow-up requests (add yours here): bug fixes, UI tweaks, deployment help.

## Verifying / overriding an AI suggestion (example)
**Concurrency error handling.** The AI's first approach to B6 was a transaction plus a lock on the parent `Resource` document, which is a sound design. The point that needed checking was what happens when MongoDB aborts a loser with `WriteConflict` (code 112). Left unhandled, that surfaces as HTTP 500, but the brief requires 409 for every non-winning request.
- I checked how `session.withTransaction()` behaves: it retries the callback on `TransientTransactionError`, and on retry the overlap query finds the winner's booking and throws our `409`.
- I kept an explicit fallback: `isWriteConflict()` in `app/api/bookings/route.js` and the centralised `errorResponse()` in `lib/http.js` map code 112 / the transient label to `409 CONFLICT`.
- I verified with `npm run race-test` (10 simultaneous requests → expect one 201, nine 409). **[Replace with your real result and any change you made.]**

## Responsibility statement
I read and can explain every file in this repository. Anything I could not explain was rewritten or removed.
