# AutoWork Implementation Backlog

This backlog is derived from the client's latest acceptance requirements. It is intentionally credential-free.

## P0 — must be resolved before production acceptance

- [ ] Complete authenticated sender-account domain model and API/UI flow if email sending is part of the agreed business workflow.
- [ ] Complete an approved real-provider path (Gmail OAuth or another confirmed provider) before claiming email delivery support.
- [ ] Confirm and implement the exact mandatory pCloud operation (share, transfer, or other official operation).
- [ ] Perform the controlled one-recipient real acceptance test locally with authorized credentials.

## P1 — required for complete handover

- [ ] Add genuine XLS/XLSX parsing; current backend parser is text/CSV based.
- [ ] Preserve import → sender → recipients → template → preview → component → review → launch state through one coherent campaign workflow.
- [ ] Verify campaign sender/account selection is persisted and revalidated at launch.
- [ ] Verify realtime automation progress is driven by actual queue/worker events.
- [ ] Verify dashboard analytics are sourced only from real database execution records.
- [ ] Verify logs show provider reference IDs and do not expose credentials.
- [ ] Verify permanent-delete semantics and cache invalidation for every delete-capable resource.
- [ ] Full Docker acceptance run: PostgreSQL, Redis, backend, frontend, campaign worker, pCloud worker.

## P2 — quality/hardening

- [ ] Add/expand integration and E2E coverage for tenant isolation and sender-account authorization.
- [ ] Finish provider error/backoff verification for controlled failures.
- [ ] Finish frontend navigation/UI review against the final acceptance checklist.
- [ ] Review deprecated Next.js middleware convention and migrate without changing auth semantics.

## Acceptance evidence required

For every production claim, record:
- exact test performed
- provider/account type (without secret)
- external provider result/reference where available
- application execution ID
- worker/job result
- log/result verification
- PASS/FAIL and root cause for failures

Never mark an item complete because a mock adapter, fabricated UI state, or local database record succeeded.
