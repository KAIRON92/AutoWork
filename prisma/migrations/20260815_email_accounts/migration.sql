CREATE TABLE "EmailAccount" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "accountEmail" TEXT NOT NULL,
  "displayName" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "credentials" TEXT NOT NULL,
  "scopes" TEXT,
  "externalAccountId" TEXT,
  "lastVerifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Campaign" ADD COLUMN "emailAccountId" TEXT;

CREATE UNIQUE INDEX "EmailAccount_organizationId_provider_accountEmail_key" ON "EmailAccount"("organizationId", "provider", "accountEmail");
CREATE INDEX "EmailAccount_organizationId_idx" ON "EmailAccount"("organizationId");
CREATE INDEX "EmailAccount_status_idx" ON "EmailAccount"("status");
CREATE INDEX "Campaign_emailAccountId_idx" ON "Campaign"("emailAccountId");

ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_emailAccountId_fkey" FOREIGN KEY ("emailAccountId") REFERENCES "EmailAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
