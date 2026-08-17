/**
 * Provider-Agnostic Email Adapter Interface
 * 
 * Every email provider (fake, gmail, microsoft, smtp) must implement this interface.
 * This abstracts email dispatch, validation, and error reporting.
 */

export interface EmailRecipient {
  email: string;
  name?: string;
  variables?: Record<string, string>;
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  pcloudFileId?: string;
  mimeType?: string;
}

export interface SendEmailPayload {
  to: EmailRecipient;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
  accountCredentials?: Record<string, any>;
  campaignId?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  provider: string;
  statusCode?: number;
  responseMessage: string;
  error?: {
    code: string;
    message: string;
    raw?: any;
  };
  timestamp: Date;
}

export interface EmailAccountValidationResult {
  valid: boolean;
  message: string;
  accountEmail: string;
  details?: Record<string, any>;
}

export interface IEmailAdapter {
  readonly providerName: string;

  /**
   * Validate account credentials & connection health
   */
  validateAccount(credentials: Record<string, any>): Promise<EmailAccountValidationResult>;

  /**
   * Send a single email through the provider
   */
  sendEmail(payload: SendEmailPayload): Promise<SendEmailResult>;
}
