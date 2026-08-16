# ARITRA — CURRENT REAL ACCEPTANCE HANDOFF

**Repository:** `KAIRON92/AutoWork`

**Branch to test:** `fix/real-acceptance-pcloud-email`

**Important:** This branch is the current acceptance candidate. It is based on the hardened line and currently contains the real-provider pCloud acceptance fixes. Do not test `main` for this pass.

## 1. Clone exactly this branch

```powershell
git clone -b fix/real-acceptance-pcloud-email https://github.com/KAIRON92/AutoWork.git AutoWork-test
cd AutoWork-test
git branch --show-current
git log -3 --oneline
```

Expected branch:

```text
fix/real-acceptance-pcloud-email
```

Do not push tester changes back to this branch. If code changes are required during QA, create a separate local branch.

## 2. Verified baseline

Use Node 20.x / npm 10.x.

Previously validated environment:

- Node.js 20.20.2
- npm 10.8.2
- PostgreSQL 15 Alpine
- Redis 7 Alpine
- Prisma 5.22.0
- Next.js 16.3.0

Do not run `npm audit fix --force` during acceptance.

## 3. Install

Backend:

```powershell
cd backend
npm install
```

Frontend:

```powershell
cd ..\frontend
npm install
```

Do not use `--ignore-scripts` for normal installation.

## 4. Start infrastructure

From repository root:

```powershell
docker compose -f .\docker\docker-compose.yml up -d postgres redis
docker compose -f .\docker\docker-compose.yml ps
```

Redis check:

```powershell
docker exec docker-redis-1 redis-cli ping
```

Expected: `PONG`.

## 5. Prisma

From `backend`:

```powershell
$env:DATABASE_URL="postgresql://autowork:autoworkpass@localhost:5432/autowork_db?schema=public"
npx prisma generate --schema=../prisma/schema.prisma
npx prisma migrate deploy --schema=../prisma/schema.prisma
```

Do not reset a database containing real test/client data.

## 6. Required local environment

Use local secrets only. Never commit credentials.

```text
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=<local postgres URL>
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=<random local secret>
PCLOUD_DEFAULT_PROVIDER=pcloud
PCLOUD_ALLOW_MOCK=false
PCLOUD_CREDENTIAL_ENCRYPTION_KEY=<32-byte base64 key>
WEBSOCKET_PORT=4001
```

If Gmail testing is required, configure the official OAuth values locally. If they are not configured, report Gmail as `BLOCKED / NOT CONFIGURED`, not PASS.

## 7. Start application

Backend:

```powershell
cd backend
npm run build
npm run start:dev
```

Health:

```powershell
curl.exe http://localhost:4000/api/health
```

Swagger:

```text
http://localhost:4000/api/docs
```

Frontend:

```powershell
cd frontend
npm run dev
```

Open `http://localhost:3000`.

## 8. pCloud authentication — important current fix

The previous implementation incorrectly tried to use `/userinfo` as the password-login/TFA exchange. The current branch now uses the official pCloud login flow:

```text
/login
   |
   | result 0
   v
auth token
```

or, when TFA is required:

```text
/login
   |
   | result 2297 + challenge token
   v
/tfa_login + current one-time code
   |
   v
auth token
```

The application stores only the resulting auth token, encrypted at rest. It does not store the pCloud password.

If pCloud requires TFA, enter the current code in the **pCloud 2FA Code** field. Never paste a password or token into a report.

pCloud officially documents username/password login and token authentication; pCloud's own help documentation confirms that 2FA can require a security code on a new device. The code/challenge flow is implemented as a real provider flow, not a mock bypass.

## 9. Real pCloud acceptance

With `PCLOUD_ALLOW_MOCK=false`:

1. Log in to AutoWork.
2. Add the authorized real pCloud account.
3. If TFA is requested, provide the current code.
4. Confirm the account becomes `ACTIVE`.
5. Browse the real root folder.
6. Open/list a real folder.
7. Read metadata for a real test file.
8. Upload only a harmless test file if authorized.
9. Never delete, move, overwrite, rename, or modify production files during QA.

A green UI state without a successful real pCloud API response is not acceptance evidence.

## 10. Screenshot-specific failures to verify again

The earlier QA screenshots showed:

- `pCloud authentication failed (result 2000): Log in failed`
- `api.pcloud.com result=1022 Please provide 'code'`
- `Upload failed: status code 400`
- pCloud browse request returning HTTP 400
- Email Accounts showing Gmail OAuth not configured
- Campaign workflow not yet proving real email sending

The pCloud login implementation has now been corrected to use the proper `/login` -> `/tfa_login` challenge flow. The browse/upload 400 errors should be retested **after** a real pCloud account reaches `ACTIVE`; do not treat them as independent upload bugs until account authentication succeeds.

## 11. Sender account rule

Never treat an arbitrary typed email address as a verified sender.

Valid sender evidence must come from an authenticated provider:

- verified Gmail OAuth account, or
- an authorized pCloud account whose provider operation explicitly sends using that account's email.

If Gmail OAuth is not configured, report it as blocked rather than bypassing verification.

## 12. Campaign acceptance

First prove exactly one recipient end-to-end:

```text
AutoWork login
 -> real pCloud account
 -> real pCloud file
 -> real test contact
 -> real template
 -> campaign DRAFT
 -> QUEUED
 -> worker
 -> real pCloud provider operation
 -> real provider reference/result
 -> execution log
 -> analytics
```

Only after one recipient succeeds should 2–5 recipient testing begin.

## 13. Important current product-scope check

The current database/campaign implementation is primarily a **pCloud distribution workflow**. The campaign wizard currently requires a pCloud account + pCloud file + template + contact list, and the worker executes the pCloud share/transfer operation.

Therefore, the following client-requested items must be explicitly verified before claiming the broader "email automation" requirement is complete:

- Gmail sender selection inside campaign creation
- manual/custom sender creation with real verification
- per-recipient sender selection
- manual attachment upload stored and attached to outbound email
- manual individual contact selection inside campaign creation
- Select All + selected-count behavior
- create-on-the-spot message template
- per-recipient/custom template behavior
- actual Gmail/provider email send with provider message ID
- campaign logs and analytics for email sends

Do **not** mark these as PASS merely because the pCloud campaign workflow works.

## 14. Build/test gate

Backend:

```powershell
cd backend
npm run build
npm test -- --runInBand
```

Frontend:

```powershell
cd frontend
npm run build
```

A test is PASS only when the implementation is genuinely exercised. Do not modify tests or add mocks solely to turn a real-provider failure green.

## 15. Security rules

Never:

- commit client credentials;
- print credentials in logs;
- return provider tokens to the browser;
- enable mock mode to make acceptance pass;
- hard-code JWT/provider secrets;
- bypass tenant checks;
- claim success after a failed provider response;
- modify/delete production pCloud files during QA.

## 16. QA report format

For each item report one of:

```text
PASS     = real behavior verified
FAIL     = implementation defect reproduced
BLOCKED  = external configuration/credential/provider prerequisite unavailable
NOT TESTED = not reached yet
```

For every FAIL:

```text
Area:
Exact reproduction:
Observed:
Expected:
Root cause:
Evidence:
Suggested fix:
Retest result:
```

## 17. Final acceptance rule

Do not call AutoWork production-ready until the required client workflow is proven with real provider responses and real persisted records. A successful build alone is not acceptance.
