# AutoWork Client Handover Specification

This document is the implementation source of truth derived from the client's latest acceptance requirements. It intentionally contains no credentials or secrets.

## 1. Final acceptance workflow

REAL AUTOWORK LOGIN
→ ORGANIZATION / TENANT
→ REAL PCLOUD ACCOUNT
→ REAL PCLOUD FILE
→ REAL IMPORT
→ REAL CONTACTS
→ AUTHENTICATED SENDER
→ REAL RECIPIENT
→ TEMPLATE + VARIABLES
→ COMPONENT / ATTACHMENT
→ CAMPAIGN REVIEW
→ LAUNCH
→ REDIS / BULLMQ
→ REAL WORKER
→ REAL PROVIDER / PCLOUD OPERATION
→ REAL EXTERNAL RESULT
→ EXECUTION LOG
→ ANALYTICS

A UI state, database row, mock provider result, or simulated worker execution is not acceptance evidence.

## 2. Current verified baseline

- Backend build: PASS on Node 20.20.2.
- Backend automated tests: 23/23 PASS in the latest local run.
- Frontend production build: PASS.
- Real pCloud provider path exists and uses authenticated API calls.
- pCloud credentials are encrypted at rest.
- Tenant scoping/RBAC hardening has been implemented on the hardening branch.
- Mock pCloud is not allowed in production configuration.

## 3. Confirmed product direction

pCloud is the core document/file platform. The required pCloud business operation must be confirmed as one of the official supported operations (for example share, transfer, or another exact API operation) before final acceptance.

Email sending is a separate provider capability. A typed email address is never an authenticated sender. A real sender must be connected through a supported authentication mechanism. Gmail/Google Workspace requires official OAuth 2.0 if Gmail is part of the accepted workflow.

## 4. Current high-priority implementation gaps

### P0/P1

1. Authenticated sender-account subsystem is not yet a complete production feature. The current data model does not yet contain a full EmailAccount entity linked to campaigns.
2. Gmail and Microsoft provider adapters are placeholders until client/provider configuration is confirmed.
3. XLS/XLSX parsing is not yet a true backend Excel parser; current parsing is text/CSV based.
4. Campaigns currently center on pCloud account/file fields and require alignment with the client's sender-account workflow if email delivery is part of the required acceptance path.
5. A live real-provider acceptance run still needs to be performed locally with authorized credentials and a controlled one-recipient test.

## 5. Import requirements

Supported target inputs: CSV, XLS, XLSX, TXT/structured data.

Required behavior:
- preview source file
- detect columns
- map Email / First Name / Last Name / Phone / Company / Target
- normalize case/spacing for email columns
- validate email syntax
- detect duplicates within the import and existing organization
- select contacts individually or in bulk
- create/reuse contact lists
- persist real contacts

Do not preload demo contacts or report success before persistence succeeds.

## 6. Sender-account requirements

A sender must be backed by an authenticated provider account.

For Gmail/Google Workspace:
- official OAuth 2.0
- verified mailbox identity
- send permission
- controlled test message
- provider message/reference ID
- campaign uses exactly the selected sender account

Never spoof a From address. Never treat email + password alone as Gmail OAuth authorization.

## 7. pCloud requirements

- production provider is the official pCloud API
- mock provider is opt-in for development only
- real account must authenticate successfully
- folder listing must be real
- file listing/metadata must be real
- campaign component must reference the real pCloud file
- required operation must be the exact official pCloud operation agreed with the client
- connection deletion removes only AutoWork's connection/credential material and must not delete the external pCloud account/files

## 8. Campaign requirements

The user journey should be:

Import → sender → recipients → template → live preview → components → review → launch.

Launch must revalidate:
- authenticated sender
- tenant ownership
- recipients
- template
- attachments/components
- pCloud account/file
- permissions
- provider availability

Large campaigns must use Redis/BullMQ workers. External side effects must be idempotent/retry-aware.

## 9. Security requirements

Never commit or expose:
- passwords
- API keys
- OAuth client secrets
- access/refresh tokens
- pCloud credentials
- encryption keys

Maintain:
- tenant isolation
- RBAC
- rate limiting
- secure cookies/sessions
- credential encryption
- no mock production fallback
- safe error messages
- audit logging

## 10. Deletion policy

AutoWork resource deletion is permanent after explicit confirmation unless a resource has an explicitly documented exception.

Deleting a pCloud connection removes AutoWork's credential/token data only. It must not delete the external pCloud account or files.

## 11. Controlled real acceptance test

First test:
- one authenticated sender/account
- one recipient
- one message/template
- one component/file
- one real provider/pCloud operation

Verify:
- correct authenticated identity
- real provider response
- external reference/message ID where available
- queue job
- worker execution
- database result
- execution log
- dashboard analytics

Only after this succeeds should a controlled 2–5 recipient test be performed.

## 12. Environment / secrets

Use local-only secret configuration. Never paste production credentials into this document or source code.

Required real pCloud configuration includes the production provider setting and a 32-byte credential-encryption key. OAuth/provider credentials are required only for the provider paths that are actually approved by the client.

## 13. Definition of done

AutoWork can be handed over only when the agreed real business workflow succeeds end-to-end without fake/mock success and the same execution is reflected consistently by the provider, queue, worker, database, logs and analytics.
