import {
  IEmailAdapter,
  SendEmailPayload,
  SendEmailResult,
  EmailAccountValidationResult,
} from '../email.adapter';

export class FakeEmailAdapter implements IEmailAdapter {
  readonly providerName = 'fake';

  async validateAccount(credentials: Record<string, any>): Promise<EmailAccountValidationResult> {
    const accountEmail = String(credentials.accountEmail || 'test@autowork.local');
    return {
      valid: true,
      message: 'Fake provider verification successful (dry-run/test mode).',
      accountEmail,
    };
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    return {
      success: true,
      messageId: `fake-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      provider: this.providerName,
      statusCode: 200,
      responseMessage: 'Fake email accepted for test delivery.',
      timestamp: new Date(),
    };
  }
}
