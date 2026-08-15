# AutoWork Final Acceptance

## Release gate

This document defines the required release gate for the client handover. A green UI, build, or unit test is not sufficient by itself.

## Mandatory end-to-end chain

REAL AutoWork login -> REAL pCloud authentication -> REAL folder/file -> REAL import -> REAL contacts -> VERIFIED sender -> REAL recipient -> REAL template -> REAL campaign -> Redis/BullMQ -> REAL worker -> REAL provider operation -> REAL result/reference -> REAL execution log -> REAL analytics.

## Safety rules

- Never store or commit real passwords, OAuth client secrets, access tokens, encryption keys, or refresh tokens.
- Never treat a mocked provider response as production success.
- Never delete, move, overwrite, or modify production pCloud files during acceptance testing.
- First real operation must use exactly one controlled test recipient and one non-destructive document.
- Expand to 2-5 recipients only after the one-recipient flow passes.
- Failed provider operations must remain failures; uncertain external outcomes require reconciliation rather than blind retry.

## Provider requirements

### pCloud
- Official production adapter only for production.
- Account authentication must be verified before saving/activating the account.
- Credentials/tokens are encrypted at rest.
- Folder and file metadata must come from the real pCloud API.
- The first real operation must produce a real pCloud reference/result.

### Gmail / Google Workspace
- Sender accounts must be connected through official Google OAuth 2.0.
- Sender status must be VERIFIED before a campaign can launch.
- Access/refresh credentials must be encrypted at rest.
- A controlled test send must return a real Gmail message ID before the sender is accepted.
- No arbitrary unverified sender address may be used as the sender identity.

## Import requirements

- CSV must support preview, mapping, validation, duplicate detection, and persistence.
- XLSX must use a real workbook parser and produce the same normalized contact model as CSV.
- Legacy XLS must either be supported by a real parser or be explicitly rejected with a clear conversion instruction; it must never be silently parsed as text.

## Campaign requirements

- Campaign must reference the current tenant's pCloud account, pCloud file, template, recipients, and verified sender where sender functionality is enabled.
- Launch must reject missing or unverified sender accounts for sender-required campaigns.
- Campaign state must transition through the actual queue/worker lifecycle.
- Recipient-level success/failure must be persisted independently.

## Final QA checklist

- [ ] Backend build
- [ ] Backend tests
- [ ] Backend E2E
- [ ] Frontend build
- [ ] Prisma migration status/deploy
- [ ] Docker PostgreSQL
- [ ] Docker Redis
- [ ] Backend service
- [ ] Frontend service
- [ ] Campaign worker
- [ ] pCloud worker
- [ ] Health endpoint
- [ ] Swagger
- [ ] Authentication/logout/re-login
- [ ] pCloud real auth/account info/folder/file metadata
- [ ] Real CSV import
- [ ] Real XLSX import
- [ ] Verified Gmail sender (when configured)
- [ ] One-recipient real operation
- [ ] Queue/worker/result/log/analytics consistency
- [ ] Security/tenant isolation checks
- [ ] No placeholder/fake production pages or provider paths
