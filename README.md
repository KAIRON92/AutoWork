# AutoWork — Master Project Blueprint

> **This README is the single human-readable project blueprint and operational guide for AutoWork.** Historical handover, audit, acceptance, implementation-status, and agent-instruction documents are intentionally consolidated into this file to keep the repository understandable and reduce duplicate documentation.

## 1. What AutoWork Is

AutoWork is a multi-tenant SaaS platform for managing authenticated organizations, contacts, pCloud documents, templates, campaigns, sender accounts, attachments, queues/workers, execution logs, automations, and provider integrations.

The intended business outcome is a real, production workflow—not a demo or mock workflow:

**Real AutoWork Login → Organization/Tenant → Real pCloud Account → Real pCloud File → Real Contact Import → Real Contacts → Verified Sender → Recipient Selection → Template/Variables → Attachment/Component → Campaign → Redis/BullMQ → Real Worker → Real Provider/pCloud Operation → Real External Result → Execution Log → Analytics**

A UI success screen, fabricated database row, mock provider response, or simulated worker execution is not sufficient acceptance evidence.

## 2. Project Ambition

The platform is intended to let an organization:

1. Sign in securely.
2. Connect a real pCloud account.
3. Verify the account and use the correct pCloud API region automatically.
4. Browse real folders/files and read metadata.
5. Import real contact data.
6. Select individual or bulk recipients.
7. Select a verified sender/provider account.
8. Build a message/template with variables.
9. Attach a real pCloud document and/or manually uploaded attachment.
10. Create and launch campaigns.
11. Process campaign work through Redis/BullMQ workers.
12. Perform real provider operations.
13. Record the real provider/reference result.
14. Show the same truth in execution logs, automation views, and analytics.

## 3. Technology Stack

### Backend

- **Language:** TypeScript
- **Framework:** NestJS 10
- **ORM:** Prisma 5
- **Database:** PostgreSQL 15
- **Queue:** BullMQ 5
- **Queue backend:** Redis 7
- **Realtime:** Socket.IO
- **API documentation:** Swagger/OpenAPI
- **Authentication:** JWT/Passport
- **Password hashing:** bcrypt
- **Validation:** class-validator / class-transformer
- **Import tooling:** ExcelJS + text/CSV processing

The backend package currently defines build, development, production, Prisma, and Jest test scripts. fileciteturn964file0L2-L2

### Frontend

- **Language:** TypeScript
- **Framework:** Next.js 16 + React 19
- **HTTP:** Axios
- **State:** Zustand
- **Server state:** TanStack React Query
- **Forms:** React Hook Form
- **Realtime:** Socket.IO Client
- **Styling:** Tailwind CSS
- **Icons/UI helpers:** lucide-react, clsx, tailwind-merge

The frontend currently exposes development, build, start, and lint scripts. fileciteturn965file0L2-L2

## 4. Repository Structure

```text
AutoWork/
├── automation-modules/       # Provider-neutral automation/provider adapters
├── backend/                  # NestJS API
│   └── src/
│       ├── auth/             # Authentication, JWT, roles, rate limiting
│       ├── admin/            # Admin/health endpoints
│       ├── pcloud/           # pCloud account, client, files, credentials
│       ├── email/            # Email account/provider integration
│       ├── contacts/         # Contacts and contact lists
│       ├── imports/          # Import/parse/validate/confirm flows
│       ├── templates/        # Message templates and previews
│       ├── campaigns/        # Campaign lifecycle
│       ├── automations/      # Automation records/API
│       ├── dashboard/        # Metrics
│       ├── logs/             # Execution/error logs
│       └── ...
├── frontend/                 # Next.js application
├── workers/                  # BullMQ worker entry points and processors
├── automation-modules/       # Email/provider adapters
├── prisma/                   # PostgreSQL schema and migrations
├── docker/                   # Dockerfiles and docker-compose
├── tests/                    # Cross-project automated tests
└── README.md                 # THIS MASTER BLUEPRINT
```

## 5. Core Data Model

The Prisma schema is multi-tenant and centers data around `Organization`.

Key models include:

