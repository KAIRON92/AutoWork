import {
  IEmailAdapter,
  SendEmailPayload,
  SendEmailResult,
  EmailAccountValidationResult
} from '../email.adapter';

/**
 * Microsoft 365 / Outlook Provider Adapter (Placeholder)
 * 
 * To be fully implemented once client confirms email provider approval and supplies OAuth client credentials.
 */
export class MicrosoftAdapter implements IEmailAdapter {
  readonly providerName = 'microsoft';

  async validateAccount(credentials: Record<string, any>): Promise<EmailAccountValidationResult> {
    throw new Error('Microsoft 365 adapter is pending client provider confirmation in Section 11 of blueprint.');
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    throw new Error('Microsoft 365 adapter is pending client provider confirmation in Section 11 of blueprint.');
  }
}
