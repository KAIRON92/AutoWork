# ARITRA — AutoWork Testing & Setup Guide

**Audience:** Aritra (developer / QA tester)

**Branch to test:** `final-hardening`

**Repository:** `KAIRON92/AutoWork`

This document is a practical setup and QA guide for testing the current AutoWork handover candidate. It is intentionally credential-free. Never put client passwords, pCloud tokens, OAuth secrets, JWT secrets, or encryption keys into this file, GitHub, screenshots, logs, tickets, or chat.

---

## 1. What you are testing

AutoWork is a Next.js frontend + NestJS backend application using:

- PostgreSQL / Prisma
- Redis / BullMQ
- pCloud integration
- campaign and automation workers
- contacts/imports/templates
- authenticated organizations/users
- provider integrations

The current acceptance target is **real functionality**, not a UI/demo simulation.

The intended validation chain is:

```text
REAL AUTOWORK LOGIN
  -> REAL TENANT / ORGANIZATION
  -> REAL PCLOUD ACCOUNT
  -> REAL PCLOUD FOLDER / FILE
  -> REAL IMPORT
  -> REAL CONTACTS
  -> VERIFIED AUTHENTICATED SENDER (when email workflow is enabled)
  -> REAL RECIPIENT
  -> REAL TEMPLATE / VARIABLES
  -> REAL COMPONENT / FILE
  -> CAMPAIGN
  -> REDIS / BULLMQ
  -> REAL WORKER
  -> REAL PROVIDER / PCLOUD OPERATION
  -> REAL EXTERNAL RESULT
  -> EXECUTION LOG
  -> ANALYTICS
```

A mock provider response, seeded demo record, database row alone, or green button is **not** acceptance evidence.

---

## 2. Branch rule

**Do not test `main` for this handover pass.**

Use:

```powershell
git clone -b final-hardening https://github.com/KAIRON92/AutoWork.git AutoWork-test
cd AutoWork-test
git status
git branch --show-current
git log -1 --oneline
```

Expected branch:

```text
final-hardening
```

Do not push test changes back to `final-hardening` unless explicitly requested. Prefer a separate local test branch if code changes are required.

---

## 3. Machine prerequisites

Recommended/verified development stack:

- Windows 11 or compatible Windows environment
- WSL2
- Docker Desktop with WSL2 backend
- Git
- Node.js **20.x**
- npm **10.x**
- browser

The previously verified setup used:

```text
Node.js 20.20.2
npm 10.8.2
PostgreSQL 15 Alpine
Redis 7 Alpine
Prisma 5.22.0
Next.js 16.3.0
```

Do not switch the backend to Node 24 during this test unless the project has been explicitly revalidated for it.

Verify:

```powershell
node --version
npm --version
docker --version
docker compose version
docker info
```

---

## 4. Dependencies and installation

There are separate dependency trees for the backend and frontend.

### Backend

```powershell
cd D:\AutoWork-main\backend
npm install
```

### Frontend

Open another terminal:

```powershell
cd D:\AutoWork-main\frontend
npm install
```

### Important native dependency warning

The backend uses native dependencies such as `bcrypt`.

Do **not** use `npm install --ignore-scripts` for the normal setup. It can leave native binaries missing and produce an error like:

```text
Cannot find module ... bcrypt_lib.node
```

If that happens after a bad installation:

```powershell
taskkill /F /IM node.exe 2>$null
Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
npm install
```

Do not run `npm audit fix --force` during acceptance testing. It can introduce unrelated breaking dependency changes.

---

## 5. Docker / PostgreSQL / Redis

The Compose file is at the **project root**:

```text
docker/docker-compose.yml
```

Run Compose from the root, not from `backend/`:

```powershell
cd D:\AutoWork-main
docker compose -f .\docker\docker-compose.yml up -d postgres redis
docker compose -f .\docker\docker-compose.yml ps
```

Expected services:

```text
postgres   Up
redis      Up
```

Verify Redis:

```powershell
docker exec docker-redis-1 redis-cli ping
```

Expected:

```text
PONG
```

Verify PostgreSQL container is running:

```powershell
docker compose -f .\docker\docker-compose.yml ps postgres
```

The Compose `version is obsolete` warning is non-blocking. Do not mistake it for a service failure.

---

## 6. Database / Prisma

