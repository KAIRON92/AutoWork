import { Injectable } from '@nestjs/common';

@Injectable()
export class TemplatesService {
  private templates = [
    {
      id: 'tpl-1',
      name: 'Executive Introduction',
      subject: 'Quick question regarding #COMPANY# (#RANDOM#)',
      body: 'Hi #FIRSTNAME#,\n\nI noticed #COMPANY# has been expanding rapidly. We help companies like yours automate outbound workflows with total organization isolation.\n\nWould you be open to a 10-minute introduction this week?\n\nBest regards,\nAlex Morgan\nAutowork.com (Ref ID: #RANDOM#)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  async findAll() {
    return this.templates;
  }

  async create(data: { name: string; subject: string; body: string }) {
    const newTpl = {
      id: `tpl-${Date.now()}`,
      name: data.name,
      subject: data.subject,
      body: data.body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.templates.unshift(newTpl);
    return newTpl;
  }

  async update(id: string, data: Partial<{ name: string; subject: string; body: string }>) {
    const tpl = this.templates.find((t) => t.id === id);
    if (tpl) {
      Object.assign(tpl, data, { updatedAt: new Date().toISOString() });
      return tpl;
    }
    throw new Error('Template not found');
  }

  async remove(id: string) {
    this.templates = this.templates.filter((t) => t.id !== id);
    return true;
  }

  /**
   * Server-Side Variable Resolution Engine
   */
  resolveTemplate(subject: string, body: string, recipient: { email: string; firstName?: string; lastName?: string; company?: string; phone?: string }) {
    const randomVal = Math.random().toString(36).substring(2, 8).toUpperCase();
    const fullName = `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim() || recipient.email;

    const vars: Record<string, string> = {
      '#NAME#': fullName,
      '#FIRSTNAME#': recipient.firstName || 'Friend',
      '#LASTNAME#': recipient.lastName || '',
      '#EMAIL#': recipient.email,
      '#PHONE#': recipient.phone || '',
      '#COMPANY#': recipient.company || 'your organization',
      '#RANDOM#': randomVal,
    };

    let resolvedSubject = subject;
    let resolvedBody = body;

    for (const [tag, val] of Object.entries(vars)) {
      resolvedSubject = resolvedSubject.replace(new RegExp(tag, 'g'), val);
      resolvedBody = resolvedBody.replace(new RegExp(tag, 'g'), val);
    }

    return { subject: resolvedSubject, body: resolvedBody, randomVal };
  }
}
