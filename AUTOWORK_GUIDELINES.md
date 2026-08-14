# AutoWork Guidelines

## Purpose

This file is the team's canonical local-development and testing manual for the AutoWork project.

The most important rule is:

> **Do not treat mock pCloud testing as a real client integration test.**
>
> Real client validation must use the real pCloud Production adapter and the client's real pCloud account, with credentials entered only into the local application UI/secure runtime environment. Never paste client passwords, access tokens, or other secrets into GitHub, source files, logs, tickets, or chat.

---

## 1. Project overview

AutoWork is a Next.js frontend + NestJS backend application with PostgreSQL, Redis/BullMQ workers, Prisma, and a pCloud integration layer.

Main areas:

- `frontend/` — Next.js 16 frontend
- `backend/` — NestJS 10 backend/API
- `prisma/` — shared Prisma schema
- `workers/` — campaign and pCloud worker processes
- `docker/` — Docker Compose infrastructure definitions
- `tests/` — project tests
- `automation-modules/` — automation-related modules

Important backend routes currently include authentication, pCloud accounts, pCloud files, contacts, imports, templates, campaigns, automations, dashboard, health, and admin endpoints.

The backend registers real pCloud account routes such as:

- `POST /api/v1/pcloud/accounts`
- `POST /api/v1/pcloud/accounts/:id/test`
- `GET /api/v1/pcloud/files/browse`
- `POST /api/v1/pcloud/files/upload`
- `POST /api/v1/pcloud/files/register`
- `POST /api/v1/campaigns/:id/launch`
- `GET /api/health`

---

## 2. Verified development environment

The environment that successfully built and started the project during the current setup was:

- Windows 11/Windows build used during setup
- WSL 2 installed and working
- Docker Desktop installed and running
- Docker Engine 29.7.2
- Docker Compose v5.3.1
- Node.js **20.20.2**
- npm **10.8.2**
- PostgreSQL 15 Alpine (Docker)
- Redis 7 Alpine (Docker)
- Prisma 5.22.0
- Next.js 16.3.0

### Strong recommendation

Use Node.js 20 for this project. Do **not** run the backend under Node 24 during testing unless the project has explicitly been updated and revalidated for it.

---

## 3. First-time machine prerequisites

Install/verify:

1. Git
2. Node.js 20.x (NVM for Windows is recommended)
3. Docker Desktop with WSL 2 backend
4. WSL 2
5. A browser

Verify Node:

```powershell
$env:Path="C:\nvm4w\nodejs;$env:Path"
node --version
npm --version
```

Expected development versions:

```text
v20.20.2
10.8.2
```

Verify Docker:

```powershell
docker --version
docker compose version
docker info
```

If `docker --version` works but `docker info` cannot connect to the daemon, start Docker Desktop and wait until the Docker Engine reports **Running**.

If Docker says the daemon is unavailable, do not repeatedly rebuild the application. Fix Docker Desktop/engine availability first.

---

## 4. Clone the repository correctly

The project repository is:

```text
https://github.com/KAIRON92/AutoWork.git
```

Use a clean clone when changing machines or recovering from a broken local directory:

```powershell
cd D:\
git clone https://github.com/KAIRON92/AutoWork.git AutoWork-main
cd D:\AutoWork-main
git status
git log -1 --oneline
```

Expected status:

