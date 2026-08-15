# AutoWork Final Handover Checklist

## Build verification

- [ ] Backend `npm run build` passes on Node 20.20.2.
- [ ] Frontend `npm run build` passes on Node 20.20.2.
- [ ] `npm test -- --runInBand` passes.
- [ ] Prisma migration status is clean.
- [ ] Docker Compose starts without missing-secret fallbacks.

## Security verification

- [ ] `JWT_SECRET` is present and >= 32 characters.
- [ ] `PCLOUD_CREDENTIAL_ENCRYPTION_KEY` decodes to exactly 32 bytes.
- [ ] Production never enables `PCLOUD_ALLOW_MOCK=true`.
- [ ] No real credentials are stored in frontend/browser storage.
- [ ] No pCloud credentials/tokens appear in application logs.
- [ ] ADMIN/MEMBER/VIEWER permissions are enforced server-side.
- [ ] Cross-tenant data access attempts return 403/404.
- [ ] Login throttling returns HTTP 429 after the configured threshold.

## Real pCloud verification

1. Use a dedicated non-client test pCloud account first.
2. Connect it through **Official pCloud REST API (Production)**.
3. Confirm account status becomes ACTIVE after server-side verification.
4. Browse a real pCloud folder.
5. Read a real test file metadata record.
6. Create one contact owned by the same organization.
7. Create one minimal template.
8. Create a campaign with exactly one recipient.
9. Use `uploadtransfer` for the controlled test.
10. Confirm the real pCloud transfer arrives at the controlled test address.
11. Confirm AutoWork records SUCCESS and the pCloud reference ID.
12. Confirm no duplicate transfer occurs after a safe worker restart/retry scenario.

## Client premium account handover

- Do not test the client account until the dedicated test account passes.
- Never paste the client pCloud password/token into ChatGPT, Claude, GitHub issues, or documentation.
- Connect the client account only from the local trusted environment using the production provider.
- Verify folders/files before any write or mass operation.
- Perform one controlled real operation before any larger campaign.
