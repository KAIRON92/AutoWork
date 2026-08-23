# AutoWork — Setup & Run Guide

This is the **current practical setup guide** for running AutoWork locally on Windows. Keep real secrets out of Git. Use `.env.example` as the template.

## 1. Requirements

Install:

- Git
- Node.js **20.x** (recommended for the current verified backend setup)
- npm
- Docker Desktop (recommended; provides PostgreSQL + Redis)

AutoWork uses:

- Next.js 16 / React 19 frontend
- NestJS 10 / TypeScript backend
- PostgreSQL 15
- Redis 7
- Prisma 5
- Redis/BullMQ workers
- pCloud real API integration

## 2. Get the project

```powershell
git clone https://github.com/KAIRON92/AutoWork.git
cd AutoWork
```

If the repository is already cloned:

```powershell
git checkout main
git pull origin main
```

## 3. Configure environment

Copy the example file to a local `.env` used by the backend:

```powershell
Copy-Item .env.example backend/.env
```

Edit `backend/.env` and set real local secrets. At minimum, set:

```env
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000

DATABASE_URL="postgresql://autowork:autoworkpass@localhost:5432/autowork_db?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=<long-random-secret>
REFRESH_TOKEN_SECRET=<long-random-secret>
PCLOUD_CREDENTIAL_ENCRYPTION_KEY=<base64-encoded-32-byte-key>
EMAIL_CREDENTIAL_ENCRYPTION_KEY=<base64-encoded-32-byte-key>

PCLOUD_DEFAULT_PROVIDER=pcloud
PCLOUD_ALLOW_MOCK=false
PCLOUD_API_URL=https://api.pcloud.com
PCLOUD_API_HOST=https://api.pcloud.com

# Required for the pCloud OAuth connection flow
PCLOUD_CLIENT_ID=<pCloud-app-client-id>
PCLOUD_CLIENT_SECRET=<pCloud-app-client-secret>
PCLOUD_REDIRECT_URI=http://localhost:4000/api/v1/pcloud/accounts/oauth/callback

EMAIL_DEFAULT_PROVIDER=
EMAIL_ALLOW_FAKE=false

GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
GMAIL_REDIRECT_URI=http://localhost:4000/api/v1/email/accounts/gmail/callback
```

Never commit `backend/.env` or any real credentials/tokens.

### Generate an AES-256 encryption key in PowerShell

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 256) }))
```

## 4. Start PostgreSQL and Redis

### Recommended: Docker Compose

From the repository root:

```powershell
docker compose -f docker/docker-compose.yml up -d postgres redis
```

Check:

```powershell
docker compose -f docker/docker-compose.yml ps
```

PostgreSQL should be available on `localhost:5432` and Redis on `localhost:6379`.

## 5. Install dependencies

Open a terminal in the repository root and install backend dependencies:

```powershell
cd backend
npm install
```

Then install frontend dependencies in a second terminal:

```powershell
cd frontend
npm install
```

## 6. Prepare Prisma/database

From `backend`:

```powershell
npm run prisma:generate
npm run prisma:migrate:status
npm run prisma:migrate:deploy
```

For a development-only schema push when explicitly required:

```powershell
npm run prisma:push
```

Prefer migrations for normal project setup and handover.

## 7. Run the backend

Terminal 1:

```powershell
cd D:\AutoWork-main\backend
npm run start:dev
```

Backend:

- API: `http://localhost:4000`
- Swagger: `http://localhost:4000/api/docs`
- Health: `http://localhost:4000/api/health`

## 8. Run the frontend

Terminal 2:

```powershell
cd D:\AutoWork-main\frontend
npm run dev
```

Open:

```text
http://localhost:3000
```

## 9. Run workers

For a real local workflow, the asynchronous workers also need to be running.

Terminal 3:

```powershell
cd D:\AutoWork-main\backend
npm run worker:campaign
```

Terminal 4:

```powershell
cd D:\AutoWork-main\backend
npm run worker:pcloud
```

Terminal 5:

```powershell
cd D:\AutoWork-main\backend
npm run worker:email
```

Alternatively, run the complete Docker Compose stack from the repository root:

```powershell
docker compose -f docker/docker-compose.yml up --build
```

This starts frontend, backend, PostgreSQL, Redis, campaign worker, pCloud worker, and email worker.

## 10. pCloud authentication — current architecture

**Important:** the old assumption that `/login` with username/password will automatically generate an email verification code must not be used as the integration architecture.

AutoWork now supports the official **pCloud OAuth 2.0 server-side Code Flow** for the application integration:

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

1. Start backend and frontend.
2. Open AutoWork at `http://localhost:3000`.
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

Optional backend test commands:

```powershell
npm run test:watch
npm run test:cov
npm run test:e2e
```

## 13. Health checks

Backend health:

```powershell
Invoke-WebRequest http://localhost:4000/api/health
```

Docker services:

```powershell
docker compose -f docker/docker-compose.yml ps
```

Useful logs:

```powershell
docker compose -f docker/docker-compose.yml logs -f backend
```

## 14. Common startup problems

### `fatal: not a git repository`

You are in the wrong directory. Use:

```powershell
cd D:\AutoWork-main
git status
```

### PostgreSQL connection refused

Start PostgreSQL through Docker:

```powershell
docker compose -f docker/docker-compose.yml up -d postgres
```

### Redis connection refused

```powershell
docker compose -f docker/docker-compose.yml up -d redis
```

### Prisma/client errors

From `backend`:

```powershell
npm run prisma:generate
npm run prisma:migrate:status
```

### pCloud `1022 Please provide 'code'`

Do not treat this as proof that an email OTP was sent. For the current application integration, configure the registered pCloud OAuth app and use the OAuth 2.0 Code Flow. The required application values are `PCLOUD_CLIENT_ID`, `PCLOUD_CLIENT_SECRET`, and the registered callback URI.

### OAuth callback mismatch

The callback URI configured in pCloud must exactly match:

```text
http://localhost:4000/api/v1/pcloud/accounts/oauth/callback
```

and the same value must be present in `PCLOUD_REDIRECT_URI`.

## 15. Before claiming the project works

A successful frontend build or a successful API health response is not enough.

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

## 16. Git workflow for team members

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

If `.git/index.lock` exists and no Git process is running:

```powershell
Remove-Item .git\index.lock -Force
```

Then retry the Git command.

## 17. Source of truth

- Repository: `https://github.com/KAIRON92/AutoWork`
- Branch: `main`
- General architecture/product blueprint: `README.md`
- Practical setup/run instructions: `SETUP.md`
- Environment template: `.env.example`

When implementation changes, update this guide if the commands, environment variables, ports, OAuth flow, or required services change.