```text
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

Before starting work on an existing clone:

```powershell
cd D:\AutoWork-main
git pull origin main
```

If Git says `fatal: not a git repository`, the current directory is not the repository. Do not delete the project. Change to the correct directory or make a fresh clone.

---

## 5. Important directory rule

`docker/docker-compose.yml` is under the project root, not under `backend/`.

Correct:

```text
D:\AutoWork-main\docker\docker-compose.yml
```

Therefore run Docker Compose commands from:

```powershell
cd D:\AutoWork-main
```

Not from:

```text
D:\AutoWork-main\backend
```

For example:

```powershell
docker compose -f .\docker\docker-compose.yml up -d postgres redis
```

---

## 6. Docker's actual role

Docker is **not required for the entire application in local development**.

During normal local testing, Docker is mainly used to provide:

- PostgreSQL
- Redis

This is sufficient for running the backend directly with Node and the frontend directly with Next.js.

Do not rebuild all application Docker images every time a frontend or backend code change is made.

Only build/run the full Docker application stack when that specific deployment/container workflow is being tested.

---

## 7. Start PostgreSQL and Redis

From the project root:

```powershell
cd D:\AutoWork-main
docker compose -f .\docker\docker-compose.yml up -d postgres redis
docker compose -f .\docker\docker-compose.yml ps
```

Expected:

```text
postgres   Up    0.0.0.0:5432->5432/tcp
redis      Up    0.0.0.0:6379->6379/tcp
```

The Compose warning saying the `version` attribute is obsolete is currently non-blocking; it does not prevent the services from starting. Do not confuse that warning with a service failure.

---

## 8. Backend dependencies

From:

```powershell
cd D:\AutoWork-main\backend
```

Install normally:

```powershell
npm install
```

### Do NOT use `npm install --ignore-scripts` for the normal backend setup

The backend has native dependencies such as `bcrypt`. Skipping install scripts can cause a runtime error similar to:

```text
Cannot find module ... bcrypt_lib.node
```

If that error occurs after an incorrect installation:

```powershell
taskkill /F /IM node.exe 2>$null
Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
npm install
```

---

## 9. Backend build check

After installing dependencies:

```powershell
cd D:\AutoWork-main\backend
npm run build
```

A clean build ends without TypeScript/Nest compilation errors.

Do not run `npm audit fix --force` as part of normal setup. It can change dependency versions and introduce breaking changes. Existing audit warnings should be reviewed separately from the immediate local test workflow.

---

## 10. Prisma setup

Prisma schema:

```text
D:\AutoWork-main\prisma\schema.prisma
```

The tested local database URL is:

```text
postgresql://autowork:autoworkpass@localhost:5432/autowork_db?schema=public
```

Run:

```powershell
cd D:\AutoWork-main\backend
$env:DATABASE_URL="postgresql://autowork:autoworkpass@localhost:5432/autowork_db?schema=public"
npx prisma db push --schema=../prisma/schema.prisma
npx prisma generate --schema=../prisma/schema.prisma
```

A successful database sync says the database is already in sync or is now in sync with the Prisma schema.

### Prisma network download failure

If `prisma generate` fails with something like:

```text
ECONNRESET
Error: aborted
```

retry:

```powershell
npx prisma generate --schema=../prisma/schema.prisma
```

A retry succeeded during the verified setup.

### Prisma package/path warning

The project uses a root-level Prisma schema while the backend has its own Node installation. If a fresh machine reports:

```text
@prisma/client did not initialize yet
```

verify that Prisma Client has actually been generated and that the backend is using the generated client belonging to its installed dependencies. Do not randomly reinstall unrelated packages.

---

## 11. Backend environment variables

The backend reads environment variables through dotenv/configuration. For the safest repeatable local setup, create a **local-only** environment file in the backend working directory or export the values in the backend PowerShell session.

Never commit real secrets.

Minimum local values:

```text
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://autowork:autoworkpass@localhost:5432/autowork_db?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=<random-long-secret>
PCLOUD_DEFAULT_PROVIDER=pcloud
PCLOUD_ALLOW_MOCK=false
PCLOUD_API_URL=https://api.pcloud.com
PCLOUD_API_HOST=https://api.pcloud.com
PCLOUD_DEFAULT_FOLDER_ID=0
PCLOUD_CREDENTIAL_ENCRYPTION_KEY=<base64-encoded-32-byte-key>
WEBSOCKET_PORT=4001
```

For a temporary PowerShell session, the tested approach is:

```powershell
$env:Path="C:\nvm4w\nodejs;$env:Path"
$env:DATABASE_URL="postgresql://autowork:autoworkpass@localhost:5432/autowork_db?schema=public"
$env:REDIS_HOST="localhost"
$env:REDIS_PORT="6379"
$env:PCLOUD_DEFAULT_PROVIDER="pcloud"
$env:PCLOUD_ALLOW_MOCK="false"
$env:PCLOUD_API_URL="https://api.pcloud.com"
$env:PCLOUD_API_HOST="https://api.pcloud.com"
```

### Generate secrets locally

JWT secret:

```powershell
$env:JWT_SECRET=[Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 256) }))
```

pCloud credential-encryption key:

```powershell
$env:PCLOUD_CREDENTIAL_ENCRYPTION_KEY=[Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 256) }))
```

The pCloud encryption key is required for real pCloud credential storage and must decode to exactly 32 bytes.

Do **not** put real credentials in `.env.example`, source code, GitHub commits, documentation, screenshots, or chat.

---

## 12. Backend start procedure

Once PostgreSQL, Redis, Prisma, and environment variables are ready:

```powershell
cd D:\AutoWork-main\backend
$env:Path="C:\nvm4w\nodejs;$env:Path"
npm run start:dev
```

A healthy startup should include:

```text
Found 0 errors. Watching for file changes.
Successfully connected to PostgreSQL Database
BullMQ Queues initialized
Nest application successfully started
Autowork Backend API running on http://localhost:4000
Swagger OpenAPI documentation available at http://localhost:4000/api/docs
Health check available at http://localhost:4000/api/health
```

The backend must **not** report:

```text
Environment variable not found: DATABASE_URL
```

Do not continue to pCloud testing while the backend is running in database-resilient mode because `DATABASE_URL` is missing.

---

## 13. Backend health check

With the backend running:

```powershell
curl.exe http://localhost:4000/api/health
```

Expected healthy result contains:

```json
{
  "status":"OK",
  "subsystems": {
    "api":"HEALTHY",
    "database":"HEALTHY"
  }
}
```

Database must be `HEALTHY` before continuing.

---

## 14. Frontend setup

Do not stop the backend.

Open a second PowerShell window:

```powershell
cd D:\AutoWork-main\frontend
$env:Path="C:\nvm4w\nodejs;$env:Path"
npm install
npm run dev
```

Expected:

```text
Local: http://localhost:3000
Ready
```

Open:

```text
http://localhost:3000
```

The frontend API base defaults to the local backend URL:

```text
http://localhost:4000/api
```

If a custom frontend API URL is needed, use `NEXT_PUBLIC_API_URL` in the frontend's local environment configuration.

---

## 15. Authentication behavior

AutoWork uses authenticated application sessions. Do not assume that the pCloud account is the same thing as the AutoWork login.

Two separate identities exist during testing:

1. **AutoWork user/organization login** — required to enter the application and establish the tenant/session.
2. **pCloud account connection** — the actual client pCloud account connected under `pCloud Accounts`.

For local app access, create/use an AutoWork test organization account. This test login is not the client's pCloud credential.

Never use the client's pCloud password as the AutoWork application login.

The frontend API client uses credentials/cookies for the authenticated session. Old browser-readable JWT storage should not be relied on.

If the browser repeatedly redirects between dashboard and login:

- stop the frontend server;
- pull the latest `main` branch;
- reopen the site in an Incognito window;
- make sure the backend is also running with the correct environment variables.

---

## 16. pCloud: REAL versus MOCK

### Real testing is the default

For real client testing:

```text
PCLOUD_DEFAULT_PROVIDER=pcloud
PCLOUD_ALLOW_MOCK=false
```

The production UI must show:

```text
Official pCloud REST API (Production)
```

The mock provider is only for explicit dry-run/development work.

### NEVER interpret MOCK_PCLOUD as real integration

If the account card shows:

```text
MOCK_PCLOUD
```

that is **not** proof that the client's real pCloud account is working.

Do not present a mock account as a client integration result.

---

## 17. Real pCloud account connection workflow

Go to:

```text
http://localhost:3000/accounts
```

Use the production pCloud connection flow only.

The application is designed to accept either:

- a real pCloud access token, or
- the real pCloud account password for the authentication exchange.

The backend verifies credentials **before storing them**. For password login it attempts the pCloud `userinfo` authentication flow and obtains an auth token. The password itself is not intended to be stored.

Real pCloud credentials are encrypted at rest using AES-256-GCM. The encryption key is held in `PCLOUD_CREDENTIAL_ENCRYPTION_KEY` and must not be committed.

### Security rule

Never send the client's:

- pCloud password
- pCloud access token
- JWT
- refresh token
- encryption key

into ChatGPT, GitHub issues, source code, screenshots, or documentation.

Only enter them into the appropriate local application field or secure server-side environment.

---

## 18. If real pCloud login says `Log in failed`

Do not immediately switch to mock mode.

First verify the same client account directly on the official pCloud website.

### Case A — official pCloud website also rejects the login

The credentials/account setup must be corrected with the client/pCloud. Do not change AutoWork code merely because credentials are invalid.

### Case B — official pCloud website login succeeds but AutoWork says `Log in failed`

Treat this as an AutoWork/pCloud integration problem and investigate:

- the exact API response/error code;
- whether the account is US or EU hosted;
- `api.pcloud.com` versus `eapi.pcloud.com` behavior;
- whether the credential entered is actually a valid pCloud auth token or password;
- whether the account was created via an external identity provider and needs a pCloud password;
- whether network access to the pCloud API is working.

Do not post the client's credentials while debugging.

---

## 19. pCloud region / API host

pCloud has regional API hosts.

The current implementation supports:

```text
https://api.pcloud.com
https://eapi.pcloud.com
```

The real account connection flow attempts both hosts when password authentication is needed.

The selected/stored API host should then be used for subsequent real account calls.

---

## 20. Real pCloud verification sequence

After creating a real account connection:

1. Verify the account is marked `pcloud` / production, not `mock_pcloud`.
2. Use **Test Auth**.
3. Browse the pCloud Files page.
4. Confirm the visible folders/files are actually from the client's pCloud account.
5. Only after this succeeds, continue to campaign testing.

Do not claim real integration success based only on an `ACTIVE` database card. The strongest practical proof is a successful real pCloud API call that returns the client's real account/files.

---

## 21. Real file testing

The project exposes pCloud file operations including:

- browse/list folder contents
- file metadata
- file registration
- file upload
- file deletion

For client validation, prefer a read-only verification step first:

```text
Real pCloud account
    -> Browse root/folder
    -> Confirm actual file/folder names
