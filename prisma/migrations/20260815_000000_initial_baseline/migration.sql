CREATE TABLE "Organization" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Role" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Permission" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "roleId" TEXT,
  CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "roleId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PCloudAccount" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "accountEmail" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'pcloud',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "dailyLimit" INTEGER NOT NULL DEFAULT 500,
  "sentToday" INTEGER NOT NULL DEFAULT 0,
  "credentials" TEXT NOT NULL,
  "pcloudUserId" TEXT,
  "apiHost" TEXT DEFAULT 'https://api.pcloud.com',
  "folderId" TEXT DEFAULT '0',
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PCloudAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PCloudFile" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "pcloudAccountId" TEXT,
  "name" TEXT NOT NULL,
  "fileId" TEXT NOT NULL,
  "folderId" TEXT DEFAULT '0',
  "fileSize" INTEGER NOT NULL DEFAULT 0,
  "mimeType" TEXT NOT NULL DEFAULT 'application/octet-stream',
  "pcloudPath" TEXT,
  "metadata" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PCloudFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Contact" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "firstName" TEXT,
  "lastName" TEXT,
  "fullName" TEXT,
  "phone" TEXT,
  "company" TEXT,
  "target" TEXT,
  "tags" TEXT,
  "customFields" TEXT,
  "source" TEXT DEFAULT 'manual',
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContactList" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContactListMember" (
  "contactId" TEXT NOT NULL,
  "contactListId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactListMember_pkey" PRIMARY KEY ("contactId", "contactListId")
);

CREATE TABLE "ImportJob" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "importedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "duplicateCount" INTEGER NOT NULL DEFAULT 0,
  "errors" TEXT,
  "detectedMap" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Template" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "content" TEXT NOT NULL,
  "variables" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Campaign" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "pcloudAccountId" TEXT NOT NULL,
  "pcloudFileId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "contactListId" TEXT,
  "totalCount" INTEGER NOT NULL DEFAULT 0,
  "sharedCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "retryingCount" INTEGER NOT NULL DEFAULT 0,
  "config" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampaignRecipient" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "pcloudShareExecutionId" TEXT,
  "resolvedDescription" TEXT,
  "randomCode" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CampaignRecipient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Automation" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Automation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationVersion" (
  "id" TEXT NOT NULL,
  "automationId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "definition" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AutomationVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AutomationJob" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "automationId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AutomationJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PCloudShareExecution" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "jobId" TEXT,
  "recipientId" TEXT,
  "pcloudAccountId" TEXT NOT NULL,
  "pcloudFileId" TEXT NOT NULL,
  "recipientEmail" TEXT NOT NULL,
  "descriptionSnapshot" TEXT NOT NULL,
  "operationType" TEXT NOT NULL DEFAULT 'uploadtransfer',
  "status" TEXT NOT NULL,
  "pcloudReferenceId" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "retryCount" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PCloudShareExecution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ErrorLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT,
  "code" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "stackTrace" TEXT,
  "context" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT,
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Contact_organizationId_email_key" ON "Contact"("organizationId", "email");

CREATE INDEX "Role_organizationId_idx" ON "Role"("organizationId");
CREATE INDEX "Permission_organizationId_idx" ON "Permission"("organizationId");
CREATE INDEX "Permission_roleId_idx" ON "Permission"("roleId");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX "User_roleId_idx" ON "User"("roleId");
CREATE INDEX "PCloudAccount_organizationId_idx" ON "PCloudAccount"("organizationId");
CREATE INDEX "PCloudAccount_status_idx" ON "PCloudAccount"("status");
CREATE INDEX "PCloudFile_organizationId_idx" ON "PCloudFile"("organizationId");
CREATE INDEX "PCloudFile_pcloudAccountId_idx" ON "PCloudFile"("pcloudAccountId");
CREATE INDEX "Contact_organizationId_idx" ON "Contact"("organizationId");
CREATE INDEX "Contact_email_idx" ON "Contact"("email");
CREATE INDEX "ContactList_organizationId_idx" ON "ContactList"("organizationId");
CREATE INDEX "ContactListMember_contactListId_idx" ON "ContactListMember"("contactListId");
CREATE INDEX "ImportJob_organizationId_idx" ON "ImportJob"("organizationId");
CREATE INDEX "Template_organizationId_idx" ON "Template"("organizationId");
CREATE INDEX "Campaign_organizationId_idx" ON "Campaign"("organizationId");
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");
CREATE INDEX "CampaignRecipient_campaignId_idx" ON "CampaignRecipient"("campaignId");
CREATE INDEX "CampaignRecipient_status_idx" ON "CampaignRecipient"("status");
CREATE INDEX "Automation_organizationId_idx" ON "Automation"("organizationId");
CREATE INDEX "AutomationVersion_organizationId_idx" ON "AutomationVersion"("organizationId");
CREATE INDEX "AutomationVersion_automationId_idx" ON "AutomationVersion"("automationId");
CREATE INDEX "AutomationJob_organizationId_idx" ON "AutomationJob"("organizationId");
CREATE INDEX "PCloudShareExecution_organizationId_idx" ON "PCloudShareExecution"("organizationId");
CREATE INDEX "PCloudShareExecution_campaignId_idx" ON "PCloudShareExecution"("campaignId");
CREATE INDEX "PCloudShareExecution_pcloudAccountId_idx" ON "PCloudShareExecution"("pcloudAccountId");
CREATE INDEX "PCloudShareExecution_recipientEmail_idx" ON "PCloudShareExecution"("recipientEmail");
CREATE INDEX "PCloudShareExecution_status_idx" ON "PCloudShareExecution"("status");
CREATE INDEX "ErrorLog_organizationId_idx" ON "ErrorLog"("organizationId");
CREATE INDEX "ErrorLog_code_idx" ON "ErrorLog"("code");
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

ALTER TABLE "Role" ADD CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Permission" ADD CONSTRAINT "Permission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PCloudAccount" ADD CONSTRAINT "PCloudAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PCloudFile" ADD CONSTRAINT "PCloudFile_organizationId_fkey" FOREIGN KEY ("pcloudAccountId") REFERENCES "PCloudAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactList" ADD CONSTRAINT "ContactList_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactListMember" ADD CONSTRAINT "ContactListMember_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactListMember" ADD CONSTRAINT "ContactListMember_contactListId_fkey" FOREIGN KEY ("contactListId") REFERENCES "ContactList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Template" ADD CONSTRAINT "Template_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_pcloudAccountId_fkey" FOREIGN KEY ("pcloudAccountId") REFERENCES "PCloudAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_pcloudFileId_fkey" FOREIGN KEY ("pcloudFileId") REFERENCES "PCloudFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_contactListId_fkey" FOREIGN KEY ("contactListId") REFERENCES "ContactList"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignRecipient" ADD CONSTRAINT "CampaignRecipient_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Automation" ADD CONSTRAINT "Automation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationVersion" ADD CONSTRAINT "AutomationVersion_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationJob" ADD CONSTRAINT "AutomationJob_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "Automation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PCloudShareExecution" ADD CONSTRAINT "PCloudShareExecution_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PCloudShareExecution" ADD CONSTRAINT "PCloudShareExecution_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PCloudShareExecution" ADD CONSTRAINT "PCloudShareExecution_pcloudAccountId_fkey" FOREIGN KEY ("pcloudAccountId") REFERENCES "PCloudAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PCloudShareExecution" ADD CONSTRAINT "PCloudShareExecution_pcloudFileId_fkey" FOREIGN KEY ("pcloudFileId") REFERENCES "PCloudFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ErrorLog" ADD CONSTRAINT "ErrorLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
