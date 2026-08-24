# AutoWork — Setup, Run & Handover Guide

This is the practical Windows setup guide for AutoWork. For normal users, the preferred entry point is **`AutoWork.cmd`** in the repository root. It opens a guided launcher that can prepare the machine, start the project, diagnose common problems, update from GitHub, and push local changes.

Keep real secrets out of Git. Use `.env.example` as the template.

## 1. Requirements

The launcher can detect missing tools and, when WinGet is available, attempt to install:

- Git
- Node.js LTS
- Docker Desktop

AutoWork is primarily verified with Node.js 20.x. Node.js 22.x may work, but if a dependency reports a runtime compatibility problem, use Node.js 20.x.

AutoWork uses:

- Next.js 16 / React 19 frontend
- NestJS 10 / TypeScript backend
- PostgreSQL 15
- Redis 7
- Prisma 5
- Redis/BullMQ workers
- pCloud real API integration

## 2. One-command launcher — recommended

After the repository is present on Windows, double-click:

```text
AutoWork.cmd
```

Or run from PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\AutoWork.ps1
```

The launcher menu provides:

1. **Setup + Run** — checks tools, starts Docker, creates `backend/.env`, resolves PostgreSQL/Redis host-port conflicts, installs missing npm dependencies, generates Prisma Client, applies migrations, and opens backend/frontend/worker terminals.
2. **Run** — performs the same safe readiness checks and starts the project.
3. **Update from GitHub** — fetches `origin/main` and fast-forwards only when the working tree is clean.
4. **Git Sync + Push** — stages local changes, checks the staged diff, asks for a commit message, commits, and pushes `main`.
5. **Diagnostics** — shows tool, dependency, Docker and Git status.
6. **Stop** — stops AutoWork Docker services and identifiable Node processes belonging to this repository.

The launcher deliberately does **not** blindly overwrite credentials, delete unrelated Docker containers, force-reset Git history, or pretend that an arbitrary runtime error can be automatically fixed. When a problem requires human action, it stops with the exact prerequisite that needs attention.

### Important first-time limitation

A script stored inside a Git repository cannot install Git before the repository exists. On a completely fresh Windows machine, obtain the repository once (Git clone or ZIP), then `AutoWork.cmd` can handle the rest. If WinGet is unavailable, install/update Windows App Installer first.

## 3. Get the project

With Git:

```powershell
git clone https://github.com/KAIRON92/AutoWork.git
cd AutoWork
```

If the repository is already cloned:

```powershell
git checkout main
git pull origin main
```

Then use `AutoWork.cmd` for normal setup/run operations.

## 4. Environment configuration

The launcher automatically creates `backend/.env` from `.env.example` if it does not exist. It also generates local random secrets for placeholder JWT/encryption values.

Real pCloud credentials are intentionally **not** generated. They must be supplied by the application owner:

```env
PCLOUD_CLIENT_ID=<pCloud-app-client-id>
PCLOUD_CLIENT_SECRET=<pCloud-app-client-secret>
PCLOUD_REDIRECT_URI=http://localhost:4000/api/v1/pcloud/accounts/oauth/callback
```

Never commit `backend/.env` or any real credentials/tokens.

### Generate an AES-256 encryption key manually if needed

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 256) }))
```

## 5. Docker, PostgreSQL and Redis

The launcher starts only AutoWork's PostgreSQL and Redis services for local development:

```powershell
docker compose -f docker/docker-compose.yml up -d postgres redis
```

The compose file supports these ignored local environment overrides:

```env
POSTGRES_HOST_PORT=5432
REDIS_HOST_PORT=6379
```

If those ports are already occupied, the launcher automatically selects free host ports (for example `55432` and `56379`) and writes the matching local `DATABASE_URL` / Redis settings into `backend/.env`. The containers still use their normal internal ports 5432 and 6379.

Check services manually with:

```powershell
docker compose -f docker/docker-compose.yml ps
```

The launcher does not stop or delete unrelated containers such as another project's PostgreSQL or Redis.

## 6. Manual dependency installation

The launcher normally handles this. Manual commands are:

```powershell
cd backend
npm ci

cd ..\frontend
npm ci
```

If dependencies change after a Git pull, the launcher compares `package-lock.json` timestamps with `node_modules` and reinstalls when needed.

## 7. Prepare Prisma/database manually

From `backend`:

```powershell
npm run prisma:generate
npm run prisma:migrate:status
npm run prisma:migrate:deploy
```

For development-only schema push when explicitly required:

```powershell
npm run prisma:push
```

Prefer migrations for normal setup and handover.

## 8. Run manually

Backend terminal:

```powershell
cd backend
npm run start:dev
```

Frontend terminal:

```powershell
cd frontend
npm run dev
```

Workers:

```powershell
cd backend
npm run worker:campaign
```

```powershell
cd backend
npm run worker:pcloud
```

```powershell
cd backend
npm run worker:email
```

The launcher opens these five PowerShell windows automatically.

URLs:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Swagger: `http://localhost:4000/api/docs`
- Health: `http://localhost:4000/api/health`

## 9. Full Docker stack

For an all-Docker run, use:

```powershell
docker compose -f docker/docker-compose.yml up --build
```

This starts frontend, backend, PostgreSQL, Redis, campaign worker, pCloud worker and email worker.

## 10. pCloud authentication — current architecture

The old assumption that `/login` with username/password will automatically generate an email verification code must not be used as the integration architecture.

AutoWork uses the official **pCloud OAuth 2.0 server-side Code Flow**:

