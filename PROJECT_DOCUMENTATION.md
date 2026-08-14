# AutoWork.com — Developer & Architecture Documentation

**Document version:** 2.0.0
**Architecture:** Multi-tenant pCloud sharing/transfer automation SaaS

## 1. Product definition

AutoWork is a control panel and automation orchestrator for pCloud. pCloud performs the actual file sharing/transfer and notification. AutoWork does not send email through SMTP, Gmail, Microsoft 365, Proton Mail or another mail provider.

Core workflow:

`Login → Connect pCloud account → Select/upload pCloud file → Import contacts → Create description template → Build campaign → Queue jobs → Worker calls pCloud API → Persist result → Live progress/logs`

This matches the corrected Blueprint v2.0 architecture.

## 2. Stack

- Frontend: Next.js App Router + TypeScript + Tailwind CSS + shadcn/ui
- Backend: Node.js + NestJS + TypeScript
- Database: PostgreSQL + Prisma
- Queue: Redis + BullMQ
- Realtime: Socket.IO/WebSockets
- API docs: Swagger/OpenAPI
- External file platform: pCloud official REST API
- Tests: Jest / integration / E2E with MockPCloudAdapter

## 3. Main modules

### Backend

- `backend/src/auth` — registration/login/JWT authentication
- `backend/src/organizations` — tenant boundary
- `backend/src/pcloud` — pCloud accounts, files, adapters, client, error mapping and credential encryption
- `backend/src/contacts` — contacts and lists
- `backend/src/imports` — CSV/XLSX/TXT contact extraction
- `backend/src/templates` — reusable description templates and variables
- `backend/src/campaigns` — campaign creation and queue dispatch
- `backend/src/jobs` — BullMQ queue definitions
- `workers/campaign.worker.ts` — campaign fan-out/orchestration
- `workers/pcloud-share.worker.ts` — authoritative pCloud execution and persistence

### Database

Important tenant-scoped models include `Organization`, `User`, `PCloudAccount`, `PCloudFile`, `Contact`, `ContactList`, `Template`, `Campaign`, `CampaignRecipient` and `PCloudShareExecution`.

## 4. Queue architecture

```text
HTTP Campaign API
      |
      v
campaign-queue
      |
      v
Campaign Worker
      |
      +----> pcloud-share-queue (one job per recipient)
                         |
                         v
                 pCloud Worker
                         |
                         v
                    pCloud API
                         |
                         v
              PostgreSQL execution log
```

The API no longer executes the campaign synchronously after enqueueing. The worker chain is the single execution path.

## 5. pCloud API behavior

### `sharefolder`

The official pCloud API defines `sharefolder` as a folder-sharing operation. It accepts a folder ID/path, recipient email, permissions and an optional message. AutoWork therefore refuses to silently treat a selected file as its parent folder when `sharefolder` is requested.

### `uploadtransfer`

The official pCloud API defines `uploadtransfer` as a file-transfer operation that creates/sends transfer links to receiver emails. It expects sender/receiver email parameters and a file upload payload. For a selected pCloud file, AutoWork retrieves the file from pCloud and supplies it as the upload payload to the transfer endpoint, together with the recipient and resolved description.

This is the closest official API-supported file-transfer path currently implemented. A controlled live test is still required before bulk use.

## 6. Security

- Real pCloud credentials are encrypted at rest using AES-256-GCM.
- `PCLOUD_CREDENTIAL_ENCRYPTION_KEY` is required for real pCloud credentials.
- Credentials are not placed in frontend code or BullMQ job payloads.
- Account APIs expose only safe account metadata, never raw credentials.
- `.env`, local environment files and storage directories remain ignored by Git.
- The authentication service no longer accepts arbitrary email addresses as a mock login fallback.

Any real credential previously pasted into chat should be rotated before production use.

## 7. Campaign statuses

Use pCloud-oriented terminology:

`DRAFT → QUEUED → PROCESSING → SHARED / FAILED / RETRYING → COMPLETED`

Do not report `email sent` because AutoWork is not an email-sending platform.

## 8. Configuration

See `.env.example` for variable names. Never commit real values.

Important variables include:

- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `JWT_SECRET`
- `REFRESH_TOKEN_SECRET`
- `PCLOUD_API_URL`
- `PCLOUD_API_HOST`
- `PCLOUD_CLIENT_ID`
- `PCLOUD_CLIENT_SECRET`
- `PCLOUD_DEFAULT_PROVIDER`
- `PCLOUD_CREDENTIAL_ENCRYPTION_KEY`

## 9. Production gates

Before bulk production sharing:

1. Run install, Prisma generation, lint, type-check/build and tests in the actual development environment.
2. Run the complete mock end-to-end pipeline.
3. Validate the exact pCloud transfer behavior using one authorized test account, one non-sensitive document and one authorized recipient.
4. Confirm the client's demonstrated workflow matches the documented `uploadtransfer` semantics.
5. Obtain approval for the controlled live test before enabling bulk campaigns.
6. Any multi-account rotation strategy must be independently validated against pCloud limits and terms.

See `AUTOWORK_V2_IMPLEMENTATION_STATUS.md` for the implementation change log and current integration boundary.
