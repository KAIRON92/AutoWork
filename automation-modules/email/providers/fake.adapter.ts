import {
  IEmailAdapter,
  SendEmailPayload,
  SendEmailResult,
  EmailAccountValidationResult
} from '../email.adapter';

export interface FakeAdapterOptions {
  simulatedLatencyMs?: number;
  successRate?: number; // 0.0 to 1.0 (e.g. 0.98 = 98% success rate)
}

export class FakeEmailAdapter implements IEmailAdapter {
  readonly providerName = 'fake';
  private latencyMs: number;
  private successRate: number;

  constructor(options: FakeAdapterOptions = {}) {
    this.latencyMs = options.simulatedLatencyMs ?? 150;
    this.successRate = options.successRate ?? 0.98;
  }

  async validateAccount(credentials: Record<string, any>): Promise<EmailAccountValidationResult> {
    await this.delay(50);
    const email = credentials.email || 'test-account@autowork.com';
    return {
      valid: true,
      message: 'Fake account connection validated successfully',
      accountEmail: email,
      details: {
        provider: 'fake',
        quotaRemaining: 10000,
        simulated: true,
      },
    };
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    await this.delay(this.latencyMs);

    const isSuccess = Math.random() < this.successRate;
    const messageId = `fake-msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    if (isSuccess) {
      return {
        success: true,
        messageId,
        provider: this.providerName,
        statusCode: 200,
        responseMessage: `Queued and dispatched to ${payload.to.email} via Fake Email Provider`,
        timestamp: new Date(),
      };
    } else {
      return {
        success: false,
        provider: this.providerName,
        statusCode: 500,
        responseMessage: `Simulated provider error for ${payload.to.email}`,
        error: {
          code: 'SIMULATED_PROVIDER_ERROR',
          message: 'Fake provider simulated a transient failure (will trigger retry)',
        },
        timestamp: new Date(),
      };
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