From `backend/`:

```powershell
$env:DATABASE_URL="postgresql://autowork:autoworkpass@localhost:5432/autowork_db?schema=public"
npx prisma generate --schema=../prisma/schema.prisma
```

For a clean test database where migrations are intended to be applied:

```powershell
npx prisma migrate deploy --schema=../prisma/schema.prisma
```

Do not casually run destructive database reset commands against a database containing real test/client data.

If Prisma reports an `ECONNRESET` while downloading engines, retry `npx prisma generate`; do not modify the application to bypass Prisma generation.

If you see:

```text
@prisma/client did not initialize yet
```

run `npx prisma generate --schema=../prisma/schema.prisma` and verify the command succeeds before starting NestJS.

---

## 7. Local environment / secrets

Use local environment configuration only. Never commit secrets.

The important local settings include:

```text
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://autowork:autoworkpass@localhost:5432/autowork_db?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=<local-random-secret>
PCLOUD_DEFAULT_PROVIDER=pcloud
PCLOUD_ALLOW_MOCK=false
PCLOUD_API_URL=https://api.pcloud.com
PCLOUD_API_HOST=https://api.pcloud.com
PCLOUD_CREDENTIAL_ENCRYPTION_KEY=<base64-32-byte-key>
WEBSOCKET_PORT=4001
```

Generate a local pCloud encryption key if needed:

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 256) }))
```

The value must decode to exactly 32 bytes.

Never copy real credentials into this documentation.

---

## 8. Start backend

```powershell
cd D:\AutoWork-main\backend
npm run build
npm run start:dev
```

Before moving to browser testing, verify:

```powershell
curl.exe http://localhost:4000/api/health
```

The API and database must report healthy.

Also verify Swagger if enabled:

```text
http://localhost:4000/api/docs
```

Do not proceed to provider testing if the backend cannot reach PostgreSQL.

---

## 9. Start frontend

In a second terminal:

```powershell
cd D:\AutoWork-main\frontend
npm run dev
```

Open:

```text
http://localhost:3000
```

Keep the backend terminal running.

If the browser repeatedly refreshes/redirects:

1. confirm backend is running;
2. confirm database is healthy;
3. confirm browser session/cookies are not stale;
4. try an Incognito window;
5. inspect browser console and Network tab;
6. do not add an authentication bypass just to stop the redirect.

---

## 10. Authentication test

Test:

- login
- dashboard
- profile/settings
- protected route access
- logout
- re-login

Expected behavior:

- unauthenticated requests cannot access protected data;
- logout invalidates the application session;
- re-login creates a valid session;
- one organization's data must not appear for another organization.

Do not confuse the AutoWork login account with the pCloud account. They are separate identities.

---

## 11. pCloud test — REAL vs MOCK

For production-style validation:

```text
PCLOUD_DEFAULT_PROVIDER=pcloud
PCLOUD_ALLOW_MOCK=false
```

The real pCloud path must use the official provider API.

If the UI says `MOCK_PCLOUD`, that is **not** a successful real pCloud test.

Test non-destructively:

1. connect the authorized pCloud account;
2. verify account information;
3. browse a real folder;
4. list real files;
5. inspect real file metadata;
6. select one non-destructive test document.

Do **not** delete, move, overwrite, rename, or modify production files during acceptance testing.

If real pCloud login fails:

- verify the account independently with the official pCloud website;
- capture the non-secret API error/status;
- check US/EU API host behavior;
- check whether the supplied credential is the expected password/token type;
- check network connectivity.

Never solve a real pCloud failure by silently enabling mock mode.

---

## 12. Import testing

Test a real test CSV first.

Verify:

- file upload
- preview
- header detection
- email extraction
- first/last name extraction
- phone extraction
- company extraction
- target extraction
- invalid email detection
- duplicate detection
- persistence to the current organization
- selected/individual/bulk contact behavior

Then test XLSX with a real workbook.

The Excel path must use a real workbook parser. Do not accept a UI-only `.xlsx` file picker as proof of Excel support.

For legacy `.xls`, verify that the application either genuinely parses it or explicitly rejects it with a clear conversion instruction. It must not silently treat a binary `.xls` file as plain text.

Known likely import failures:

- wrong API base URL
- missing authentication cookie
- malformed CSV encoding
- duplicate contacts
- invalid email normalization
- Excel parser/dependency mismatch
- organization/tenant mismatch
- empty file
- missing required email column

---

## 13. Contacts

After import, verify that contacts are actually persisted.

Check:

- correct organization
- correct email
- correct names
- duplicate handling
- search
- individual selection
- Select All
- selected count

Never accept seeded/demo contacts as import evidence.

---

## 14. Sender accounts

A sender must be an **authenticated provider account**.

Do not type an arbitrary email address and treat it as a verified sender.

If Gmail/Google Workspace is configured, the expected path is:

```text
Add account
 -> official Google OAuth
 -> authorization
 -> mailbox identity verification
 -> send permission verification
 -> controlled test send
 -> real provider message/reference ID
 -> VERIFIED