```

Do not delete or overwrite client files during the first integration test.

If a write test is required, use an agreed test folder/file provided by the client.

---

## 22. Real campaign testing

Do not immediately launch a full client campaign.

Use this staged sequence:

```text
1 real AutoWork user
        ↓
1 real client pCloud account
        ↓
1 real pCloud file/folder
        ↓
1 test contact / recipient
        ↓
1 test template
        ↓
1 campaign
        ↓
1 real execution
        ↓
verify Share Log + pCloud result
```

Campaign launch requires:

- an active pCloud account;
- a valid pCloud file;
- a valid template;
- at least one recipient;
- an available worker/queue service.

The backend campaign service queues work into BullMQ, and the pCloud worker performs the real adapter operation using the stored production credential.

---

## 23. Worker and Redis requirements

Redis must be running for campaign queue processing.

Check:

```powershell
cd D:\AutoWork-main
docker compose -f .\docker\docker-compose.yml ps
```

For a real campaign test, the worker process also needs to be running.

Do not mark a campaign as fully tested if it only reaches `QUEUED` while no worker is consuming the queue.

A real end-to-end campaign test is complete only when the worker processes the job and the resulting execution status/reference can be verified.

---

## 24. Important known problems encountered during setup

### Problem: `docker` not recognized

Cause: Docker Desktop was not installed/running or Docker CLI was not on PATH.

Resolution: install/start Docker Desktop and verify:

```powershell
docker --version
docker compose version
docker info
```

### Problem: Docker daemon unavailable / named-pipe errors

Example:

```text
failed to connect to the docker API
open //./pipe/docker_engine: The system cannot find the file specified
```

Resolution: start Docker Desktop and wait for the Linux engine to become ready.

### Problem: Docker `tls: bad record MAC`

Example:

```text
failed to copy: local error: tls: bad record MAC
```

This occurred while pulling `node:20-alpine`. Retrying the pull eventually succeeded. Do not rewrite Dockerfiles because of this transient transport error.

### Problem: Docker build returns HTTP 500 / `_ping`

This occurred after the system disk became full and Docker Desktop/engine became unstable. After restarting the system and confirming `docker info` worked, builds succeeded again.

### Problem: `bcrypt_lib.node` missing

Cause: backend dependencies had been installed in a way that skipped native install scripts or were built under an incompatible Node environment.

Resolution:

```powershell
taskkill /F /IM node.exe 2>$null
Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
npm install
```

Use Node 20.

### Problem: Prisma `ECONNRESET`

Cause: Prisma engine download was interrupted. Retrying `npx prisma generate --schema=../prisma/schema.prisma` succeeded.

### Problem: `DATABASE_URL` missing

The Nest server could still start in resilient mode, but this is not a valid test state. Set `DATABASE_URL` and restart the backend. Confirm:

```text
Successfully connected to PostgreSQL Database
```

### Problem: port 4000 already in use

Find/stop stale Node processes:

```powershell
taskkill /F /IM node.exe 2>$null
```

Then restart the backend.

### Problem: frontend API returns 401 and login/dashboard loops

The application uses authenticated cookies/sessions. If a stale browser cookie exists, use an Incognito window after pulling the latest code. Do not treat this as a pCloud credential problem until the AutoWork session is working.

### Problem: pCloud account card says `MOCK_PCLOUD`

That is a mock account. It is not proof of real client integration.

Remove it and connect the real account with the Production pCloud flow.

### Problem: real pCloud connection says `Log in failed`

Verify the same credentials directly on pCloud first. If pCloud web login works, investigate the real API authentication path; do not switch to mock mode just to make the UI say success.

---

## 25. What NOT to do

Do not:

- run the project on Node 24 as the normal setup;
- use `npm install --ignore-scripts` for backend dependencies;
- run `npm audit fix --force` during the initial setup;
- delete the PostgreSQL Docker volume just because the application has an unrelated error;
- repeatedly rebuild the entire Docker stack when only the frontend/backend needs restarting;
- commit `.env`, real passwords, tokens, JWT secrets, or encryption keys;
- paste client pCloud credentials into chat or screenshots;
- use `MOCK_PCLOUD` and call it a real client test;
- run destructive pCloud operations against real client data during the first integration test;
- assume an `ACTIVE` database record means real pCloud connectivity is proven;
- launch a full client campaign before a controlled single-recipient test succeeds.

---

## 26. Recommended daily startup sequence

### Terminal 1 — infrastructure

```powershell
cd D:\AutoWork-main
docker compose -f .\docker\docker-compose.yml up -d postgres redis
docker compose -f .\docker\docker-compose.yml ps
```

### Terminal 2 — backend

```powershell
cd D:\AutoWork-main\backend
$env:Path="C:\nvm4w\nodejs;$env:Path"
# Ensure DATABASE_URL, Redis and real-pCloud configuration are loaded.
npm run start:dev
```

Wait for:

```text
Successfully connected to PostgreSQL Database
Autowork Backend API running on http://localhost:4000
```

### Terminal 3 — frontend

```powershell
cd D:\AutoWork-main\frontend
$env:Path="C:\nvm4w\nodejs;$env:Path"
npm run dev
```

Open:

```text
http://localhost:3000
```

### Verification order

```text
Backend health
    ↓
