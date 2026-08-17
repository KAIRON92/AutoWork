import {
  IEmailAdapter,
  SendEmailPayload,
  SendEmailResult,
  EmailAccountValidationResult,
} from '../email.adapter';

interface MicrosoftCredentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  scope?: string;
  tokenType?: string;
  accountEmail?: string;
}

export class MicrosoftAdapter implements IEmailAdapter {
  readonly providerName = 'microsoft';

  private requireClientConfig() {
    const clientId = process.env.MICROSOFT_CLIENT_ID?.trim();
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
      throw new Error('Microsoft OAuth client configuration is required. Set MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET.');
    }
    return { clientId, clientSecret };
  }

  private async refresh(credentials: MicrosoftCredentials): Promise<MicrosoftCredentials> {
    if (!credentials.refreshToken) return credentials;
    const { clientId, clientSecret } = this.requireClientConfig();

    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: credentials.refreshToken,
        grant_type: 'refresh_token',
        scope: 'offline_access https://graph.microsoft.com/Mail.Send https://graph.microsoft.com/User.Read',
      }).toString(),
    });

    const payload = await response.json();
    if (!response.ok || !payload.access_token) {
      throw new Error(payload.error_description || payload.error || 'Microsoft token refresh failed');
    }

    return {
      ...credentials,
      accessToken: String(payload.access_token),
      expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000,
    };
  }

  private async getUsableCredentials(input: Record<string, any>): Promise<MicrosoftCredentials> {
    const credentials = input as MicrosoftCredentials;
    if (!credentials.accessToken) throw new Error('Microsoft access token is required');
    if (!credentials.expiresAt || Date.now() < Number(credentials.expiresAt) - 60_000) return credentials;
    return this.refresh(credentials);
  }

  async validateAccount(credentialsInput: Record<string, any>): Promise<EmailAccountValidationResult> {
    try {
      const credentials = await this.getUsableCredentials(credentialsInput);
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${credentials.accessToken}` },
      });
      const payload = await response.json();
      if (!response.ok || (!payload.mail && !payload.userPrincipalName)) {
        return {
          valid: false,
          message: payload.error?.message || 'Failed to verify Microsoft mailbox.',
          accountEmail: String(credentials.accountEmail || ''),
        };
      }
      const accountEmail = String(payload.mail || payload.userPrincipalName).toLowerCase();
      return {
        valid: true,
        message: 'Microsoft 365 mailbox and API access verified.',
        accountEmail,
        details: { displayName: payload.displayName, id: payload.id },
      };
    } catch (err: any) {
      return {
        valid: false,
        message: err.message || 'Microsoft account validation failed.',
        accountEmail: String(credentialsInput.accountEmail || ''),
      };
    }
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const startedAt = new Date();
    try {
      const credentials = await this.getUsableCredentials(payload.accountCredentials || {});
      const attachments = (payload.attachments || []).map((att) => {
        const contentBytes = Buffer.isBuffer(att.content) ? att.content : Buffer.from(String(att.content || ''));
        return {
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: att.filename,
          contentType: att.mimeType || 'application/octet-stream',
          contentBytes: contentBytes.toString('base64'),
        };
      });

      const messagePayload = {
        message: {
          subject: payload.subject,
          body: {
            contentType: 'Text',
            content: payload.body,
          },
          toRecipients: [
            {
              emailAddress: {
                address: payload.to.email,
                name: payload.to.name,
              },
            },
          ],
          attachments: attachments.length > 0 ? attachments : undefined,
        },
        saveToSentItems: true,
      };

      const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${credentials.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      });

      if (!response.ok && response.status !== 202) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.error?.message || `Microsoft send failed with HTTP ${response.status}`);
      }

      return {
        success: true,
        messageId: `ms-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        provider: this.providerName,
        responseMessage: 'Microsoft 365 message accepted for delivery.',
        timestamp: startedAt,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.providerName,
        responseMessage: err.message || 'Microsoft 365 send failed.',
        error: { code: 'MICROSOFT_SEND_FAILED', message: err.message || 'Microsoft send failed' },
        timestamp: startedAt,
      };
    }
  }
}