```text
AutoWork UI
  -> backend OAuth URL
  -> pCloud authorization/consent
  -> pCloud callback with authorization code
  -> backend /oauth2_token exchange
  -> access_token
  -> /userinfo verification
  -> encrypted credential storage
  -> ACTIVE pCloud account
```

### pCloud app setup

Create/register the AutoWork application in the pCloud developer console and obtain:

- `client_id`
- `client_secret`

Register this exact local callback:

```text
http://localhost:4000/api/v1/pcloud/accounts/oauth/callback
```

The client secret must remain backend-only.

### Connect the account

1. Start AutoWork.
2. Open `http://localhost:3000`.
3. Go to Accounts.
4. Choose **Connect via OAuth 2.0**.
5. Complete the pCloud login/consent screen.
6. pCloud redirects to the backend callback.
7. The backend exchanges the authorization code and verifies the returned account.

Do not hard-code a client's password or email into source code.

### Regional API

pCloud can use different API regions. The backend should use the region returned/detected during authentication rather than hard-coding an account-specific host. The resolved host is persisted with the connected account.

## 11. Email sender authentication

pCloud authentication and email sender authentication are separate concerns.

A typed email address is not automatically an authenticated sender. For real email acceptance, configure and authenticate the selected provider (Gmail OAuth, Microsoft, SMTP, etc.). Keep `EMAIL_ALLOW_FAKE=false` for real acceptance.

## 12. Tests and builds

Backend:

```powershell
cd backend
npm test -- --runInBand
npm run build
```

Frontend:

```powershell
cd frontend
npm run build
```

Optional backend tests:

```powershell
npm run test:watch
npm run test:cov
npm run test:e2e
```

## 13. Health checks and diagnostics

Manual health check:

```powershell
Invoke-WebRequest http://localhost:4000/api/health
```

Docker:

```powershell
docker compose -f docker/docker-compose.yml ps
```

Logs:

```powershell
docker compose -f docker/docker-compose.yml logs -f backend
```

Recommended launcher diagnostic:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\AutoWork.ps1 -Action diagnose
```

## 14. Common startup problems

### `fatal: not a git repository`

You are in the wrong directory. Run the launcher from the repository root or use:

```powershell
cd AutoWork
git status
```

### PostgreSQL port 5432 already allocated

The launcher detects this and automatically assigns another host port. Manual compose also supports:

```powershell
$env:POSTGRES_HOST_PORT=55432
docker compose -f docker/docker-compose.yml up -d postgres
```

Then make sure `backend/.env` uses the same host port.

### Redis port 6379 already allocated

The launcher detects this and automatically assigns another host port. Manual compose supports:

```powershell
$env:REDIS_HOST_PORT=56379
docker compose -f docker/docker-compose.yml up -d redis
```

### Docker is installed but not running

The launcher tries to start Docker Desktop and waits for the Docker Engine. If it cannot become ready, open Docker Desktop, wait until it reports that the engine is running, and rerun `AutoWork.cmd`.

### Docker is not installed

The launcher attempts to install Docker Desktop through WinGet. Installation may require elevation, a restart, or manual completion. Windows WinGet installation behavior can require administrator elevation depending on the installer. After installation, reopen PowerShell and rerun the launcher.

### Prisma/client errors

Run:

```powershell
cd backend
npm ci
npm run prisma:generate
npm run prisma:migrate:status
```

### pCloud `1022 Please provide 'code'`

Do not treat this as proof that an email OTP was sent. Configure the registered pCloud OAuth app and use the OAuth 2.0 Code Flow. Required application values are `PCLOUD_CLIENT_ID`, `PCLOUD_CLIENT_SECRET`, and the registered callback URI.

### OAuth callback mismatch

The callback URI configured in pCloud must exactly match:

```text
http://localhost:4000/api/v1/pcloud/accounts/oauth/callback
```

and the same value must be present in `PCLOUD_REDIRECT_URI`.

### `.git/index.lock` exists

Only remove the lock when no Git process is running:

```powershell
Remove-Item .git\index.lock -Force
```

Then retry the Git command.

## 15. Before claiming the project works

A successful frontend build or API health response is not enough.

For real acceptance, verify:

```text
Login
-> organization/tenant
-> real pCloud OAuth connection
-> real pCloud account verification
-> real folders/files
-> real contact import
-> real contacts
-> real authenticated sender
-> real recipient
-> template/message
-> real attachment/component
-> campaign
-> Redis/BullMQ
-> real worker
-> real provider operation
-> real external result
-> execution log
```

Start with a controlled one-recipient test before increasing the test size.

## 16. Git workflow

Normal team workflow can now be done from the launcher:

```text
AutoWork.cmd
  -> Update from GitHub
  -> work locally
  -> Git Sync + Push
```

Manual workflow:

Before working:

```powershell
git checkout main
git pull origin main
git status
```

After making changes:

```powershell
git status
git add .
git diff --cached --check
git commit -m "describe the change"
git push origin main
```

The launcher uses `git pull --ff-only` and never force-resets local history. It also refuses to pull over uncommitted local changes and refuses to push when the remote has diverged unexpectedly.

## 17. Source of truth

- Repository: `https://github.com/KAIRON92/AutoWork`
- Branch: `main`
- One-command launcher: `AutoWork.cmd`
- Launcher implementation: `tools/AutoWork.ps1`
- General architecture/product blueprint: `README.md`
- Practical setup/run instructions: `SETUP.md`
- Environment template: `.env.example`

When implementation changes, update this guide if the commands, environment variables, ports, OAuth flow, or required services change.
