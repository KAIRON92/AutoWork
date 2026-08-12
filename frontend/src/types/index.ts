export type Organization = {
  id: string;
  name: string;
  slug: string;
};

export type UserRole = 'ADMIN' | 'MEMBER' | 'VIEWER';

export type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  role: UserRole;
};

export type AccountStatus = 'ACTIVE' | 'PAUSED' | 'INVALID' | 'ERROR';

export type EmailAccount = {
  id: string;
  name: string;
  email: string;
  provider: 'fake' | 'gmail' | 'microsoft' | 'smtp';
  status: AccountStatus;
  dailyLimit: number;
  sentToday: number;
  createdAt: string;
};

export type Contact = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  customFields?: Record<string, string>;
  createdAt: string;
};

export type ContactList = {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  createdAt: string;
};

export type ImportJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type ImportJob = {
  id: string;
  filename: string;
  status: ImportJobStatus;
  totalRows: number;
  importedCount: number;
  failedCount: number;
  createdAt: string;
};

export type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type Attachment = {
  id: string;
  filename: string;
  fileSize: number;
  mimeType: string;
  pcloudFileId?: string;
  createdAt: string;
};

export type CampaignStatus = 'DRAFT' | 'QUEUED' | 'PROCESSING' | 'PAUSED' | 'COMPLETED' | 'FAILED';

export type Campaign = {
  id: string;
  name: string;
  status: CampaignStatus;
  templateId: string;
  templateName?: string;
  accountIds: string[];
  totalCount: number;
  sentCount: number;
  failedCount: number;
  createdAt: string;
};

export type ExecutionLog = {
  id: string;
  campaignId: string;
  campaignName?: string;
  emailAccountId: string;
  accountEmail?: string;
  recipientEmail: string;
  status: 'SUCCESS' | 'FAILED' | 'RETRYING';
  responseMessage: string;
  sentAt: string;
};

export type ErrorLog = {
  id: string;
  code: string;
  message: string;
  stackTrace?: string;
  context?: Record<string, any>;
  createdAt: string;
};
