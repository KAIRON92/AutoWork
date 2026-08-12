import { EmailAccount, Contact, ContactList, Template, Campaign, ExecutionLog, ErrorLog } from '../types';

export const mockUser = {
  id: 'usr-1',
  email: 'alex.director@autowork.com',
  firstName: 'Alex',
  lastName: 'Morgan',
  organizationId: 'org-101',
  role: 'ADMIN' as const,
};

export const mockOrganization = {
  id: 'org-101',
  name: 'Acme Growth Labs',
  slug: 'acme-growth',
};

export const mockAccounts: EmailAccount[] = [
  {
    id: 'acc-1',
    name: 'Primary Outbound',
    email: 'outbound@acmegrowth.com',
    provider: 'fake',
    status: 'ACTIVE',
    dailyLimit: 500,
    sentToday: 142,
    createdAt: '2026-08-01T10:00:00Z',
  },
  {
    id: 'acc-2',
    name: 'Secondary Sender',
    email: 'sales@acmegrowth.com',
    provider: 'fake',
    status: 'ACTIVE',
    dailyLimit: 250,
    sentToday: 89,
    createdAt: '2026-08-05T14:30:00Z',
  },
  {
    id: 'acc-3',
    name: 'Staging Test Account',
    email: 'test@acmegrowth.com',
    provider: 'fake',
    status: 'PAUSED',
    dailyLimit: 100,
    sentToday: 0,
    createdAt: '2026-08-10T09:15:00Z',
  },
];

export const mockContacts: Contact[] = [
  {
    id: 'cnt-1',
    email: 'sarah.connor@cyberdyne.io',
    firstName: 'Sarah',
    lastName: 'Connor',
    phone: '+1 555-0192',
    company: 'Cyberdyne Systems',
    createdAt: '2026-08-02T11:20:00Z',
  },
  {
    id: 'cnt-2',
    email: 'bruce.wayne@wayneenterprises.com',
    firstName: 'Bruce',
    lastName: 'Wayne',
    phone: '+1 555-0144',
    company: 'Wayne Enterprises',
    createdAt: '2026-08-03T12:00:00Z',
  },
  {
    id: 'cnt-3',
    email: 'diana.prince@themyscira.org',
    firstName: 'Diana',
    lastName: 'Prince',
    phone: '+1 555-0188',
    company: 'Themyscira Global',
    createdAt: '2026-08-04T15:10:00Z',
  },
  {
    id: 'cnt-4',
    email: 'clark.kent@dailyplanet.com',
    firstName: 'Clark',
    lastName: 'Kent',
    phone: '+1 555-0177',
    company: 'Daily Planet News',
    createdAt: '2026-08-06T08:45:00Z',
  },
  {
    id: 'cnt-5',
    email: 'tony.stark@starkindustries.com',
    firstName: 'Tony',
    lastName: 'Stark',
    phone: '+1 555-0199',
    company: 'Stark Industries',
    createdAt: '2026-08-08T16:30:00Z',
  },
];

export const mockContactLists: ContactList[] = [
  {
    id: 'lst-1',
    name: 'Enterprise VIP Prospects',
    description: 'Tier-1 executive contacts for Q3 outreach',
    memberCount: 5,
    createdAt: '2026-08-02T11:30:00Z',
  },
  {
    id: 'lst-2',
    name: 'SaaS Founders & CTOs',
    description: 'Targeted tech leads and decision makers',
    memberCount: 42,
    createdAt: '2026-08-05T09:00:00Z',
  },
];

export const mockTemplates: Template[] = [
  {
    id: 'tpl-1',
    name: 'Executive Introduction',
    subject: 'Quick question regarding #COMPANY# (#RANDOM#)',
    body: 'Hi #FIRSTNAME#,\n\nI noticed #COMPANY# has been expanding rapidly. We help companies like yours automate outbound workflows with total organization isolation.\n\nWould you be open to a 10-minute introduction this week?\n\nBest regards,\nAlex Morgan\nAutowork.com (Ref ID: #RANDOM#)',
    createdAt: '2026-08-03T10:15:00Z',
    updatedAt: '2026-08-11T14:20:00Z',
  },
  {
    id: 'tpl-2',
    name: 'Product Follow-Up',
    subject: 'Following up on our email to #NAME#',
    body: 'Hi #FIRSTNAME#,\n\nJust wanted to make sure my previous note didn\'t get lost. We\'d love to demonstrate how Autowork streamlines email queues for #COMPANY#.\n\nReach out whenever you have a moment!\n\nCheers,\nAlex',
    createdAt: '2026-08-06T11:00:00Z',
    updatedAt: '2026-08-06T11:00:00Z',
  },
];

export const mockCampaigns: Campaign[] = [
  {
    id: 'cmp-1',
    name: 'Q3 Enterprise Outreach Campaign',
    status: 'PROCESSING',
    templateId: 'tpl-1',
    templateName: 'Executive Introduction',
    accountIds: ['acc-1', 'acc-2'],
    totalCount: 50,
    sentCount: 38,
    failedCount: 1,
    createdAt: '2026-08-12T09:00:00Z',
  },
  {
    id: 'cmp-2',
    name: 'SaaS Founders Nurture Sequence',
    status: 'COMPLETED',
    templateId: 'tpl-2',
    templateName: 'Product Follow-Up',
    accountIds: ['acc-1'],
    totalCount: 42,
    sentCount: 42,
    failedCount: 0,
    createdAt: '2026-08-10T14:00:00Z',
  },
  {
    id: 'cmp-3',
    name: 'Draft Partner Campaign',
    status: 'DRAFT',
    templateId: 'tpl-1',
    templateName: 'Executive Introduction',
    accountIds: ['acc-1'],
    totalCount: 0,
    sentCount: 0,
    failedCount: 0,
    createdAt: '2026-08-12T11:30:00Z',
  },
];

export const mockExecutionLogs: ExecutionLog[] = [
  {
    id: 'exe-101',
    campaignId: 'cmp-1',
    campaignName: 'Q3 Enterprise Outreach Campaign',
    emailAccountId: 'acc-1',
    accountEmail: 'outbound@acmegrowth.com',
    recipientEmail: 'sarah.connor@cyberdyne.io',
    status: 'SUCCESS',
    responseMessage: 'Queued and dispatched via Fake Email Provider',
    sentAt: '2026-08-12T09:05:12Z',
  },
  {
    id: 'exe-102',
    campaignId: 'cmp-1',
    campaignName: 'Q3 Enterprise Outreach Campaign',
    emailAccountId: 'acc-2',
    accountEmail: 'sales@acmegrowth.com',
    recipientEmail: 'bruce.wayne@wayneenterprises.com',
    status: 'SUCCESS',
    responseMessage: 'Queued and dispatched via Fake Email Provider',
    sentAt: '2026-08-12T09:05:15Z',
  },
  {
    id: 'exe-103',
    campaignId: 'cmp-1',
    campaignName: 'Q3 Enterprise Outreach Campaign',
    emailAccountId: 'acc-1',
    accountEmail: 'outbound@acmegrowth.com',
    recipientEmail: 'diana.prince@themyscira.org',
    status: 'FAILED',
    responseMessage: 'Fake provider simulated a transient failure (retrying)',
    sentAt: '2026-08-12T09:05:18Z',
  },
];

export const mockErrorLogs: ErrorLog[] = [
  {
    id: 'err-1',
    code: 'SIMULATED_PROVIDER_ERROR',
    message: 'Transient dispatch delay encountered for recipient diana.prince@themyscira.org',
    createdAt: '2026-08-12T09:05:18Z',
  },
];
