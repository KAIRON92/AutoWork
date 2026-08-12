import {
  IEmailAdapter,
  SendEmailPayload,
  SendEmailResult,
  EmailAccountValidationResult
} from '../email.adapter';

/**
 * Custom SMTP Provider Adapter (Placeholder)
 * 
 * To be fully implemented once client confirms email provider approval and supplies SMTP parameters.
 */
export class SmtpAdapter implements IEmailAdapter {
  readonly providerName = 'smtp';

  async validateAccount(credentials: Record<string, any>): Promise<EmailAccountValidationResult> {
    throw new Error('SMTP adapter is pending client provider confirmation in Section 11 of blueprint.');
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    throw new Error('SMTP adapter is pending client provider confirmation in Section 11 of blueprint.');
  }
}
