# AutoWork Handover Build Status

This file records implementation state that has been verified by source review versus items that require local runtime validation.

## Verified in source review

- Tenant-scoped backend queries for the principal pCloud, contact, template, campaign, import and automation paths.
- Server-side JWT authentication and role guard wiring.
- Production pCloud adapter selection; mock pCloud requires explicit opt-in.
- pCloud credentials use AES-256-GCM encrypted storage.
- Email account model supports organization scoping and verified status.
- Gmail OAuth authorization and Gmail send code paths are present.
- Campaigns carry an optional sender-account association in the Prisma schema.
- Client acceptance requirements are documented in `AUTOWORK_CLIENT_HANDOVER_SPEC.md`.

## Must be verified on the local Windows/WSL2 environment

- `npm ci` / dependency lockfile consistency after the latest dependency changes.
- Prisma migration deployment against the actual development database.
- Backend and frontend production builds after all current-branch changes.
- Jest and E2E suites after schema/provider changes.
- Docker Compose startup with backend, frontend, Postgres, Redis and both workers.
- Real Google OAuth configuration and controlled Gmail send.
- Real pCloud authentication, real file browse and one controlled non-destructive operation.
- End-to-end campaign state transition and real execution/result evidence.

## Release rule

Do not merge `final-hardening` into `main` and do not call the project production-ready until the local verification section has evidence for every applicable item. No mock, fake success response or test bypass may be used to satisfy release checks.
