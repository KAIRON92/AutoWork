import {
  IEmailAdapter,
  SendEmailPayload,
  SendEmailResult,
  EmailAccountValidationResult,
} from '../email.adapter';

interface GmailCredentials {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
}

function jsonErrorMessage(value: any): string {
  return value?.error?.message || value?.error_description || 'Gmail API request failed';
}

export class GmailAdapter implements IEmailAdapter {
  readonly providerName = 'gmail';

  private credentials(payload: Record<string, any>): GmailCredentials {
    const credentials = payload?.credentials && typeof payload.credentials === 'object'
      ? payload.credentials
      : payload;
    if (!credentials?.accessToken) throw new Error('Gmail access token is required');
    return credentials as GmailCredentials;
  }

  private async refreshAccessToken(credentials: GmailCredentials): Promise<string> {
    if (!credentials.refreshToken) return credentials.accessToken!;
    if (!credentials.expiresAt || Date.now() < Number(credentials.expiresAt) - 60_000) {
      return credentials.accessToken!;
    }

    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('Gmail OAuth client configuration is missing');

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
    const result = await response.json();
    if (!response.ok || !result.access_token) throw new Error(jsonErrorMessage(result));

    credentials.accessToken = result.access_token;
    credentials.expiresAt = Date.now() + Number(result.expires_in || 3600) * 1000;
    return credentials.accessToken;
  }

  async validateAccount(credentials: Record<string, any>): Promise<EmailAccountValidationResult> {
    try {
      const normalized = this.credentials(credentials);
      const accessToken = await this.refreshAccessToken(normalized);
      const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const profile = await response.json();
      if (!response.ok || !profile.email) {
        return {
          valid: false,
          message: jsonErrorMessage(profile),
          accountEmail: profile?.email || '',
        };
      }
      return {
        valid: true,
        message: 'Gmail account authenticated successfully.',
        accountEmail: String(profile.email).toLowerCase(),
        details: { subject: profile.sub, name: profile.name },
      };
    } catch (error: any) {
      return {
        valid: false,
        message: error?.message || 'Unable to authenticate Gmail account.',
        accountEmail: '',
      };
    }
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const timestamp = new Date();
    try {
      const credentials = this.credentials(payload.accountCredentials || {});
      const accessToken = await this.refreshAccessToken(credentials);
      const toName = payload.to.name ? ` ${payload.to.name}` : '';
      const headers = [
        `To: ${payload.to.email}${toName}`,
        `Subject: ${payload.subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        payload.body,
      ];
      const raw = Buffer.from(headers.join('\r\n'), 'utf8').toString('base64url');

      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw }),
      });
      const result = await response.json();
      if (!response.ok || !result.id) {
        return {
          success: false,
          provider: this.providerName,
          statusCode: response.status,
          responseMessage: jsonErrorMessage(result),
          error: { code: `GMAIL_${response.status}`, message: jsonErrorMessage(result) },
          timestamp,
        };
      }

      return {
        success: true,
        provider: this.providerName,
        statusCode: response.status,
        responseMessage: 'Gmail message accepted by provider.',
        messageId: result.id,
        timestamp,
      };
    } catch (error: any) {
      return {
        success: false,
        provider: this.providerName,
        responseMessage: error?.message || 'Gmail send failed',
        error: { code: 'GMAIL_CLIENT_ERROR', message: error?.message || 'Gmail send failed' },
        timestamp,
      };
    }
  }
}