```

Do not use a Gmail password as a replacement for OAuth.

Do not expose OAuth client secrets or access/refresh tokens in the test report.

If the sender integration is not configured, report it as **BLOCKED/NOT CONFIGURED**, not PASS.

---

## 15. Recipient test

First run exactly **one recipient**.

Verify:

- search
- individual selection
- Select All
- selected count
- correct email
- correct organization

Do not move to 2–5 recipients until the one-recipient test succeeds.

---

## 16. Template test

Use a simple controlled template such as:

```text
Hello #NAME#,

Please review the document.

Reference: #RANDOM#
```

Verify:

- variables resolve correctly;
- unresolved variables are not silently sent;
- recipient-specific values are correct;
- preview matches the final campaign content.

---

## 17. Campaign test

Create a campaign and verify it initially exists as:

```text
DRAFT
```

Before launch verify:

- tenant ownership
- pCloud account
- pCloud file
- authenticated sender where required
- recipient(s)
- template
- component/attachment
- permissions

Then launch and observe the actual lifecycle:

```text
DRAFT -> QUEUED -> RUNNING -> COMPLETED
```

If the provider fails, the campaign must not be falsely marked successful.

---

## 18. Redis / BullMQ worker test

Verify:

1. job is created;
2. Redis receives the job;
3. correct worker consumes it;
4. worker executes the intended operation;
5. job completes/fails correctly;
6. campaign counters update;
7. recipient-level result is persisted.

Check worker logs rather than assuming the UI status is proof of execution.

Likely failures:

- Redis unavailable
- wrong queue name
- worker not started
- worker environment differs from API environment
- duplicate job
- retry without idempotency
- job marked complete before provider result

---

## 19. Automation / live updates

Verify the automation/campaign view shows real records.

Check:

- campaign
- sender
- recipient
- status
- timestamp
- provider
- result

Where WebSocket/Socket.IO updates are expected, verify that the UI changes without a manual refresh.

A page that only shows a static status after refresh is not proof of live updates.

---

## 20. Analytics

Dashboard numbers must come from real database records.

Verify against the actual test campaign:

- active campaigns
- completed campaigns
- recipient count
- successful operations
- failed operations
- connected accounts

Fake/seeded counters are not acceptable.

---

## 21. Security / tenant isolation

At minimum verify:

- user cannot access another organization's contacts;
- user cannot access another organization's campaigns;
- user cannot access another organization's pCloud connection;
- unauthorized campaign launch is blocked;
- admin endpoints are protected;
- file ownership/tenant ownership is enforced;
- secrets are absent from API responses;
- passwords/tokens are absent from logs;
- no production mock fallback exists;
- rate limiting behaves correctly.

Do not attempt destructive security tests against the real client account. Use local test users/organizations for authorization-boundary checks.

---

## 22. UI regression checklist

Visit every navigation item and verify there are no:

- 404 pages
- dead links
- fake buttons
- empty placeholder pages
- broken forms
- infinite loading states
- console exceptions
- repeated refresh loops
- API 401/403/404/500 errors caused by the application

Known areas to pay particular attention to:

```text
Dashboard
Accounts / pCloud Accounts
Email Accounts
Contacts
Imports
Templates
Campaigns
Campaigns/New
Automations
Files / Attachments
Logs
Settings
Admin
Login
Register
Forgot Password
Reset Password
```

---

## 23. Build and automated tests

Backend:

```powershell
cd D:\AutoWork-main\backend
npm run build
npm test -- --runInBand
```

Frontend:

```powershell
cd D:\AutoWork-main\frontend
npm run build
```

If lint/typecheck scripts exist in the current package, run them as well.

Do not edit tests merely to make failures disappear. A failing test must be understood and fixed at the implementation level unless the test itself is demonstrably obsolete and the change is documented.

---

## 24. What counts as a real bug

Treat these as genuine bugs unless proven otherwise:

- UI reports success but provider operation failed;
- campaign reaches COMPLETED without a real provider result;
- arbitrary sender address is accepted as authenticated;
- pCloud mock is silently used in production configuration;
- tenant A can read tenant B's records;
- credentials/tokens appear in API responses/logs;
- worker status says completed but no provider call occurred;
- analytics disagree with database execution records;
- import says success but contacts were not persisted;
- XLSX is accepted but not actually parsed;
- protected page is reachable without authentication;
- logout does not invalidate the session;
- missing provider configuration silently falls back to fake data;
- deleting an AutoWork connection deletes external pCloud files/account.

---

## 25. What is NOT a bug by itself

These may be warnings or expected behavior and should be investigated before reporting them as failures:

- Docker Compose warning that `version` is obsolete;
- dependency deprecation warnings during npm install;
- Next.js middleware/proxy migration warning;
- an intentionally unconfigured optional provider reporting `NOT CONFIGURED`;
- an intentionally blocked production mock provider;
- a real provider refusing invalid credentials.

A warning becomes a release blocker only when it causes incorrect behavior, security risk, or prevents the required workflow.

---

## 26. Test report format

Return one concise table:

| Area | PASS / FAIL / BLOCKED | Evidence |
|---|---|---|
| Environment | | |
| PostgreSQL | | |
| Redis | | |
| Backend | | |
| Frontend | | |
| Authentication | | |
| Tenant isolation | | |
| pCloud | | |
| Import CSV | | |
| Import XLSX | | |
| Contacts | | |
| Sender account | | |
| Recipients | | |
| Templates | | |
| Campaign | | |
| BullMQ/Worker | | |
| Provider operation | | |
| Automation/live updates | | |
| Analytics | | |
| Logs | | |
| Security | | |
| Backend tests | | |
| Frontend build | | |
| E2E | | |

For every FAIL provide:

```text
Failure:
Expected:
Actual:
Exact endpoint/page/worker:
Relevant non-secret error:
Likely root cause:
Reproduction steps:
```

Do not paste passwords, tokens, cookies, OAuth secrets, JWTs, or encryption keys into the report.

---

## 27. First real acceptance test

Do not start with a large campaign.

Use:

```text
1 real authenticated sender (if enabled)
1 recipient
1 non-destructive pCloud document
1 template
1 campaign
```

Verify the complete chain:

```text
Login
 -> pCloud auth
 -> real file
 -> recipient
 -> template
 -> campaign
 -> Redis job
 -> worker
 -> real provider/pCloud operation
 -> external result/reference
 -> execution log
 -> analytics
