import { IEmailAdapter } from './email.adapter';
import { FakeEmailAdapter } from './providers/fake.adapter';
import { GmailAdapter } from './providers/gmail.adapter';
import { MicrosoftAdapter } from './providers/microsoft.adapter';
import { SmtpAdapter } from './providers/smtp.adapter';

export class EmailAdapterFactory {
  private static adapters: Map<string, IEmailAdapter> = new Map();

  static getAdapter(providerName?: string): IEmailAdapter {
    const configuredProvider = providerName?.trim().toLowerCase() || process.env.EMAIL_DEFAULT_PROVIDER?.trim().toLowerCase();

    if (!configuredProvider) {
      throw new Error('No email provider is configured. Set EMAIL_DEFAULT_PROVIDER or select an authenticated sender account.');
    }

    if (configuredProvider === 'fake') {
      if (process.env.NODE_ENV === 'production' || process.env.EMAIL_ALLOW_FAKE !== 'true') {
        throw new Error('Fake email provider is disabled. Configure a real authenticated email provider.');
      }
    }

    if (!this.adapters.has(configuredProvider)) {
      switch (configuredProvider) {
        case 'fake':
          this.adapters.set(configuredProvider, new FakeEmailAdapter());
          break;
        case 'gmail':
          this.adapters.set(configuredProvider, new GmailAdapter());
          break;
        case 'microsoft':
          this.adapters.set(configuredProvider, new MicrosoftAdapter());
          break;
        case 'smtp':
          this.adapters.set(configuredProvider, new SmtpAdapter());
          break;
        default:
          throw new Error(`Unsupported email provider: ${configuredProvider}`);
      }
    }

    return this.adapters.get(configuredProvider)!;
  }
}
