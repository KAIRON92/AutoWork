# Autowork v2 — Implementation Status

This document records the implementation changes made against `Autowork_Project_Blueprint_v2.0`.

## Architecture

Autowork remains the control panel/orchestrator. pCloud remains the actual file-sharing/transfer platform. There is no SMTP/Gmail/Microsoft sending path in the campaign execution flow.

The campaign path is now:

`Campaign API -> campaign-queue -> campaign worker -> pcloud-share-queue -> pCloud worker -> pCloud API -> execution persistence`

The campaign HTTP request no longer starts a second in-process execution loop.

## pCloud operation decision

The official pCloud API documents `sharefolder` as a **folder-only** sharing operation. It requires a folder ID/path, recipient email, permissions and optional message.

The official `uploadtransfer` operation is the closest documented operation for a **file transfer to recipient email(s)**. It requires a file upload payload, sender email, receiver email(s), and optional message.

For a campaign whose selected resource is a file, Autowork therefore uses `uploadtransfer`: the worker retrieves the selected pCloud file through the authenticated pCloud API, sends that file as the upload payload to pCloud's transfer endpoint, and supplies the campaign recipient and resolved description.

For `sharefolder`, the implementation now explicitly refuses a selected file instead of silently sharing its parent folder. This prevents the previous incorrect behavior.

## Security

Real pCloud credentials are no longer placed directly into BullMQ job payloads. Real credentials are encrypted at rest with AES-256-GCM using `PCLOUD_CREDENTIAL_ENCRYPTION_KEY` and decrypted only inside the server/worker process.

No real credentials are stored in this repository. Any credentials previously pasted into chat should be rotated before production use.

## Queue and persistence

`campaign-queue` only orchestrates recipient fan-out. `pcloud-share-queue` is authoritative for pCloud execution and records `PCloudShareExecution`, recipient state, campaign counters and account last-used state.

Transient pCloud failures are returned to BullMQ for bounded retry. Non-transient failures are persisted as failed executions.

## Remaining production gates

1. Run the full repository install, Prisma generation, lint, TypeScript build and test suite in the actual development environment.
2. Validate the upload-transfer behavior against a pCloud test account with one non-sensitive document and one authorized recipient.
3. Confirm the client's intended UX matches pCloud's documented transfer semantics; `sharefolder` is not a file-share API.
4. Do not enable bulk production campaigns until the controlled single-recipient live test passes.
5. Any account rotation strategy must be separately approved and must not bypass pCloud limits or terms.
