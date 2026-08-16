import {
  IEmailAdapter,
  SendEmailPayload,
  SendEmailResult,
  EmailAccountValidationResult,
} from '../email.adapter';

interface GmailCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  tokenType?: string;
  accountEmail?: string;
}

<<<<<<< HEAD
function jsonErrorMessage(value: any): string {
  return value?.error?.message || value?.error_description || value?.error || 'Gmail API request failed';
}

=======
>>>>>>> origin/main
export class GmailAdapter implements IEmailAdapter {
  readonly providerName = 'gmail';

  private requireClientConfig() {
    const clientId = process.env.GMAIL_CLIENT_ID?.trim();
    const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      throw new Error('Gmail OAuth client configuration is required.');
    }
    return { clientId, clientSecret };
  }

  private async refresh(credentials: GmailCredentials): Promise<GmailCredentials> {
    if (!credentials.refreshToken) return credentials;
    const { clientId, clientSecret } = this.requireClientConfig();

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: credentials.refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    const payload = await response.json();
    if (!response.ok || !payload.access_token) {
<<<<<<< HEAD
      throw new Error(jsonErrorMessage(payload));
=======
      throw new Error(payload.error_description || payload.error || 'Gmail access token refresh failed');
>>>>>>> origin/main
    }

    return {
      ...credentials,
      accessToken: String(payload.access_token),
      expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000,
    };
  }

  private async getUsableCredentials(input: Record<string, any>): Promise<GmailCredentials> {
    const credentials = input as GmailCredentials;
    if (!credentials.accessToken) throw new Error('Gmail access token is required');
    if (!credentials.expiresAt || Date.now() < Number(credentials.expiresAt) - 60_000) return credentials;
    return this.refresh(credentials);
  }

  async validateAccount(credentialsInput: Record<string, any>): Promise<EmailAccountValidationResult> {
    try {
      const credentials = await this.getUsableCredentials(credentialsInput);
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });
      const payload = await response.json();
      if (!response.ok || !payload.emailAddress) {
        return {
          valid: false,
<<<<<<< HEAD
          message: jsonErrorMessage(payload),
=======
          message: payload.error?.message || 'Unable to verify Gmail mailbox.',
>>>>>>> origin/main
          accountEmail: String(credentials.accountEmail || ''),
        };
      }
      return {
        valid: true,
        message: 'Gmail mailbox and API access verified.',
        accountEmail: String(payload.emailAddress).toLowerCase(),
        details: { messagesTotal: payload.messagesTotal, threadsTotal: payload.threadsTotal },
      };
    } catch (error: any) {
      return {
        valid: false,
        message: error?.message || 'Gmail account validation failed.',
        accountEmail: String(credentialsInput.accountEmail || ''),
      };
    }
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const startedAt = new Date();
    try {
      const credentials = await this.getUsableCredentials(payload.accountCredentials || {});
      const from = String(payload.accountCredentials?.accountEmail || '').trim();
      if (!from) throw new Error('Verified Gmail sender address is required');

      const lines = [
        `From: ${from}`,
        `To: ${payload.to.email}`,
        `Subject: ${payload.subject}`,
        'MIME-Version: 1.0',
      ];

      const attachments = payload.attachments || [];
      if (attachments.length === 0) {
        lines.push('Content-Type: text/plain; charset="UTF-8"', '', payload.body);
      } else {
        const boundary = `=_AutoWork_${Date.now().toString(36)}`;
        lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`, '');
        lines.push(`--${boundary}`, 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: 8bit', '', payload.body);

        for (const attachment of attachments) {
          if (attachment.content === undefined) {
            throw new Error(`Attachment ${attachment.filename} has no inline content.`);
          }
          const content = Buffer.isBuffer(attachment.content)
            ? attachment.content
            : Buffer.from(String(attachment.content));
          lines.push(
            `--${boundary}`,
            `Content-Type: ${attachment.mimeType || 'application/octet-stream'}; name="${attachment.filename}"`,
            'Content-Transfer-Encoding: base64',
            `Content-Disposition: attachment; filename="${attachment.filename}"`,
            '',
            content.toString('base64').replace(/(.{76})/g, '$1\r\n'),
          );
        }
        lines.push(`--${boundary}--`, '');
      }

      const raw = Buffer.from(lines.join('\r\n')).toString('base64url');
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
      });
      const result = await response.json();
      if (!response.ok || !result.id) {
<<<<<<< HEAD
        throw new Error(jsonErrorMessage(result));
=======
        throw new Error(result.error?.message || 'Gmail send failed');
>>>>>>> origin/main
      }

      return {
        success: true,
        messageId: String(result.id),
        provider: this.providerName,
        responseMessage: 'Gmail message accepted by the provider.',
        timestamp: startedAt,
      };
    } catch (error: any) {
      return {
        success: false,
        provider: this.providerName,
        responseMessage: error?.message || 'Gmail send failed.',
        error: { code: 'GMAIL_SEND_FAILED', message: error?.message || 'Gmail send failed.' },
        timestamp: startedAt,
      };
    }
  }
}
