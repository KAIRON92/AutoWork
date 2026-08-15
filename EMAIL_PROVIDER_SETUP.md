# AutoWork Email Provider Setup

This document describes the production sender-account path added for authenticated email delivery. It contains no credentials.

## Gmail / Google Workspace

AutoWork uses official Google OAuth 2.0 for Gmail sender authorization. An email address alone is never treated as a sender account.

Required server configuration:

```text
EMAIL_ALLOW_FAKE=false
GMAIL_CLIENT_ID=<Google OAuth client id>
GMAIL_CLIENT_SECRET=<Google OAuth client secret>
GMAIL_REDIRECT_URI=http://localhost:4000/api/v1/email/accounts/gmail/callback
```

Use the corresponding production HTTPS callback URL in the deployed environment.

The application requests the following scopes:

```text
openid
email
profile
https://www.googleapis.com/auth/gmail.send
```

### Local flow

1. Start AutoWork with `JWT_SECRET` and Gmail OAuth variables configured.
2. Sign in as an AutoWork administrator.
3. Open **Email Accounts**.
4. Select **Connect Gmail**.
5. Complete the Google consent screen.
6. Google redirects to `/api/v1/email/accounts/gmail/callback`.
7. AutoWork exchanges the authorization code server-side.
8. AutoWork verifies the mailbox identity through Google's userinfo endpoint.
9. The access/refresh token material is encrypted at rest.
10. The sender is marked `VERIFIED` only after the OAuth flow succeeds.
11. Use the controlled Test action with exactly one authorized recipient before using the sender in a campaign.

### Security

Never commit or paste:

- `GMAIL_CLIENT_SECRET`
- access tokens
- refresh tokens
- JWT secrets
- pCloud credentials
- encryption keys

The Gmail callback uses a signed, short-lived OAuth state so a callback cannot be rebound to an arbitrary tenant.

## Campaign usage

A campaign may now reference an authenticated sender account through `emailAccountId`. The sender is tenant-scoped and must be `VERIFIED` when attached to a campaign.

The final campaign workflow remains:

Import → sender → recipients → template → preview → pCloud component → review → launch.

A provider is not considered production-ready until a controlled real sender operation returns a real provider reference/message ID and that result is persisted in AutoWork.
