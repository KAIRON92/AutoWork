# AutoWork — Full Code Audit Report

**Date:** 19 August 2026
**Repository:** `D:\AutoWork-main`
**Baseline commit:** `b75e97e — fix(runtime): harden local infrastructure and worker startup`
**Working tree:** 142 modified files, uncommitted
**Audit mode:** READ-ONLY. No existing project file was modified, no build, no `npm install`, no migration, no test execution against your database. This report file is the only thing that was created.
**Scope:** backend (NestJS), frontend (Next.js), workers (BullMQ), Prisma schema, Docker/CI, environment configuration.

---

## 0. Ek line mein — Hinglish summary

Bhai, project **architecturally strong hai aur code compile bhi saaf hota hai** (backend `tsc` = 0 errors, frontend `tsc` = clean). Multi-tenancy, queue design, encryption, worker idempotency — ye sab kaafi mature level ka kaam hai. Lekin do badi problem hain:

1. **Bahut si jagah "fake / simulated / hardcoded" data ko real functionality ki tarah dikhaya gaya hai.** UI green dikhata hai, "success" bolta hai — lekin peeche kuch actually nahi hua. Ye sabse khatarnaak category hai, kyunki testing me pata hi nahi chalta.
2. **Core delivery path me silent failures hain.** Sabse bada: agar pCloud se file download fail ho jaaye, to email **attachment ke bina** chala jaata hai aur system usko **SUCCESS** mark kar deta hai. Yani product ka main promise (document bhejna) chup-chaap toot sakta hai.

Iske saath: RBAC practically kaam nahi karta (har user ADMIN ban jaata hai), Docker production defaults me weak fallback secrets hain, imports 100KB se badi file pe fail honge, Automations module ka execution engine hi nahi hai, aur password-reset email bhejna implement hi nahi hua (`TODO`).

**Verdict:** Ye ek strong late-beta codebase hai — production ke liye **abhi ready nahi**. Lagbhag 8 P0 aur 18 P1 issues fix karne padenge. Achhi baat: inme se zyada tar chhote, targeted fixes hain — architecture rewrite ki zarurat nahi hai.

---

## 1. Production readiness scorecard

