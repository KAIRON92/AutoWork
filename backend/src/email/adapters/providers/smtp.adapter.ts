import * as nodemailer from 'nodemailer';
import {
  IEmailAdapter,
  SendEmailPayload,
  SendEmailResult,
  EmailAccountValidationResult,
} from '../email.adapter';

export interface SmtpCredentials {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
  accountEmail: string;
  fromName?: string;
  requireTls?: boolean;
}

export class SmtpAdapter implements IEmailAdapter {
  readonly providerName = 'smtp';
  private transporterFactory?: (credentials: SmtpCredentials) => nodemailer.Transporter;

  constructor(transporterFactory?: (credentials: SmtpCredentials) => nodemailer.Transporter) {
    this.transporterFactory = transporterFactory;
  }

  private createTransporter(credentials: SmtpCredentials) {
    if (this.transporterFactory) {
      return this.transporterFactory(credentials);
    }
    const port = Number(credentials.port) || 587;
    const secure = credentials.secure !== undefined ? Boolean(credentials.secure) : port === 465;

    return nodemailer.createTransport({
      host: credentials.host?.trim(),
      port,
      secure,
      auth: {
        user: credentials.user?.trim(),
        pass: credentials.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
      tls: {
        rejectUnauthorized: true,
      },
    });
  }

  async validateAccount(credentialsInput: Record<string, any>): Promise<EmailAccountValidationResult> {
    const credentials = credentialsInput as SmtpCredentials;
    const accountEmail = String(credentials.accountEmail || credentials.user || '').trim().toLowerCase();

    if (!credentials.host?.trim()) {
      return { valid: false, message: 'SMTP host is required', accountEmail };
    }
    if (!credentials.user?.trim()) {
      return { valid: false, message: 'SMTP username is required', accountEmail };
    }
    if (!credentials.pass) {
      return { valid: false, message: 'SMTP password is required', accountEmail };
    }
    if (!accountEmail || !accountEmail.includes('@')) {
      return { valid: false, message: 'Valid sender email address is required', accountEmail };
    }

    try {
      const transporter = this.createTransporter(credentials);
      await transporter.verify();
      return {
        valid: true,
        message: `SMTP connection and authentication verified successfully (${credentials.host}:${credentials.port || 587}).`,
        accountEmail,
        details: {
          host: credentials.host,
          port: credentials.port || 587,
          secure: credentials.secure,
        },
      };
    } catch (err: any) {
      return {
        valid: false,
        message: err.message || 'SMTP authentication failed. Check host, port, and credentials.',
        accountEmail,
      };
    }
  }

  async sendEmail(payload: SendEmailPayload): Promise<SendEmailResult> {
    const startedAt = new Date();
    const credentials = (payload.accountCredentials || {}) as SmtpCredentials;

    try {
      const transporter = this.createTransporter(credentials);
      const fromEmail = String(credentials.accountEmail || credentials.user || '').trim();
      const fromName = credentials.fromName?.trim();
      const fromHeader = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;

      const attachments = (payload.attachments || []).map((att) => ({
        filename: att.filename,
        content: Buffer.isBuffer(att.content) ? att.content : Buffer.from(String(att.content || '')),
        contentType: att.mimeType || 'application/octet-stream',
      }));

      const mailOptions: nodemailer.SendMailOptions = {
        from: fromHeader,
        to: payload.to.email,
        subject: payload.subject,
        text: payload.body,
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      const info = await transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: String(info.messageId || `smtp-${Date.now()}`),
        provider: this.providerName,
        responseMessage: 'SMTP message accepted for delivery.',
        timestamp: startedAt,
      };
    } catch (err: any) {
      return {
        success: false,
        provider: this.providerName,
        responseMessage: err.message || 'SMTP send failed.',
        error: {
          code: 'SMTP_SEND_FAILED',
          message: err.message || 'SMTP delivery error',
          raw: err,
        },
        timestamp: startedAt,
      };
    }
  }
}