AutoWork login/session
    ↓
Real pCloud Production account
    ↓
Real pCloud Test Auth
    ↓
Real pCloud file browse
    ↓
Contacts/import
    ↓
Template
    ↓
One-recipient campaign
    ↓
Worker execution
    ↓
Share Log / pCloud reference
```

---

## 27. Final handover checklist

Before telling the client the project is ready, confirm:

- [ ] Clean Git clone works.
- [ ] Node 20 is being used.
- [ ] Backend dependencies install normally.
- [ ] Backend build passes.
- [ ] PostgreSQL is running and reachable.
- [ ] Redis is running and reachable.
- [ ] Prisma schema is synchronized.
- [ ] Prisma Client is generated.
- [ ] Backend starts with no missing `DATABASE_URL` warning.
- [ ] Backend health endpoint is healthy.
- [ ] AutoWork authentication works.
- [ ] Real pCloud Production provider is selected.
- [ ] Mock provider is not being used for the client test.
- [ ] Client pCloud account authentication succeeds against the real pCloud API.
- [ ] Client's real pCloud folders/files are visible through AutoWork.
- [ ] A non-destructive real file test succeeds.
- [ ] A one-recipient campaign executes through the real worker.
- [ ] Share Log contains the real execution result/reference.
- [ ] No real secrets exist in Git history.
- [ ] No client passwords/tokens appear in logs or screenshots.

---

## 28. Current testing status at the time this manual was written

The local environment has been successfully brought up through the backend stage.

Verified:

- Node 20.20.2
- npm 10.8.2
- Docker Desktop/engine working
- PostgreSQL container running
- Redis container running
- Prisma schema synchronized
- Prisma Client generated
- backend compilation succeeds
- backend starts successfully
- PostgreSQL connection succeeds
- BullMQ queues initialize
- pCloud account/file/campaign routes register successfully

The remaining critical acceptance test is the **real client pCloud authentication and real end-to-end pCloud operation**.

At the latest test point, the Production pCloud connection flow returned:

```text
Log in failed.
```

That result must not be replaced by mock testing. First verify the same credentials directly with the official pCloud account, then continue debugging the real API path if needed.

---

## 29. Team rule: always preserve the test truth

Every test result must be labeled honestly:

```text
MOCK TEST      = simulated/dry run only
LOCAL TEST     = application logic/local infrastructure only
REAL AUTH TEST = real external pCloud authentication succeeded
REAL FILE TEST = real pCloud data was read/verified
E2E TEST       = real pCloud operation + worker + execution log succeeded
```

Never upgrade a lower-level result into a higher-level claim.

A green UI, an `ACTIVE` database row, or a successful mock test is **not** the same as a successful client pCloud integration.

The final acceptance standard is the real pCloud account, real pCloud API, real data path, real worker, and real execution result.
