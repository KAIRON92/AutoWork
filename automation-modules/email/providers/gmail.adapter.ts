import {
  IEmailAdapter,
  SendEmailPayload,
  SendEmailResult,
  EmailAccountValidationResult
} from '../email.adapter';

/**
 * Gmail / Google Workspace Provider Adapter (Placeholder)
 * 
 * To be fully implemented once client confirms email provider approval and supplies OAuth client credentials.
 */
export class GmailAdapter implements IEmailAdapter {
  readonly providerName = 'gmail';

  async validateAccount(credentials: Record<string, any>): Promise<EmailAccountValidationResult> {
    throw new Error('Gmail adapter is pending client provider confirmation in Section 11 of blueprint.');
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    throw new Error('Gmail adapter is pending client provider confirmation in Section 11 of blueprint.');
  }
}
