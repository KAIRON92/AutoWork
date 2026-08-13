export interface RecipientContext {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
  email: string;
  phone?: string;
  company?: string;
  target?: string;
  [key: string]: any;
}

export class TemplateVariableResolver {
  /**
   * Generates a random alphanumeric string (default 6 characters, uppercase A-Z, 0-9)
   */
  static generateRandomCode(length: number = 6): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Detects all variable tags present in template string
   */
  static detectVariables(template: string): string[] {
    if (!template) return [];
    const matches = template.match(/#[A-Z0-9_]+#/gi);
    if (!matches) return [];
    return Array.from(new Set(matches.map((m) => m.toUpperCase())));
  }

  /**
   * Resolves template placeholders with concrete recipient values and unique random code
   */
  static resolve(template: string, recipient: RecipientContext, randomCode?: string): { resolvedText: string; randomCode: string } {
    if (!template) return { resolvedText: '', randomCode: '' };

    const resolvedRandom = randomCode || this.generateRandomCode(6);
    const fullName = recipient.fullName || recipient.name || `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim() || recipient.email.split('@')[0];
    const firstName = recipient.firstName || fullName.split(' ')[0] || '';
    const lastName = recipient.lastName || fullName.split(' ').slice(1).join(' ') || '';

    let text = template;

    // Case-insensitive replacements for all standard variables
    text = text.replace(/#NAME#/gi, fullName);
    text = text.replace(/#FIRSTNAME#/gi, firstName);
    text = text.replace(/#LASTNAME#/gi, lastName);
    text = text.replace(/#EMAIL#/gi, recipient.email);
    text = text.replace(/#PHONE#/gi, recipient.phone || '');
    text = text.replace(/#COMPANY#/gi, recipient.company || '');
    text = text.replace(/#TARGET#/gi, recipient.target || recipient.company || '');
    text = text.replace(/#RANDOM#/gi, resolvedRandom);

    // Custom properties if any
    Object.keys(recipient).forEach((key) => {
      const tag = `#${key.toUpperCase()}#`;
      const val = recipient[key];
      if (val !== undefined && val !== null && typeof val !== 'object') {
        text = text.replaceAll(tag, String(val));
      }
    });

    return {
      resolvedText: text,
      randomCode: resolvedRandom,
    };
  }
}