```

Only after this succeeds should a controlled 2–5 recipient test be attempted.

---

## 28. Hard rules for this test

**DO:**

- use `final-hardening`;
- use Node 20;
- keep PostgreSQL and Redis running;
- test real APIs when the required credentials/configuration are authorized and available;
- use a non-destructive test document;
- record exact errors;
- test tenant isolation using local test organizations;
- report BLOCKED when a required provider is not configured.

**DO NOT:**

- test `main` and report it as the final hardening build;
- enable mock pCloud to make a real test pass;
- create fake provider success records;
- spoof a sender address;
- bypass authentication;
- disable authorization guards;
- modify tests to hide implementation failures;
- delete/move/overwrite production pCloud data;
- commit secrets;
- paste credentials into the report;
- run destructive database resets against real/client data.

---

## 29. Final definition of DONE

Testing is complete only when the agreed client workflow has been demonstrated with real execution and the same result is visible consistently in:

1. external provider/pCloud;
2. Redis/BullMQ;
3. worker execution;
4. PostgreSQL records;
5. execution logs;
6. analytics/UI.

If one stage fails, report the exact failure instead of marking the overall workflow PASS.

**This guide is a testing manual, not a substitute for the client's final business specification. If a business requirement conflicts with an assumption in this document, stop and request clarification rather than inventing behavior.**