- Organization
- User
- Role
- Permission
- PCloudAccount
- PCloudFile
- EmailAccount
- Contact
- ContactList
- ContactListMember
- ImportJob
- Template
- Campaign
- CampaignRecipient
- Automation
- AutomationVersion
- AutomationJob
- PCloudShareExecution
- ErrorLog
- AuditLog
- SystemSetting

The schema explicitly stores organization ownership for the major business entities and stores a pCloud account's `apiHost` so the authenticated regional host can be reused for later operations. fileciteturn971file0L1-L2

## 6. pCloud Integration — Real Provider Path

### Authentication

AutoWork uses the official pCloud HTTP API flow.

The intended production sequence is:

```text
pCloud account credentials
        ↓
/getapiserver
        ↓
regional API host discovery
        ↓
/login
        ↓
2297 challenge when TFA is required
        ↓
/tfa_login with the current code
        ↓
real auth token
        ↓
userinfo verification
        ↓
encrypt token/credential
        ↓
store apiHost + account identity
```

The current pCloud account service performs regional API discovery, then real login/TFA, and persists the resulting `apiHost`. It also prevents production use of the mock provider unless explicitly enabled. fileciteturn973file0L2-L2

### pCloud operations

The pCloud client contains real REST operations including:

- `userinfo`
- `listfolder`
- `stat`
- `uploadfile`
- `sharefolder`
- `getfilelink`
- `uploadtransfer`
- `deletefile`

These are actual HTTP API calls, not local simulations. 

### Important pCloud rule

A future client production pCloud account must work through the same generic regional/authentication architecture. Do not add account-specific host/password logic.

## 7. Email / Sender Architecture

Email sending is conceptually separate from pCloud.

A typed email address is **not** an authenticated sender.

A real sender must come from a verified provider account.

The repository includes provider adapters for:

- Gmail
- Microsoft
- SMTP
- Fake/test provider

The fake provider must never silently become the production path. Production/provider acceptance requires real provider authentication.

### Gmail

The Gmail adapter uses official Gmail/Google APIs, supports access-token refresh, validates the Gmail mailbox, and sends through `users/me/messages/send`. It can construct multipart messages with attachments.

