# AI_USAGE.md

## Tools used
| Tool | Used for |
|---|---|
| Amazon Q (AWS IDE plugin) | Code review, debugging, commit planning, deployment troubleshooting |
| `create-next-app` scaffolding + npm | Project setup and dependency install |

## Prompts / tasks given to the AI
1. Reviewed project structure and checked all 21 endpoints against the spec requirements
2. Helped plan logical git commit sequence across Day 1 and Day 2
3. Debugged MongoDB Atlas DNS connection issue during deployment
4. Reviewed `.env.example` and flagged real credentials that were accidentally included

## Verifying / overriding an AI suggestion

**Concurrency error handling (B6).** The AI suggested using a transaction with a write-lock on the parent `Resource` document via `$inc: {__v: 1}`. The key issue was what happens when MongoDB aborts a losing concurrent request with `WriteConflict` (code 112) — left unhandled this surfaces as HTTP 500, but the spec requires 409 for every non-winning request.

I verified the behaviour of `session.withTransaction()`: it retries the callback on `TransientTransactionError`, and on retry the overlap query finds the winner's booking and throws our `409 CONFLICT`. I also kept an explicit fallback in `isWriteConflict()` in `app/api/bookings/route.js` and `errorResponse()` in `lib/http.js` to map code 112 to `409`.

Verified with `npm run race-test` (10 simultaneous requests → 1 × 201, 9 × 409). PASS.

**Credentials in .env.example.** The AI flagged that the `.env.example` file contained real MongoDB credentials and JWT secret. I replaced them with dummy placeholder values before pushing to the public repository.

## Responsibility statement
I read and can explain every file in this repository. Anything I could not explain was rewritten or removed.