| Area | State | Notes |
|---|---|---|
| Compiles / type-checks | ✅ Good | backend `tsc --noEmit` 0 errors, frontend clean |
| Architecture & module boundaries | ✅ Good | Clean NestJS modules, adapter/factory pattern, queue separation |
| Multi-tenant scoping | 🟡 Mostly good | Almost every query is `organizationId`-scoped — but 2 real leaks (see #3, #5c) |
| Auth (login/session) | 🟡 Works, gaps | HttpOnly cookie + bcrypt(12) + rate limit good; no refresh token, no revocation, no email verification |
| Authorization (RBAC) | ❌ Non-functional | No role management API → everyone is ADMIN; guard fails open; role hierarchy dead code |
| Input validation | ❌ Missing | `ValidationPipe` is registered but there are no `class-validator` DTOs → it validates nothing |
| Core delivery (email + pCloud) | 🟡 Works, silent failures | Idempotency & MANUAL_REVIEW handling is genuinely good; attachment loss is critical |
| Imports (CSV/XLSX) | ❌ Broken at real size | 100KB body limit + apostrophe-corrupting CSV parser |
| Automations | ❌ Not implemented | CRUD only; no scheduler/cron/execution engine exists anywhere |
| Observability / audit | ❌ Missing | `ErrorLog` never written, `AuditLog` and `SystemSetting` models unused |
| Secrets handling | 🟡 Mixed | Nothing secret is committed to git (verified) — but Docker prod defaults are unsafe |
| Scale readiness | ❌ Not ready | No pagination, in-memory aggregations, per-recipient full file download |
| Tests | 🟡 Exists, ungated | 6 test files, backend CI runs them; frontend has no test/lint/typecheck gate |
| Docker / CI | 🟡 Mixed | Backend image is a proper multi-stage build; workers run `ts-node` in "production" |

---

## 2. CRITICAL findings (P0 — fix before any real user touches this)

### C1. Email is delivered without its attachment and still marked SUCCESS
**Where:** `workers/email-dispatch.worker.ts:102-115`

```ts
try {
  const downloaded = await pcloudClient.downloadFileBuffer(...);
  attachments = [ ... ];
} catch (err: any) {
  console.error(`[Email Dispatch Worker] Failed to fetch pCloud file buffer: ${err.message}`);
}
```

The `catch` only logs. Execution continues to `adapter.sendEmail(...)` with `attachments === undefined`. If the send succeeds, the recipient is marked `SUCCESS`, `sharedCount` is incremented, and the campaign eventually reports `COMPLETED`.

**Impact:** Your entire product promise is "share this document with these contacts." A transient pCloud error, an expired pCloud token, or a deleted file means the contact receives an email with **no document**, and your dashboard tells you it worked. This is the single worst defect in the codebase because it is invisible — no error log, no failed count, no alert.

**Fix direction:** If `attachmentMode` includes `ATTACHMENT` and the download fails, do not send. Throw so BullMQ retries; after retries are exhausted, mark the recipient `FAILED` with `errorCode: 'ATTACHMENT_FETCH_FAILED'`. The same applies to the `DIRECT_LINK` branch at lines 117-128 — currently a failed link generation silently sends an email with no download URL in it.

---

### C2. Docker "production" ships working fallback secrets
**Where:** `docker/docker-compose.yml:21,26,31-32` (and repeated for all three workers at `:56,64-65`, `:80,88-89`, `:104,112-113`)

```yaml
JWT_SECRET=${JWT_SECRET:-autowork_jwt_secret_dev_32_characters_minimum}
PCLOUD_CREDENTIAL_ENCRYPTION_KEY=${PCLOUD_CREDENTIAL_ENCRYPTION_KEY:-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=}
NODE_ENV=production
```

The JWT fallback is exactly 32+ characters, so `validate-environment.ts` accepts it happily. The encryption fallback is an **all-zero 32-byte AES key**.

**Impact:** Anyone who has seen this repository can forge a JWT for any `orgId` and read/modify every tenant's data, and can decrypt every stored pCloud and email credential. Combined with `NODE_ENV=production` in the same file, a `docker compose up` on a server with no `.env` present looks like a correct production deployment while being fully compromised.

**Fix direction:** Remove all `:-default` fallbacks for secrets. Let the container fail to start. Additionally, `validate-environment.ts` should reject known-weak values (all-zero keys, anything containing `dev`, `changeme`, `example`) when `NODE_ENV=production`.

---

### C3. Cross-tenant write via unvalidated `contactListIds` (IDOR)
**Where:** `backend/src/contacts/contacts.service.ts:76-79` (`createContact`)

```ts
for (const listId of dto.contactListIds) {
  await this.prisma.contactListMember.create({
    data: { contactId: contact.id, contactListId: listId },
  });
}
```

Every other resource in this service is verified against `organizationId` first. This loop is not. The IDs come straight from the request body.

**Impact:** An authenticated user of Org A can pass a `contactListId` belonging to Org B and inject a contact into Org B's list. That contact will then receive Org B's campaigns. If the ID does not exist at all, Prisma throws a foreign-key error that surfaces as an unhandled `500`. Note that the surrounding code is not in a transaction either, so the contact row is already committed when the loop fails — you get orphaned contacts.

**Fix direction:** `findMany({ where: { id: { in: dto.contactListIds }, organizationId } })`, assert the returned count matches, then create memberships with `createMany` inside the same `$transaction` as the contact.

---

### C4. RBAC does not work — every user is effectively an org admin
Three independent defects combine here.

**(a) No way to create a non-admin role.** `backend/src/auth/auth.service.ts` auto-creates an `ADMIN` role on demand (`ensureAdminRole`). There is **no roles controller/service anywhere in the codebase** — no endpoint lists or creates roles. `users.service.create` needs a `roleId` that a client has no way to obtain, so in practice every user is created with the `ADMIN` role.

**(b) The guard fails open.** `backend/src/auth/roles.guard.ts`:

```ts
if (!allowed || allowed.length === 0) return true;
```

Any controller that forgets `@Roles(...)` is open to all authenticated users. Since `RolesGuard` is a global `APP_GUARD`, this is the default for every route.

**(c) There is no role hierarchy.** `ROLE_RANK = { VIEWER: 1, MEMBER: 2, ADMIN: 3 }` is declared and never used. The check is exact string membership, so `@Roles('MEMBER')` would **reject an ADMIN**. Every future permission decision built on this will be wrong.

**Impact:** The `@Roles('ADMIN')` decorators on user management and the admin console are decorative. You cannot onboard a read-only client or a limited teammate. For a multi-tenant SaaS this is both a security and a sales blocker.

**Fix direction:** Add a roles module (list/create/assign, `ADMIN`-only), seed `ADMIN`/`MEMBER`/`VIEWER` per organization at registration, make `RolesGuard` deny-by-default (require an explicit `@Public()` or `@Roles()` on every route), and implement the rank comparison so higher roles satisfy lower requirements.

---

### C5. Fake / simulated data presented as real functionality
This is a cluster, and it is the dominant theme of the audit. Each item independently makes the system report success for work it did not do.

**(a) pCloud adapter reports a healthy connection in placeholder mode.**
`backend/src/storage/pcloud.adapter.ts` — `this.accessToken = process.env.PCLOUD_ACCESS_TOKEN || 'placeholder_pcloud_access_token'`. In that mode `verifyConnection()` returns **`connected: true`** with a "simulation mode" message, and `uploadFile()` returns a fabricated `pcloud-file-...` ID and a fabricated `publicUrl`. Your current `.env` has `PCLOUD_ACCESS_TOKEN` **empty**, so this is the active code path today. It also reads `PCLOUD_FOLDER_ID` while the environment files define `PCLOUD_DEFAULT_FOLDER_ID` — a silent name mismatch.

**(b) The organization service invents an organization.**
`backend/src/organizations/organizations.service.ts` returns a fabricated **"Acme Growth Labs"** organization with fake statistics when the real record isn't found, and `update()` swallows every error and returns a fake success object. A user can edit their organization settings, see "saved", and nothing was written. Note that `frontend/src/app/settings/page.tsx` renders these fields `readOnly`, so today the fake data is displayed but not editable — the swallowed-error path is a landmine for the moment you make settings editable.

**(c) The `accounts` module is an in-memory array shared by all tenants.**
`backend/src/accounts/accounts.service.ts` holds a hardcoded array (`acc-1 Primary Outbound`, `acc-2 Secondary Sender`, provider `'fake'`, `sentToday: 142`) and mutates it in place. It is **not scoped by organization at all** — every tenant sees and edits the same two rows, and everything is lost on restart. `AccountsController` is mounted at `/accounts` (outside the `/api/v1` convention) and only calls `currentOrgId(req)` as an auth check, ignoring the value.
Mitigating factor: the frontend never calls it (`accountsService` correctly targets `/v1/pcloud/accounts`). So this is **dead code that is still exposed as a live authenticated endpoint** — a cross-tenant leak waiting for anyone who finds the route.

**(d) The admin console health data is hardcoded.**
`backend/src/admin/admin.controller.ts` returns literal `status: 'healthy'`, `redis: { connected: true }`, `storage: { status: 'production' }`. `activeWorkers` counts queues that have active jobs, not workers — so with three healthy idle workers it reports zero. Your monitoring page cannot detect an outage; it is a picture of a healthy system.

**(e) The attachments/storage controller fabricates data.**
`backend/src/storage/storage.controller.ts` — `@Get()` returns a hardcoded list (`Company_Brochure_2026.pdf`, id `att-1`). `@Post('upload')` has **no `@Roles`**, no file size or MIME restriction, never persists anything to `PCloudFile`, and if no file is attached it invents one:
`const buffer = file?.buffer || Buffer.from('simulated attachment file data');`

**(f) The frontend had a matching mock fallback.**
`frontend/src/services/storageService.ts` returns `mockAttachments` on any API error and fake-inserts uploads on failure. Good news: this file, `services/mockData.ts` (269 lines) and `lib/socket.ts` now have **zero importers** — `/attachments` just redirects to `/files`. They are dead, but they are still shipped and will mislead the next developer.

**Fix direction:** Delete (b)'s fabricated fallback and the swallowed catch, delete the `accounts` and `storage` modules outright (the real implementations live in `pcloud/accounts` and `pcloud/files`), make `pcloud.adapter` throw when credentials are absent instead of simulating, wire the admin console to real `queue.getWorkers()` / `redis.ping()` / `prisma.$queryRaw` checks, and delete the dead frontend mock files.

---

### C6. Imports break on any realistic file — 100KB request limit
**Where:** `backend/src/imports/imports.service.ts`, `backend/src/main.ts`, `frontend/src/app/imports/page.tsx`

The frontend base64-encodes the **entire file** and sends it inside a JSON body to `parse`; `confirm` then sends **all parsed rows** back in another JSON body. `main.ts` never configures a body-parser limit, so Express's default of **100KB** applies — and base64 adds ~33% overhead.

**Impact:** Any contact file beyond roughly 70KB (a few hundred rows) fails with `413 Payload Too Large`. A contact-import feature that cannot import a real contact list is not shipped. The `confirm` step then does per-row `await`s with no batching and no transaction, so a mid-import failure leaves the list half-populated with no rollback and no idempotency. `validateMapping` also loads every contact email of the organization into memory to detect duplicates.

Also note: `workers/import.worker.ts` is a **stub** that only logs and returns success, `imports.service` never enqueues to `importQueue`, and there is no import worker service in `docker-compose.yml`. The async import path was designed and never connected.

**Fix direction:** Switch to `multipart/form-data` with a proper upload limit, persist the raw file, enqueue an `ImportJob`, and have a real import worker process rows in batches with `createMany({ skipDuplicates: true })`. Set an explicit `bodyParser` limit in `main.ts` regardless.

---

### C7. CSV parser silently corrupts data
**Where:** `backend/src/imports/file-parser.util.ts` (`parseLine`)

The quote-state toggle fires on **both `"` and `'`**. There is no handling of escaped `""` and no support for quoted fields containing newlines.

**Impact:** `O'Brien`, `D'Souza`, `L'Oréal` flip the parser into "inside quotes" state for the rest of the line, so every following column shifts. Emails land in the company column and vice versa. There is no error — the rows import "successfully" with wrong data, and then you email the wrong people. For a contact-management product, silent data corruption is worse than a crash. (`.xls` is explicitly rejected, which is fine, but should be surfaced clearly in the UI.)

**Fix direction:** Use a battle-tested parser (`papaparse` is already in the frontend dependency list; `csv-parse` for the backend) instead of hand-rolling. At minimum: only `"` opens/closes a field, support `""` escapes, and support multi-line quoted values.

---

### C8. The Automations feature has no execution engine
**Where:** `backend/src/automations/*`, `docker/docker-compose.yml`, whole repo

`AutomationsService` is clean, transactional, versioned CRUD over `Automation` / `AutomationVersion` — it stores a `definition` JSON string and nothing ever reads it. A repo-wide search for `ScheduleModule`, `@Cron`, `node-cron`, and BullMQ `repeat:` returns **zero results**. `docker-compose.yml` runs exactly three workers: campaign, pcloud, email.

**Impact:** Users can build automations, set them `ACTIVE`, and nothing will ever fire. The `/automations` page (272 lines) is a fully built UI over a feature that does not exist. This is the largest completeness gap in the product.

**Fix direction:** Decide explicitly whether this ships in v1. If yes, you need a scheduler (BullMQ repeatable jobs or `@nestjs/schedule`) plus an interpreter for the `definition` JSON. If no, hide the nav entry and mark it Coming Soon so it isn't sold as working.

---

## 3. HIGH findings (P1 — fix before launch)

### H1. Refreshed Gmail access tokens are never saved
`workers/email-dispatch.worker.ts:148` tries to detect a token refresh:

```ts
if (sendPayload.accountCredentials && JSON.stringify(sendPayload.accountCredentials) !== JSON.stringify(credentials)) {
```

But `sendPayload.accountCredentials` **is** `credentials` — the same object reference. And `GmailAdapter.refresh()` (`backend/src/email/adapters/providers/gmail.adapter.ts`) returns a **new** object (`{ ...credentials, accessToken, expiresAt }`) without mutating its input. So the two sides are always identical and the condition is always false: this entire persistence block is dead code. `backend/src/email/email.service.ts` has the same JSON-string comparison pattern.

**Impact:** The database keeps a permanently expired `accessToken`. Every single send performs an extra round-trip to Google's token endpoint. At campaign scale (concurrency 5, thousands of recipients) that is thousands of refresh calls, which invites Google rate-limiting / `invalid_grant` and can get the OAuth app flagged.

**Fix:** Have `sendEmail` return the (possibly refreshed) credentials in its result, and persist them when they differ by `accessToken`/`expiresAt` rather than by JSON string identity.

### H2. Redis down blocks login and crashes the backend; database down does not
Three inconsistent failure policies coexist:

- `backend/src/prisma/prisma.service.ts` catches a failed connect, logs "Backend running in resilient mode", and boots anyway.
- `backend/src/jobs/jobs.service.ts` `onModuleInit` awaits `waitUntilReady()` on all four queues — so if Redis is down, the **whole backend crashes at boot**.
- `backend/src/auth/auth-rate-limit.guard.ts` throws `ServiceUnavailableException` on any Redis error — so if Redis dies after boot, **nobody can log in or register at all**.

**Impact:** Redis is a single point of total failure, including for authentication, which does not need it to be. Meanwhile a missing database — the thing you actually cannot work without — is treated as survivable.

**Fix:** Pick one policy. Recommended: fail fast at boot on both DB and Redis; degrade gracefully at runtime; and make the rate-limit guard **fail open with a warning** (a brief loss of throttling is far better than a total auth outage).

### H3. `PrismaService.isConnected` never recovers
Once the initial connect fails, `isConnected` is latched `false` and nothing re-checks it. There is no reconnect loop and no periodic probe.

**Impact:** A database that was momentarily unavailable at boot leaves the process permanently in "DEGRADED" mode. `backend/src/health/health.controller.ts` reports this stale flag, so your health endpoint (and therefore any load balancer or uptime monitor reading it) lies in both directions.

### H4. Every recipient re-downloads the entire attachment
`workers/email-dispatch.worker.ts:104` calls `downloadFileBuffer` per recipient, with `concurrency: 5`.

**Impact:** A 10MB file to 5,000 recipients means 50GB of pCloud egress per campaign and up to ~50MB of buffers resident at any moment (plus base64 expansion in the Gmail path, which is ~1.37×). You will hit pCloud throttling, and memory will spike unpredictably.

**Fix:** Fetch once per campaign (cache to a temp file or object store keyed by `pcloudFileId` + version), then stream from there. Add a per-`emailAccount` rate limiter (BullMQ supports `limiter: { max, duration }`) so you respect provider send limits.

### H5. Send quotas are decorative
`PCloudAccount.dailyLimit` and `sentToday` exist in `prisma/schema.prisma:83-84`. `workers/pcloud-share.worker.ts:202` increments `sentToday`. **Nothing ever reads `dailyLimit` to enforce it, and nothing ever resets `sentToday`.**

**Impact:** `sentToday` grows monotonically forever, so the number in the UI is meaningless. More importantly, there is no throttle protecting your pCloud and Gmail accounts from being suspended for bulk-sending — the exact risk this field was created to manage.

**Fix:** Enforce the limit before enqueueing (and inside the worker), and reset via a daily job with a `lastResetAt` timestamp. Add the same fields to `EmailAccount`.

### H6. Session cookie will break — or become CSRF-exploitable — in production
`backend/src/auth/auth.controller.ts` sets `HttpOnly; SameSite=Lax` (plus `Secure` in production). There is no CSRF token anywhere in the codebase.

**Impact:** If you deploy the frontend and backend on genuinely different sites (e.g. Vercel + Render), a `SameSite=Lax` cookie is **not sent on XHR**, so authentication silently fails in production while working perfectly on localhost. The natural fix — switching to `SameSite=None` — immediately exposes every state-changing endpoint to CSRF, because there is no token and no origin check.

**Fix:** Either deploy both on the same registrable domain (`app.x.com` / `api.x.com`) and keep `Lax`, or move to `SameSite=None; Secure` **plus** double-submit CSRF tokens and a strict `Origin` allowlist. Also replace the single-origin CORS default with an explicit allowlist.

### H7. Swagger is published in production
`backend/src/main.ts:35` mounts Swagger at `api/docs` unconditionally (`SwaggerModule.setup('api/docs', app, document)` — no `NODE_ENV` check anywhere in the file), and `jwt-auth.guard.ts` whitelists `/api/docs` as public.

**Impact:** Your full API surface, parameter names and schemas are handed to anyone. Combined with C4 (no real RBAC) and the absence of DTO validation, this is a ready-made attack map.

**Fix:** `if (process.env.NODE_ENV !== 'production')`, or put it behind admin auth.

### H8. No request validation anywhere
`ValidationPipe({ whitelist: true, transform: true })` is registered globally in `main.ts`, but **no controller uses `class-validator` DTO classes** — bodies are typed with plain TypeScript interfaces / inline object types, which are erased at runtime. `class-validator` is installed and unused.

**Impact:** The pipe is inert; it validates nothing and strips nothing. Concretely:
- `auth.service.register` does no email-format check and **no password policy at all** — `"a"` is an acceptable password (while `resetPassword` does enforce 8 characters, so the two paths disagree).
- `register` does `data.organizationName.toLowerCase()`; a request without that field throws `TypeError` → `500`.
- Duplicate emails in `users.service` / `contacts.service` surface as raw Prisma `P2002` → `500` instead of `409`.
- `email.controller.ts` `@Post(':id/test')` reads `req.body?.to` directly, bypassing even the pipe.

**Fix:** Write real DTOs with `@IsEmail`, `@MinLength`, `@IsUUID`, `@IsIn`, and set `forbidNonWhitelisted: true`. Map `P2002` to `409` in `HttpExceptionFilter`.

### H9. Password reset cannot work in production
`backend/src/auth/auth.service.ts:158` — the email-sending step is a `TODO`. In non-production the raw token is `console.log`ed.

**Impact:** A user who forgets their password has no recovery path. The token generation, SHA-256 hashing, 1-hour expiry and single-use `$transaction` are all correctly implemented — only the delivery is missing, which makes this a small fix with a large impact. (Positive note: the endpoint is correctly enumeration-safe.)

### H10. Session security gaps
`JWT_EXPIRATION` and `REFRESH_TOKEN_SECRET` exist in the environment files and are **never read**. Tokens are signed with a hardcoded `expiresIn: '7d'` in `auth.module.ts`, there is no refresh flow, no token revocation/denylist, and no email verification on registration.

**Impact:** A stolen cookie is valid for 7 days. Changing a password does not invalidate existing sessions. Logout can only clear the cookie client-side; the token itself stays valid. Anyone can register with an email they do not own.

### H11. No pagination — several endpoints will OOM
- `contacts.service.findAllContacts` returns **every** contact of an organization, each with all list memberships.
- `dashboard.service` loads **every** `PCloudShareExecution` row into memory just to count statuses (`select: { status: true }`) instead of using `groupBy`.
- `campaigns.service.findOne` hardcodes `recipients: { take: 100 }`, `executions: { take: 50 }` with no offset and no total — the UI silently shows a truncated list with no indication.

**Impact:** The dashboard gets slower with every campaign you run and eventually times out or exhausts memory. This is the classic defect that only appears after your first real customer.

### H12. Nothing writes to `ErrorLog`; `AuditLog` and `SystemSetting` are unused
`logs.service.getErrorLogs` reads `errorLog`, and a repo-wide search shows **no writes to it**. The `AuditLog` and `SystemSetting` models in `prisma/schema.prisma` are referenced by no code at all.

**Impact:** The Error Logs screen is permanently empty, which is worse than absent — it actively tells you "no errors" while workers are failing. And a multi-tenant B2B SaaS with **no audit trail** (who deleted that contact list? who changed that sender account?) will fail any customer security review, and leaves you unable to investigate incidents.

### H13. Campaign launch is not idempotent, and one failure fails everything
- `campaigns.service.launch()` has no guard against being called twice on the same campaign — double-click or a retried request enqueues the recipients again. There is no unique constraint on `CampaignRecipient (campaignId, contactId)` in the schema to catch it either.
- `workers/campaign.worker.ts:99-103`: the `failed` handler sets the **whole campaign** to `FAILED` on a single job failure.
- `campaigns.service.ts:60` is a dead ternary: `dto.config?.deliveryMode || (dto.emailAccountId ? 'EMAIL' : 'EMAIL')` — both branches are `'EMAIL'`.
- Worse, `campaign.worker.ts:39` uses a **different** fallback: `campaign.emailAccountId ? 'EMAIL' : 'PCLOUD_NATIVE'`. API and worker disagree about the default delivery mode, so behaviour depends on which code path last wrote `config`.

**Impact:** Duplicate emails to real contacts (unrecoverable reputational damage), and delivery mode that is hard to reason about.

### H14. Emails are sent as plain text only
`smtp.adapter.ts` sets `text: payload.body` with no `html`, and `gmail.adapter.ts` emits `Content-Type: text/plain`. Meanwhile `template-variable.resolver.ts` does **not** HTML-escape substituted values, and the direct-link branch appends `\n\nDownload Document: <url>`.

**Impact:** If your template editor stores any markup, recipients see raw tags. If you later add an HTML part without adding escaping, every `#VAR#` becomes an HTML/link-injection vector into your own outbound mail (a real phishing risk carried by your verified domain).

**Fix:** Send `text` + `html` multipart, and escape all substituted values in the HTML part.

### H15. Template variable defects
`backend/src/templates/template-variable.resolver.ts`:
- `generateRandomCode` uses `Math.random()`. This code is persisted as `CampaignRecipient.randomCode` and used as a message identifier. `Math.random()` is not cryptographically random and is predictable across a run — do not use it for anything a recipient sees or that identifies a delivery. Use `crypto.randomUUID()`.
- Custom-field tags are built in uppercase and matched with case-sensitive `replaceAll`, so a lowercase custom tag **never resolves** and goes out to the recipient as literal `#somefield#`.

### H16. Missing hardening middleware
No `helmet` (no CSP, no HSTS, no `X-Frame-Options`, no `nosniff`), no global rate limiting (only the two auth routes are throttled), no explicit body size limits, no CSRF. `@nestjs/throttler` is not installed.

### H17. Public-route matching is prefix-based on the raw URL
`backend/src/auth/jwt-auth.guard.ts` decides that a request is public by `request.originalUrl.startsWith(...)` against `/api/v1/auth/login`, `/register`, `/forgot-password`, `/reset-password`, `/api/health`, `/api/docs`.

**Impact:** Prefix matching means any future route whose path merely *starts with* one of these strings becomes public without anyone noticing — e.g. `/api/v1/auth/register-admin`, or `/api/healthz-internal`. This is a silent auth-bypass generator.

**Fix:** Use an explicit `@Public()` decorator with `Reflector` metadata, or match exact normalised paths (`request.route.path`), never string prefixes on `originalUrl`.

### H18. Type safety is disabled where it matters most
`tsconfig.json` (root) and `backend/tsconfig.json` set `strictNullChecks: false`, `noImplicitAny: false`, `strictBindCallApply: false`, `forceConsistentCasingInFileNames: false`. `frontend/tsconfig.json` correctly sets `strict: true`.

**Impact:** The "0 type errors" result on the backend is much weaker than it looks. Every `campaign.pcloudAccount.provider`-style access on a nullable relation compiles fine and can throw at runtime — and the codebase does exactly this in several worker paths (e.g. `campaign.worker.ts:78` dereferences `campaign.pcloudAccount` and `campaign.template` without a null check; `pcloud-share.worker.ts:117` dereferences `campaign.pcloudFile`). Also, case-insensitive filename matching will break the moment you build in Docker/Linux.

---

## 4. MEDIUM findings (P2 — fix soon after launch)

**M1. Schema is missing uniqueness guarantees.** `Role` has no `@@unique([organizationId, name])`, so two concurrent logins can both run `ensureAdminRole` and create duplicate ADMIN roles. `CampaignRecipient` has no `@@unique([campaignId, contactId])` (see H13). Contact email uniqueness per organization is not enforced, so lists accumulate duplicates and every duplicate is a duplicate email.

**M2. `Campaign` requires pCloud fields even for pure-email sends.** `pcloudAccountId`, `pcloudFileId` and `templateId` are all non-nullable in `prisma/schema.prisma`, yet `deliveryMode: 'EMAIL'` is the default. You cannot create a plain email campaign without inventing a pCloud file. Make the pCloud fields nullable and validate per delivery mode.

**M3. Environment configuration has drifted.** `.env` exists at both the repo root and `backend/.env` with overlapping keys — two sources of truth that will diverge. `EMAIL_CREDENTIAL_ENCRYPTION_KEY` is documented in `.env.example` and `docker-compose.yml` but **`backend/src/email/email.credentials.ts` actually uses `PCLOUD_CREDENTIAL_ENCRYPTION_KEY`** for email credentials — so the documented key is dead config and email credentials share the pCloud key. `PCLOUD_FOLDER_ID` vs `PCLOUD_DEFAULT_FOLDER_ID` mismatch (C5a). `MICROSOFT_*` variables are read by code but documented nowhere. `REDIS_PASSWORD`, `WEBSOCKET_PORT`, `JWT_EXPIRATION`, `REFRESH_TOKEN_SECRET` are defined and never used. `validate-environment.ts` never checks any email-related key.
**Positive:** `.gitignore` correctly excludes `.env`/`.env.*` while allowing `.env.example`, and `git ls-files` confirms **no secret file has ever been committed**. That part is clean.

**M4. OAuth state is signed with `JWT_SECRET`.** `backend/src/email/email.service.ts` HMAC-signs the Gmail OAuth `state` with the session-signing secret. Reusing one secret across two cryptographic purposes means a leak in either context compromises both, and you cannot rotate them independently. Use a dedicated `OAUTH_STATE_SECRET`.

**M5. The Microsoft email provider is unreachable.** `microsoft.adapter.ts` is fully implemented and `microsoftConfigured()` reads `MICROSOFT_*` env vars, but **no Microsoft OAuth routes exist** in `email.controller.ts` (only `gmail/authorize` and `gmail/callback`). The provider can never be connected through the UI.

**M6. Real-time is entirely absent on both ends.** `socket.io` + `@nestjs/platform-socket.io` are backend dependencies and `socket.io-client` is a frontend dependency, but there is **no gateway file anywhere** in the backend. `frontend/src/lib/socket.ts` has zero importers and, if it were used, would read the JWT from `localStorage` — a key that `apiClient`'s request interceptor **actively deletes on every request** — so it would always authenticate with `null`. Either build the gateway or drop the dependencies.

**M7. Dead code to remove.** `frontend/src/services/storageService.ts`, `frontend/src/services/mockData.ts` (269 lines), `frontend/src/lib/socket.ts` — all zero importers. `workers/email.worker.ts` is a legacy class defaulting to the `'fake'` provider. `workers/import.worker.ts` is a no-op stub. `backend/src/accounts/*` and `backend/src/storage/*` are superseded by `pcloud/accounts` and `pcloud/files`. `frontend/src/lib/apiClient.ts` is a one-line re-export of `services/apiClient.ts`. `useAuthStore` still carries a `token` field although auth is cookie-based.

**M8. Docker and CI gaps.** The three worker services run `npx ts-node --transpile-only` with `NODE_ENV=production` — slow start, no type checking, dev toolchain in production; they should run compiled output. The backend image runs as **root** (no `USER node`) and copies dev dependencies into the runner stage. Workers have no healthchecks. CI (`.github/workflows/ci.yml`) never runs a linter for either app and runs **no frontend tests or typecheck — only `npm run build`**; since `eslint` currently reports 58 errors in the frontend, adding that gate is a prerequisite for it being meaningful.

**M9. Frontend routing/auth inconsistencies.** `middleware.ts` `PROTECTED_ROUTES` is missing **`/files`** and **`/email-accounts`** — both live sidebar destinations — while still listing `/attachments`, which is now only a redirect. Those two pages render their shell to unauthenticated visitors (data is still safe: the API returns 401 and the interceptor redirects) — but the inconsistency will bite when someone adds a route and forgets the list. Also, `forgot-password`, `reset-password` and `admin` pages bypass the shared `apiClient` with their own `const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'` and raw `fetch`, duplicating the baseURL and losing the shared 401 handling.

**M10. Error UX is `alert()`.** There are 21+ `window.alert()` calls across `campaigns`, `contacts`, `templates`, `imports`, `automations` and `reset-password` for both errors and success. No toasts, no inline field errors, no retry affordance. Combined with H8 (backend returns raw `500`s), a user hitting a duplicate email sees a browser alert reading `Create contact error: Request failed with status code 500`.

**M11. Misleading metrics.** `dashboard.service` returns `successRate: '100.0'` when there are zero jobs. `pCloudAccount.sentToday` never resets (H5). `Campaign.retryingCount` is incremented on every retry and never decremented, so it is a cumulative counter displayed as a current state. `admin.controller.activeWorkers` counts busy queues, not workers.

**M12. The public health endpoint leaks internals.** `backend/src/health/health.controller.ts` returns `environment` and per-subsystem status without auth. Return a bare `200 OK` publicly and keep details behind admin auth.

**M13. API surface conventions are inconsistent.** Most controllers live under `api/v1/...`, but `storage.controller.ts` is `@Controller('attachments')` and `accounts.controller.ts` is `@Controller('accounts')` — unversioned. Removing both (M7) resolves this.

**M14. No clean git baseline.** 142 files are modified and uncommitted on top of `b75e97e`. That is nearly every source file, which suggests a bulk change (line endings are the most likely cause — no `.gitattributes` is present to normalise CRLF). Until this is resolved you have **no reviewable diff and no rollback point**, which makes every fix in this report riskier than it needs to be. Note: `.git/index.lock` is present and could not be removed from this sandbox — worth checking that no editor or git process is stuck.

---

## 5. What is genuinely good

It is worth being clear about this, because the list is long and it is why the project is fixable rather than restartable.

The **worker idempotency and crash-recovery design is better than most production systems I see**. Both `email-dispatch.worker.ts` and `pcloud-share.worker.ts` check for an already-`SUCCESS` state before acting, and — critically — if they find a job in `PROCESSING` with `attemptsMade > 0` (meaning the process died mid-external-call), they refuse to retry and instead mark the recipient `MANUAL_REVIEW` with `EXTERNAL_OPERATION_UNCERTAIN`. Choosing manual reconciliation over the risk of double-sending to a real customer is exactly the right call, and it is deliberate, thoughtful engineering.

The **multi-tenant scoping discipline is strong**: nearly every Prisma call carries `organizationId` from the JWT, and `findFirst({ where: { id, organizationId } })` is used consistently instead of the naive `findUnique({ where: { id } })`. C3 is a genuine exception, not the norm.

**Credential handling is well built**: AES-256-GCM with a versioned `v1.iv.tag.data` envelope, bcrypt at cost 12, HttpOnly cookies with the token stripped from response bodies, SHA-256-hashed single-use reset tokens with expiry, an enumeration-safe forgot-password response, and a Redis-backed login rate limiter. The `validate-environment.ts` fail-fast check (including refusing `PCLOUD_ALLOW_MOCK` in production) shows the right instincts.

The **adapter/factory pattern** for email and pCloud providers is clean and testable, `EmailAdapterFactory` explicitly refuses the fake provider in production, and the **queue topology** (campaign fan-out → per-recipient dispatch queues, exponential backoff, `removeOnComplete` bounds) is the correct shape for this workload. The frontend is modern and coherent — App Router, `strict: true`, a shared axios client with a 401 interceptor, cookie-based auth with no token in `localStorage`, and a documented rationale in `middleware.ts` for *not* validating the JWT at the edge (avoiding redirect loops), which is a subtle point handled correctly.

---

## 6. Completeness — kya ban gaya, kya baaki hai

| Feature | Status | Reality |
|---|---|---|
| Register / login / logout / me | ✅ Working | No email verification; no password policy (H8) |
| Forgot / reset password | 🟡 Half | Logic complete, **email delivery is a TODO** (H9) |
| Multi-tenant isolation | 🟡 Mostly | One IDOR (C3), one shared-array module (C5c) |
| Roles & permissions | ❌ Not working | No role API; everyone is ADMIN (C4) |
| Contacts & lists CRUD | ✅ Working | No pagination, no dedupe, 500s on duplicates |
| CSV / XLSX import | ❌ Broken | 100KB limit (C6) + parser corruption (C7); async path unwired |
| Templates + variables | 🟡 Working | Plain-text only, no escaping, lowercase custom tags broken (H14, H15) |
| pCloud accounts & files | ✅ Working | Real client implemented; quotas unenforced (H5) |
| Email accounts (Gmail OAuth) | 🟡 Working | Token refresh never persisted (H1) |
| Email accounts (SMTP) | ✅ Working | Verified before save; TLS enforced |
| Email accounts (Microsoft) | ❌ Unreachable | Adapter exists, no OAuth routes (M5) |
| Campaign create / launch / pause | 🟡 Working | Not idempotent; delivery-mode logic contradictory (H13) |
| Campaign delivery (email) | 🟡 Working | **Silently drops attachments** (C1) |
| Campaign delivery (pCloud share) | ✅ Working | Best-implemented path in the codebase |
| Attachments / storage module | ❌ Fake | Hardcoded list, fabricated uploads, nothing persisted (C5e) |
| Automations | ❌ Not implemented | CRUD only, no scheduler or interpreter (C8) |
| Share logs | ✅ Working | Real execution data |
| Error logs | ❌ Empty forever | Nothing writes `ErrorLog` (H12) |
| Audit trail | ❌ Missing | Model unused (H12) |
| Dashboard | 🟡 Working | In-memory aggregation, misleading rates (H11, M11) |
| Admin console | ❌ Fake | Hardcoded health values (C5d) |
| Settings | 🟡 Read-only | Displays data; no save path; fabricated org fallback (C5b) |
| Real-time updates | ❌ Missing | Dependencies present, no gateway (M6) |

---

## 7. Recommended fix order

**Week 1 — stop the silent lies (P0).** Fix C1 (never send without the attachment) first; it is a handful of lines and it is the difference between a product that works and one that appears to. Then strip the Docker secret fallbacks (C2), fix the contact-list IDOR (C3), and delete the fake modules — `backend/src/accounts`, `backend/src/storage`, the `organizations.service` fabricated fallback and swallowed catch, the placeholder branch in `storage/pcloud.adapter.ts`, and the three dead frontend mock files (C5). Deleting fake code is faster than fixing it and it immediately makes your own testing trustworthy.

**Week 2 — make the platform honest and safe.** Build the roles module and make `RolesGuard` deny-by-default (C4). Add real `class-validator` DTOs across every controller plus `P2002 → 409` mapping (H8). Add `helmet`, an explicit body limit, a CORS allowlist, and gate Swagger to non-production (H7, H16). Replace prefix-based public-route matching with a `@Public()` decorator (H17). Wire the password-reset email (H9). Turn on `strictNullChecks` in the backend `tsconfig` and fix the fallout — expect real null-dereference bugs in the workers to surface, which is the point (H18).

**Week 3 — make it work at real scale.** Rebuild imports on multipart upload + a real import worker + batched `createMany`, and swap in a proven CSV parser (C6, C7). Cache the campaign attachment once instead of per recipient, and add a per-account send limiter (H4). Add pagination to contacts, campaign detail and logs, and convert the dashboard to `groupBy` (H11). Enforce and reset daily quotas (H5). Persist refreshed OAuth tokens correctly (H1). Add launch idempotency plus the missing unique constraints (H13, M1).

**Week 4 — operability and the deployment decision.** Start writing `ErrorLog` and `AuditLog` (H12) and point the admin console at real probes (C5d). Settle the failure policy for Redis and the database, and make the rate-limit guard fail open (H2, H3). Decide the frontend/backend domain strategy before you deploy, because it determines your cookie and CSRF design (H6) — this is a five-minute decision that is expensive to reverse. Make the CI gate meaningful: lint + typecheck + test for both apps, and compiled workers in Docker rather than `ts-node` (M8). Finally, decide whether Automations ships or gets hidden (C8), and commit or revert those 142 files so you have a baseline to work from (M14).

---

## 8. Appendix — method and limitations

**Verified by execution:** `backend` `npx tsc --noEmit --incremental false` → **0 errors**. `frontend` `npx tsc --noEmit` → **clean**. `frontend` `npx eslint src` → **90 problems (58 errors, 32 warnings)**. `git ls-files | grep env` → only `.env.example` is tracked, so **no secrets are in version control**. `git status` → 142 modified files.

**Verified by reading:** the full Prisma schema (20 models), all backend modules and guards, all four worker entrypoints, the email and pCloud adapter layers, `main.ts` and environment validation, `docker-compose.yml` and `Dockerfile.backend`, `ci.yml`, the frontend service/store/middleware layer, and the page inventory (4,015 lines across 19 pages). Dead-code claims were confirmed by importer counts, not assumption. Environment files were read **masked** — no secret value was printed or recorded.

**Not done (deliberately):** no file was created, modified or deleted except this report; no build, `npm install`, `prisma migrate` or `prisma generate` was run; **the six test files under `tests/` were not executed** because they require a live Postgres and Redis and would write to your database — so I can confirm the tests exist and that backend CI runs them, but not that they currently pass; runtime behaviour was not observed, so the findings above are derived from code, schema and configuration rather than from a running system. The largest frontend page (`app/campaigns/new/page.tsx`, 644 lines) was inventoried and grep-audited but not read line by line, so there may be additional UI-level defects there.

**Confidence:** the P0 and P1 findings are all traceable to specific lines quoted above and I consider them solid. The severity ordering reflects my judgement about business impact — C1, C4 and C8 are the three that most directly determine whether this can be sold as working software.
