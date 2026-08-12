# AutoWork (Autowork.com SaaS) — Developer & Architecture Documentation

**Document Version:** 1.0.0  
**Generated Date:** August 13, 2026  
**Project Location:** `c:\Users\USER\Downloads\files\autowork_FIXED_v3\autowork`  
**Repository Target:** [https://github.com/KAIRON92/AutoWork.git](https://github.com/KAIRON92/AutoWork.git)

---

## 1. PROJECT OVERVIEW

### 1.1 Summary
**AutoWork** (`Autowork.com`) is a multi-tenant B2B email automation and outreach platform designed for sales teams, marketing agencies, and enterprise outreach specialists. It enables organizations to manage email sending accounts, upload and structure contact lists, design dynamic email templates with server-side variable replacement, execute scheduled cold email campaigns, process asynchronous background jobs, and monitor real-time execution analytics.

### 1.2 Purpose & Core Problems Solved
- **Multi-Tenant Isolation**: Enables multiple organizations to operate independently with strict data isolation (`organizationId` scoping).
- **Email Outreach & Automation**: Executes bulk email campaigns using customizable sender accounts with daily sending limits.
- **Dynamic Personalization**: Resolves template placeholders (e.g. `#NAME#`, `#COMPANY#`, `#FIRSTNAME#`, `#LASTNAME#`, `#RANDOM#`) on the fly.
- **Asynchronous Queue Processing**: Manages heavy workloads (email dispatching, contact imports, campaign scheduling) using Redis and BullMQ worker queues.
- **Attachment & Cloud Storage**: Integrates with pCloud REST API for storing email attachments and media files.

### 1.3 Implementation Status Overview
| Architectural Component | Status | Source Evidence |
| :--- | :--- | :--- |
| Multi-Tenant Database Schema | ✅ Complete | `prisma/schema.prisma` (20 models defined) |
| NestJS REST Backend | ✅ Functional | `backend/src` (Controllers, Services, Auth, Modules) |
| Next.js 16 App Router UI | ✅ Functional | `frontend/src/app` (14 full application pages) |
| BullMQ Worker Queues | ✅ Functional | `backend/src/jobs/jobs.service.ts` & `workers/` |
| Email Provider Framework | 🟡 Partial | `FakeEmailAdapter` implemented; `Gmail`, `Microsoft`, `SMTP` stubs |
| pCloud Storage Adapter | ✅ Functional | `backend/src/storage/pcloud.adapter.ts` (API + Simulation) |
| Realtime Sockets | ✅ Functional | NestJS Socket.IO Server & Next.js Socket Client |
| Docker Local Infrastructure | ✅ Configured | `docker/docker-compose.yml` (Postgres, Redis, Backend, Frontend) |

---

## 2. TECHNOLOGY STACK

### Frontend (`/frontend`)
- **Framework**: Next.js 16.3.0 (React 19, App Router)
- **Language**: TypeScript 5
- **Styling**: TailwindCSS 4, `clsx`, `tailwind-merge`
- **UI Components & Icons**: Custom UI components (`/components/ui`), Lucide React (`lucide-react`)
- **State Management**: Zustand 4.5.2 (`useAuth`, `useUIStore`), TanStack React Query v5 (`@tanstack/react-query`)
- **API Client**: Axios 1.6.8 with Interceptors
- **Realtime**: `socket.io-client` 4.7.5
- **Form Handling**: `react-hook-form` 7.51

### Backend (`/backend`)
- **Framework**: NestJS 10.3 (Express platform)
- **Language & Runtime**: TypeScript 5.3 / Node.js
- **ORM & Database Client**: Prisma ORM 5.10 (`@prisma/client`)
- **Authentication**: Passport.js 0.7 (`passport-jwt`), JWT (`@nestjs/jwt`), Bcrypt 5.1
- **Validation**: `class-validator` 0.14, `class-transformer` 0.5
- **Queue & Caching**: BullMQ 5.1 (`bullmq`), ioredis 5.3 (`ioredis`)
- **Realtime Server**: NestJS WebSockets (`@nestjs/platform-socket.io`, `socket.io` 4.7.4)
- **API Documentation**: NestJS Swagger (`@nestjs/swagger` 7.3)

### Database (`/prisma`)
- **Database Engine**: PostgreSQL 15
- **ORM**: Prisma ORM v5.10.0
- **Schema File**: `prisma/schema.prisma`

### Background Processing (`/workers` & `/backend/src/jobs`)
- **Engine**: BullMQ + Redis
- **Worker Types**: `EmailWorker`, `CampaignWorker`, `ImportWorker`

### Automation & Storage Modules (`/automation-modules` & `/backend/src/storage`)
- **Email Adapter Pattern**: `IEmailAdapter` factory with `FakeEmailAdapter`, `GmailAdapter`, `MicrosoftAdapter`, `SmtpAdapter`
- **Storage Adapter**: `PCloudStorageAdapter` using pCloud REST API (with multipart upload and fallback simulation mode)

### Infrastructure & Containerization (`/docker`)
- **Orchestration**: Docker Compose (`docker/docker-compose.yml`)
- **Containers**: `frontend` (Port 3000), `backend` (Port 4000), `postgres` (Port 5432), `redis` (Port 6379)

### Testing (`/tests`)
- **Test Runners**: Node.js automated test runner (`tests/run_tests.js`), Jest + `ts-jest` (`tests/unit.test.ts`)

---

## 3. COMPLETE PROJECT STRUCTURE

```
autowork/
├── .env.example                       # Environment configuration template
├── .gitignore                          # Git ignore rules protecting secrets & builds
├── Autowork_Project_Blueprint_v1.1.docx # Project blueprint documentation
├── blueprint_full.txt                 # Text reference blueprint
├── download_chunked.py                # Helper script for file downloads
├── push_to_github.bat                 # Windows automated GitHub deployment script
├── push_to_github.ps1                 # PowerShell GitHub deployment script
├── PROJECT_DOCUMENTATION.md           # This master documentation file
│
├── automation-modules/                # Modular automation provider adapters
│   └── email/
│       ├── email.adapter.ts           # Email adapter interface definitions
│       ├── email.factory.ts           # Adapter factory pattern implementation
│       └── providers/
│           ├── fake.adapter.ts        # Fully functional simulated email provider
│           ├── gmail.adapter.ts       # Google Workspace OAuth provider stub
│           ├── microsoft.adapter.ts   # Microsoft Graph provider stub
│           └── smtp.adapter.ts        # Custom SMTP provider stub
│
├── backend/                           # NestJS backend application
│   ├── package.json                   # Backend dependencies & npm scripts
│   ├── tsconfig.json                  # TypeScript compiler settings
│   └── src/
│       ├── main.ts                    # NestJS application bootstrap
│       ├── app.module.ts              # Core NestJS root module definition
│       ├── accounts/                  # Sender Email Accounts management
│       ├── admin/                     # System administration module
│       ├── auth/                      # Authentication (Login, Register, JWT, Guards)
│       ├── automations/               # Workflow automation engine & versions
│       ├── campaigns/                 # Email campaigns & execution logic
│       ├── common/                    # Shared filters, decorators, interceptors
│       ├── config/                    # Config service loading environment vars
│       ├── contacts/                  # Contacts & Contact Lists management
│       ├── imports/                   # CSV/Excel contact import job processing
│       ├── jobs/                      # BullMQ queue service (email, campaign, import)
│       ├── logs/                      # Audit & Error logging services
│       ├── organizations/             # Multi-tenant Organization management
│       ├── prisma/                    # Prisma service binding database connection
│       ├── storage/                   # pCloud Storage REST API adapter
│       ├── templates/                 # Email templates & variable resolution engine
│       └── users/                     # User management module
│
├── frontend/                          # Next.js 16 frontend application
│   ├── package.json                   # Frontend dependencies & npm scripts
│   ├── tsconfig.json                  # TypeScript settings
│   ├── next.config.ts                 # Next.js configuration
│   ├── postcss.config.mjs             # PostCSS & TailwindCSS setup
│   ├── eslint.config.mjs              # ESLint configuration
│   ├── src/
│   │   ├── middleware.ts              # Route protection middleware (cookie JWT guard)
│   │   ├── app/                       # Next.js App Router pages
│   │   │   ├── layout.tsx             # Root React layout
│   │   │   ├── page.tsx               # Landing / Home page
│   │   │   ├── login/                 # Login page
│   │   │   ├── register/              # Registration page
│   │   │   ├── forgot-password/       # Password recovery page
│   │   │   ├── dashboard/             # Main metrics dashboard
│   │   │   ├── accounts/              # Email accounts management page
│   │   │   ├── contacts/              # Contact list & member management
│   │   │   ├── templates/             # Email template manager & variable preview
│   │   │   ├── campaigns/             # Campaign list page
│   │   │   │   └── new/               # Campaign creation wizard page
│   │   │   ├── automations/           # Workflow automation visualizer page
│   │   │   ├── imports/               # CSV upload & import jobs page
│   │   │   ├── attachments/           # pCloud attachment storage manager
│   │   │   ├── logs/                  # System & error logs viewer
│   │   │   ├── settings/              # Account & org settings page
│   │   │   └── admin/                 # Admin dashboard page
│   │   ├── components/                # Reusable UI & Layout components
│   │   ├── services/                  # Frontend API clients (Axios services)
│   │   ├── stores/                    # Zustand state management stores
│   │   ├── lib/                       # Socket.IO & QueryClient configuration
│   │   ├── types/                     # TypeScript data interfaces
│   │   └── utils/                     # Template variable helper utilities
│
├── prisma/                            # Database ORM definition
│   └── schema.prisma                  # PostgreSQL multi-tenant database schema
│
├── docker/                            # Container infrastructure
│   ├── docker-compose.yml             # Postgres, Redis, Backend, Frontend service setup
│   ├── Dockerfile.backend             # NestJS container build definition
│   └── Dockerfile.frontend            # Next.js container build definition
│
└── tests/                             # Verification test suite
    ├── run_tests.js                   # Standalone Node test runner
    ├── run_tests.ts                   # TypeScript test runner
    └── unit.test.ts                   # Jest unit test suite
```

---

## 4. ARCHITECTURE & DATA FLOW

### System Architecture Flow

```
┌─────────────────────────────────────────────────────────┐
│              Next.js 16 Frontend App Router              │
│       (Zustand Stores + Axios API + Socket Client)      │
└────────────────────────────┬────────────────────────────┘
                             │ REST API (Port 4000) / WebSockets (Port 4001)
                             ▼
┌─────────────────────────────────────────────────────────┐
│                 NestJS Backend Platform                 │
│   (JwtAuthGuard -> Controllers -> Services -> Prisma)   │
└──────────────┬────────────────────────────┬─────────────┘
               │                            │
               ▼                            ▼
┌────────────────────────────┐  ┌────────────────────────────┐
│      PostgreSQL 15 DB      │  │    Redis + BullMQ Queues   │
│   (Multi-Tenant Prisma)    │  │(email, campaign, import)   │
└────────────────────────────┘  └─────────────┬──────────────┘
                                              │
                                              ▼
                                ┌────────────────────────────┐
                                │   Node Background Workers  │
                                │(EmailWorker, ImportWorker) │
                                └─────────────┬──────────────┘
                                              │
                                              ▼
                                ┌────────────────────────────┐
                                │     Provider Adapters      │
                                │ (FakeEmail, pCloud Storage)│
                                └────────────────────────────┘
```

### Key Workflows
1. **Authentication Flow**: User submits credentials -> `AuthService.login()` validates hash via Bcrypt -> Returns JWT token -> Saved in Cookie (`autowork_jwt_token`) & LocalStorage -> Attached to subsequent HTTP requests.
2. **Template Variable Resolution**: When a campaign or email job executes, `TemplatesService.resolveTemplate()` replaces tags (`#NAME#`, `#FIRSTNAME#`, `#LASTNAME#`, `#COMPANY#`, `#EMAIL#`, `#PHONE#`, `#RANDOM#`) with recipient record values and a generated unique random reference ID.
3. **Campaign Execution**: User submits campaign -> `CampaignsService` saves `Campaign` entity in Prisma -> Enqueues job to `campaign-queue` via `JobsService` -> `CampaignWorker` fetches recipients and enqueues individual send jobs to `email-queue` -> `EmailWorker` dispatches email using `EmailAdapterFactory.getAdapter()`.

---

## 5. DATABASE SCHEMA SUMMARY (`prisma/schema.prisma`)

| Model Name | Purpose | Key Relations |
| :--- | :--- | :--- |
| `Organization` | Top-level tenant container | Has many Users, Roles, EmailAccounts, Contacts, Campaigns, Automations |
| `User` | User account belonging to an Organization | Belongs to Organization, Role |
| `Role` & `Permission` | RBAC control system | Belong to Organization, assigned to Users |
| `EmailAccount` | Sender email account configuration | Belongs to Organization; has provider type & daily limit |
| `Contact` | Contact record | Belongs to Organization; belongs to many ContactLists |
| `ContactList` | Named group of contacts | Belongs to Organization; contains ContactListMembers |
| `ImportJob` | Tracks CSV file upload & import progress | Belongs to Organization |
| `Template` | Email subject & body template | Belongs to Organization; referenced by Campaigns |
| `Attachment` | File metadata linked to pCloud storage | Belongs to Organization |
| `Automation` & `Version` | Workflow automation definition (JSON) | Belongs to Organization |
| `Campaign` | Outbound email campaign instance | Belongs to Organization, Template; has Recipients & Executions |
| `CampaignRecipient` | Individual contact state within a campaign | Belongs to Campaign |
| `EmailExecution` | Log of actual email dispatch attempt | Belongs to Campaign |
| `ErrorLog` & `AuditLog` | System diagnostics & security audit tracking | Belong to Organization |

---

## 6. BACKEND API ENDPOINTS MAPPING

### Auth Module (`/api/auth`)
- `POST /api/auth/register` — Registers new organization & admin user.
- `POST /api/auth/login` — Authenticates user, returns JWT token & user profile.
- `GET /api/auth/me` — Returns current logged-in user details (Protected).

### Email Accounts Module (`/api/accounts`)
- `GET /api/accounts` — Lists all email accounts for user's organization.
- `POST /api/accounts` — Connects new sender email account.
- `POST /api/accounts/:id/test` — Validates email account connection using provider adapter.

### Contacts Module (`/api/contacts`)
- `GET /api/contacts` — Fetches contacts list with optional search filter.
- `POST /api/contacts` — Creates new contact record.

### Templates Module (`/api/templates`)
- `GET /api/templates` — Retrieves all email templates.
- `POST /api/templates` — Creates email template.
- `POST /api/templates/preview` — Previews template variable resolution against sample data.

### Campaigns Module (`/api/campaigns`)
- `GET /api/campaigns` — Lists all campaigns.
- `POST /api/campaigns` — Creates new campaign.
- `POST /api/campaigns/:id/send` — Enqueues campaign for background execution.

### Automations Module (`/api/automations`)
- `GET /api/automations` — Lists automations.
- `POST /api/automations` — Creates workflow automation.

### Imports Module (`/api/imports`)
- `POST /api/imports` — Uploads CSV raw text and enqueues background import job.
- `GET /api/imports` — Lists import jobs & status.

### Storage Module (`/api/storage`)
- `POST /api/storage/upload` — Uploads attachment via `PCloudStorageAdapter`.
- `GET /api/storage/status` — Checks pCloud connection status.

---

## 7. ENVIRONMENT VARIABLES GUIDE

| Environment Variable | Required | Purpose | Safe Example / Placeholder |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Optional | Application runtime environment | `development` |
| `PORT` | Required | NestJS backend server port | `4000` |
| `FRONTEND_URL` | Required | CORS origin URL for Next.js frontend | `http://localhost:3000` |
| `DATABASE_URL` | Required | PostgreSQL connection string | `postgresql://autowork:autoworkpass@localhost:5432/autowork_db?schema=public` |
| `REDIS_HOST` | Required | Redis server host | `localhost` |
| `REDIS_PORT` | Required | Redis server port | `6379` |
| `JWT_SECRET` | Required | JWT sign secret key | `super-secret-jwt-token-key-autowork-2026` |
| `JWT_EXPIRATION` | Optional | Access token expiration duration | `7d` |
| `PCLOUD_CLIENT_ID` | Optional | pCloud OAuth client ID | `placeholder_pcloud_client_id` |
| `PCLOUD_ACCESS_TOKEN` | Optional | pCloud OAuth access token | `placeholder_pcloud_access_token` |
| `EMAIL_PROVIDER_ACTIVE` | Required | Active email sending provider | `fake` |
| `FAKE_EMAIL_SIMULATED_LATENCY_MS` | Optional | Simulated dispatch latency in ms | `150` |
| `FAKE_EMAIL_SUCCESS_RATE` | Optional | Simulated success rate (0.0 - 1.0) | `0.98` |
| `WEBSOCKET_PORT` | Optional | Socket.IO server port | `4001` |

---

## 8. LOCAL DEVELOPMENT SETUP GUIDE

### Prerequisites
- Node.js 18+ or Node 20+ installed
- npm or yarn package manager
- PostgreSQL server (or Docker)
- Redis server (or Docker)

### Step-by-Step Installation

1. **Clone & Navigate to Directory**:
   ```bash
   cd c:\Users\USER\Downloads\files\autowork_FIXED_v3\autowork
   ```

2. **Environment Configuration**:
   ```bash
   cp .env.example .env
   ```

3. **Install Backend & Frontend Dependencies**:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   cd ..
   ```

4. **Initialize Database Schema (Prisma)**:
   ```bash
   cd backend
   npx prisma generate --schema=../prisma/schema.prisma
   npx prisma db push --schema=../prisma/schema.prisma
   cd ..
   ```

5. **Start Services**:
   - **Backend**: `cd backend && npm run start:dev` (Runs on http://localhost:4000)
   - **Frontend**: `cd frontend && npm run dev` (Runs on http://localhost:3000)

6. **Run Verification Test Suite**:
   ```bash
   node tests/run_tests.js
   ```

---

## 9. FEATURE IMPLEMENTATION MATRIX

| Feature Area | Status | Primary Code Location | Notes |
| :--- | :---: | :--- | :--- |
| Multi-tenant Architecture | ✅ Implemented | `prisma/schema.prisma`, `backend/src/organizations` | Tenant scoping on all entities |
| User Registration & Auth | ✅ Implemented | `backend/src/auth`, `frontend/src/middleware.ts` | JWT in cookie + header |
| Email Accounts Management | ✅ Implemented | `backend/src/accounts`, `frontend/src/app/accounts` | Multi-account support |
| Contact & List Management | ✅ Implemented | `backend/src/contacts`, `frontend/src/app/contacts` | Search, tagging, custom fields |
| Template Variable Engine | ✅ Implemented | `backend/src/templates`, `utils/templateVariables.ts` | `#NAME#`, `#COMPANY#`, `#RANDOM#` |
| Campaign Creation & Sending | ✅ Implemented | `backend/src/campaigns`, `frontend/src/app/campaigns` | Background execution pipeline |
| pCloud Attachment Storage | ✅ Implemented | `backend/src/storage/pcloud.adapter.ts` | Real API + Simulation fallback |
| BullMQ Queue Infrastructure | ✅ Implemented | `backend/src/jobs`, `workers/` | Email, campaign, import queues |
| Fake Email Provider | ✅ Implemented | `automation-modules/email/providers/fake.adapter.ts` | Configurable latency & error rate |
| Gmail / Microsoft Providers | 🟡 Partial (Stubs) | `automation-modules/email/providers/` | Throw error until OAuth keys provided |
| Docker Compose Setup | ✅ Implemented | `docker/docker-compose.yml` | Postgres, Redis, Backend, Frontend |
| Automated Test Suite | ✅ Implemented | `tests/run_tests.js`, `tests/unit.test.ts` | Zero-error test suite |

---

## 10. KNOWN LIMITATIONS & RECOMMENDED NEXT WORK

### Technical Limitations
1. **Email Provider Credentials**: Real Gmail OAuth (`gmail.adapter.ts`), Microsoft Graph (`microsoft.adapter.ts`), and SMTP (`smtp.adapter.ts`) adapters are stubbed and await client-provided OAuth credentials. Currently running on `FakeEmailAdapter`.
2. **pCloud Access Token**: `PCloudStorageAdapter` falls back to simulation mode when `PCLOUD_ACCESS_TOKEN` is set to placeholder value.

### Recommended Next Work (Prioritized)
- **High Priority**: Integrate live OAuth2 credentials for Gmail & Microsoft Graph adapters in `automation-modules/email/providers/`.
- **Medium Priority**: Add visual drag-and-drop workflow canvas on `frontend/src/app/automations/page.tsx`.
- **Low Priority**: Implement granular permission role builder UI in `frontend/src/app/admin/page.tsx`.

---

## 11. SOURCE OF TRUTH & CONTRIBUTOR RULES

- **Code as Truth**: This document reflects the authoritative state of the repository as of August 2026. If documentation and source code differ, the source code in `backend/src/` and `frontend/src/` takes precedence.
- **Updating Documentation**: When modifying architectural patterns, adding database models, or introducing new environment variables, contributors MUST update `PROJECT_DOCUMENTATION.md` accordingly.
