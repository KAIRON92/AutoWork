import { IEmailAdapter } from './email.adapter';
import { FakeEmailAdapter } from './providers/fake.adapter';
import { GmailAdapter } from './providers/gmail.adapter';
import { MicrosoftAdapter } from './providers/microsoft.adapter';
import { SmtpAdapter } from './providers/smtp.adapter';

export class EmailAdapterFactory {
  private static adapters: Map<string, IEmailAdapter> = new Map();

  static getAdapter(providerName: string = 'fake'): IEmailAdapter {
    const key = providerName.toLowerCase();

    if (!this.adapters.has(key)) {
      switch (key) {
        case 'fake':
          this.adapters.set(key, new FakeEmailAdapter());
          break;
        case 'gmail':
          this.adapters.set(key, new GmailAdapter());
          break;
        case 'microsoft':
          this.adapters.set(key, new MicrosoftAdapter());
          break;
        case 'smtp':
          this.adapters.set(key, new SmtpAdapter());
          break;
        default:
          // Fallback to fake adapter for unknown or unconfirmed providers
          this.adapters.set(key, new FakeEmailAdapter());
          break;
      }
    }

    return this.adapters.get(key)!;
  }
}