A real Gmail acceptance run still requires valid Gmail OAuth application configuration (`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, redirect URI) and a controlled real test.

## 8. Campaign Workflow

The intended campaign journey is:

```text
Step 1 — Campaign setup
      ↓
Step 2 — Verified sender selection
      ↓
Step 3 — pCloud document and/or manual attachment
      ↓
Step 4 — Audience / contacts / Select All / individual selection
      ↓
Step 5 — Template / message / variables
      ↓
Preview
      ↓
Draft
      ↓
Launch
      ↓
Redis/BullMQ
      ↓
Worker
      ↓
Real provider operation
      ↓
Result + reference ID
```

At launch the backend must revalidate the tenant, sender, recipient set, template, attachment/component, pCloud account/file, permissions, and provider availability.

## 9. Imports and Contacts

Required business behavior:

- CSV/XLSX import
- preview
- column detection
- email/name/company/target/phone mapping
- duplicate detection
- invalid email handling
- persisted contacts
- contact lists
- search
- individual recipient selection
- Select All
- selected count

The current backend includes ExcelJS, but every accepted production file format must still be validated by real tests rather than assumed from a dependency being installed. fileciteturn964file0L2-L2

## 10. Queues and Workers

Redis/BullMQ are used to move asynchronous campaign/import/provider work out of the HTTP request path.

Docker Compose currently defines:

- frontend on `3000`
- backend on `4000`
- campaign worker
- pCloud worker
- PostgreSQL on `5432`
- Redis on `6379`

The production container configuration disables pCloud mock mode by default and requires database/JWT/encryption secrets. fileciteturn968file0L2-L2

## 11. Security Requirements

Never commit:

- passwords
- API keys
- OAuth client secrets
- access/refresh tokens
- pCloud credentials
- encryption keys

The repository expects secrets through environment configuration. The checked-in `.env.example` contains placeholders only and documents the required pCloud credential encryption key and optional Gmail configuration. fileciteturn969file0L2-L2

Maintain:

- organization/tenant isolation
- RBAC
- JWT/session security
- authentication rate limiting
- encrypted external credentials
- safe error messages
- no production mock fallback
- audit/error logging
- ownership checks for files, campaigns, accounts, and contacts

## 12. Local Development

### Prerequisites

- Node.js 20.x recommended for the current verified setup
- npm
- PostgreSQL 15 or Docker
- Redis 7 or Docker
- Git
- Docker Desktop if using the compose stack

### Backend

```powershell
cd backend
npm install
npm run start:dev
```

Backend:

- API: `http://localhost:4000`
- Swagger: `http://localhost:4000/api/docs`
- Health: `http://localhost:4000/api/health`

### Frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend:

- `http://localhost:3000`

### Build / tests

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

### Prisma

From `backend`:

```powershell
npm run prisma:generate
npm run prisma:migrate:status
npm run prisma:migrate:deploy
```

Use `prisma:push` only when the development workflow specifically requires schema push behavior.

## 13. Environment Configuration

The checked-in `.env.example` is the template. Real local/production secrets must stay outside Git.

Important categories:

- `DATABASE_URL`
- Redis configuration
- `JWT_SECRET`
- refresh token secret
- pCloud provider flags
- pCloud API configuration
- `PCLOUD_CREDENTIAL_ENCRYPTION_KEY`
- Gmail OAuth variables if Gmail is enabled
- frontend/backend URLs

`PCLOUD_ALLOW_MOCK=false` and `EMAIL_ALLOW_FAKE=false` are the intended production-safe defaults. fileciteturn969file0L2-L2

## 14. Current Product Status

### Implemented / present in the codebase

- Multi-tenant PostgreSQL/Prisma data model
- AutoWork authentication and RBAC structure
- pCloud production adapter and encrypted credential storage
- pCloud regional API discovery and TFA-aware login flow
- pCloud browsing/metadata/upload/transfer primitives
- contact/import/template/campaign modules
- Redis/BullMQ infrastructure
- worker entry points
- WebSocket infrastructure
- logs/automation API/page work
- Gmail OAuth adapter
- Docker Compose stack

### Still requires genuine acceptance evidence

- real pCloud login against the authorized test account after the regional fix
- real pCloud browse/file/upload/operation validation against the authorized account
- real sender-provider configuration and verification
- real Gmail OAuth configuration if Gmail is part of the accepted workflow
- real one-recipient end-to-end campaign/provider test
- real external result/message/reference verification
- complete client acceptance across all UI steps

**Build/test success alone must not be treated as production readiness.**

## 15. Acceptance Definition

Before handover, prove this chain with real evidence:

```text
REAL LOGIN
→ REAL PCLOUD
→ REAL FILE
→ REAL IMPORT
→ REAL CONTACTS
→ REAL SENDER
→ REAL RECIPIENT
→ REAL TEMPLATE
→ REAL ATTACHMENT/COMPONENT
→ REAL CAMPAIGN
→ REAL QUEUE
→ REAL WORKER
→ REAL PROVIDER OPERATION
→ REAL EXTERNAL RESULT
→ REAL LOG
→ REAL ANALYTICS
```

First controlled test: one recipient, one sender, one message, one file/attachment. Only after that succeeds should a controlled 2–5 recipient test be performed.

## 16. Documentation Policy

This `README.md` is now the **single master project blueprint**.

It is intended to be readable by:

- a new developer
- an existing developer/agent
- a non-technical project owner
- a future maintainer

Historical duplicate handover/audit/status documents are intentionally removed from the repository to avoid conflicting instructions and repeated outdated claims.

## 17. Definition of Done

AutoWork is ready for client handover only when:

- the agreed real pCloud account authenticates correctly
- the correct regional API host is selected automatically
- real folders/files can be accessed
- real attachments/components work
- the approved sender provider is authenticated
- recipients are real and tenant-scoped
- campaign creation and launch are real
- Redis/BullMQ and workers execute the real job
- the real external provider result is observed
- execution logs contain the real result/reference
- analytics reflect the real database records
- security checks pass
- builds/tests pass
- no mock/fake path is being used to claim production success

---

**Repository:** `https://github.com/KAIRON92/AutoWork`

**Canonical branch:** `main`

**Purpose of this document:** one source of truth for the AutoWork product, architecture, requirements, current state, setup, testing, and handover criteria.
