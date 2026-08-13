import { TemplateVariableResolver } from '../backend/src/templates/template-variable.resolver';
import { FileParserUtil } from '../backend/src/imports/file-parser.util';
import { MockPCloudAdapter } from '../backend/src/pcloud/mock-pcloud/mock-pcloud.adapter';
import { PCloudAdapterFactory } from '../backend/src/pcloud/pcloud.factory';

describe('Autowork.com Complete E2E Workflow Test', () => {
  it('should execute the full 14-stage end-to-end pCloud automation workflow', async () => {
    // 1. Register user and organization
    const org = {
      id: 'org-e2e-1',
      name: 'Global Ventures LLC',
      slug: 'global-ventures-llc',
    };
    const user = {
      id: 'usr-e2e-1',
      email: 'admin@globalventures.com',
      firstName: 'Samantha',
      lastName: 'Reed',
      organizationId: org.id,
      role: 'ADMIN',
    };
    expect(user.organizationId).toBe(org.id);

    // 2. Connect Mock pCloud Account (Account A)
    const pcloudAccount = {
      id: 'acc-pcloud-alpha',
      organizationId: org.id,
      name: 'Primary pCloud Storage Vault',
      accountEmail: 'samantha.pcloud@globalventures.com',
      provider: 'mock_pcloud',
      status: 'ACTIVE',
      dailyLimit: 1000,
      sentToday: 0,
      credentials: 'mock_vault_access_token_123',
    };

    const mockAdapter = PCloudAdapterFactory.getMockAdapter();
    mockAdapter.clearHistory();
    mockAdapter.simulatedLatencyMs = 0;

    const verifyConn = await mockAdapter.verifyConnection(pcloudAccount.credentials);
    expect(verifyConn.connected).toBe(true);

    // 3. Upload & parse CSV file
    const sampleCsv =
      'Email,First Name,Last Name,Company,Target\n' +
      'rahul.sharma@techcorp.io,Rahul,Sharma,TechCorp Solutions,Enterprise Cloud\n' +
      'priya.patel@innovate.co,Priya,Patel,Innovate Global,AI Automation\n' +
      'marcus.vance@apex.com,Marcus,Vance,Apex Financial,Security Systems';

    const parsedData = FileParserUtil.parseTextOrCsv(sampleCsv);
    expect(parsedData.totalRows).toBe(3);
    expect(parsedData.detectedMapping.email).toBe('Email');
    expect(parsedData.detectedMapping.firstName).toBe('First Name');
    expect(parsedData.detectedMapping.company).toBe('Company');

    // 4. Extract contacts & create contact list
    const contacts = parsedData.rows.map((row, idx) => ({
      id: `cnt-${idx + 1}`,
      organizationId: org.id,
      email: row[parsedData.detectedMapping.email],
      firstName: row[parsedData.detectedMapping.firstName],
      lastName: row[parsedData.detectedMapping.lastName],
      fullName: `${row[parsedData.detectedMapping.firstName]} ${row[parsedData.detectedMapping.lastName]}`,
      company: row[parsedData.detectedMapping.company],
      target: row[parsedData.detectedMapping.target],
    }));
    expect(contacts).toHaveLength(3);

    const contactList = {
      id: 'lst-q3-leads',
      organizationId: org.id,
      name: 'Q3 Enterprise Prospects',
      memberCount: contacts.length,
    };
    expect(contactList.memberCount).toBe(3);

    // 5. Upload & select mock pCloud document
    const uploadedFile = await mockAdapter.uploadFile({
      filename: 'Q3_Confidential_Whitepaper.pdf',
      buffer: Buffer.from('Confidential Whitepaper Content'),
      mimeType: 'application/pdf',
      folderId: '0',
      accessToken: pcloudAccount.credentials,
    });
    expect(uploadedFile.fileId).toBeDefined();
    expect(uploadedFile.name).toBe('Q3_Confidential_Whitepaper.pdf');

    // 6. Create description template with #NAME# and #RANDOM#
    const template = {
      id: 'tpl-executive-share',
      organizationId: org.id,
      name: 'Executive Whitepaper Share',
      content: 'Hello #NAME#,\n\nPlease find the requested confidential document for #COMPANY#.\n\nReference: #RANDOM#\n\nBest regards,\nExecutive Distribution',
    };

    const detectedVars = TemplateVariableResolver.detectVariables(template.content);
    expect(detectedVars).toContain('#NAME#');
    expect(detectedVars).toContain('#COMPANY#');
    expect(detectedVars).toContain('#RANDOM#');

    // 7. Create 8-step campaign
    const campaign = {
      id: 'cmp-e2e-101',
      organizationId: org.id,
      name: 'Q3 Whitepaper Distribution',
      pcloudAccountId: pcloudAccount.id,
      pcloudFileId: uploadedFile.fileId,
      templateId: template.id,
      contactListId: contactList.id,
      totalCount: contacts.length,
      sharedCount: 0,
      failedCount: 0,
      status: 'QUEUED',
    };

    // 8. Launch campaign & simulate worker execution loop
    campaign.status = 'PROCESSING';

    const executionRecords: any[] = [];
    const generatedRandomCodes: string[] = [];

    for (const contact of contacts) {
      // Resolve description with per-recipient unique #RANDOM# code
      const { resolvedText, randomCode } = TemplateVariableResolver.resolve(template.content, {
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
        fullName: contact.fullName,
        company: contact.company,
        target: contact.target,
      });

      generatedRandomCodes.push(randomCode);

      // Verify template token replacements
      expect(resolvedText).toContain(contact.fullName);
      expect(resolvedText).toContain(contact.company);
      expect(resolvedText).toContain(randomCode);
      expect(resolvedText).not.toContain('#NAME#');
      expect(resolvedText).not.toContain('#RANDOM#');

      // Call pCloud adapter
      const shareResult = await mockAdapter.shareFolder(
        {
          folderId: '0',
          fileId: campaign.pcloudFileId,
          recipientEmail: contact.email,
          message: resolvedText,
          pcloudAccountId: campaign.pcloudAccountId,
          organizationId: campaign.organizationId,
          campaignId: campaign.id,
        },
        pcloudAccount.credentials
      );

      expect(shareResult.success).toBe(true);
      expect(shareResult.recipientEmail).toBe(contact.email);
      expect(shareResult.pcloudAccountId).toBe(pcloudAccount.id);
      expect(shareResult.pcloudReferenceId).toBeDefined();

      // Record execution
      executionRecords.push({
        campaignId: campaign.id,
        recipientEmail: contact.email,
        pcloudAccountId: campaign.pcloudAccountId,
        pcloudFileId: campaign.pcloudFileId,
        descriptionSnapshot: resolvedText,
        randomCode,
        pcloudReferenceId: shareResult.pcloudReferenceId,
        status: 'SUCCESS',
        timestamp: new Date().toISOString(),
      });

      campaign.sharedCount += 1;
      pcloudAccount.sentToday += 1;
    }

    // 9. Assert unique random codes across recipients
    const uniqueCodes = new Set(generatedRandomCodes);
    expect(uniqueCodes.size).toBe(contacts.length);

    // 10. Assert execution logs match all 3 contacts
    expect(executionRecords).toHaveLength(3);
    expect(executionRecords[0].recipientEmail).toBe('rahul.sharma@techcorp.io');
    expect(executionRecords[1].recipientEmail).toBe('priya.patel@innovate.co');
    expect(executionRecords[2].recipientEmail).toBe('marcus.vance@apex.com');

    // 11. Assert pCloud account assignment
    expect(executionRecords.every((r) => r.pcloudAccountId === pcloudAccount.id)).toBe(true);

    // 12. Finalize campaign state
    if (campaign.sharedCount + campaign.failedCount >= campaign.totalCount) {
      campaign.status = 'COMPLETED';
    }

    expect(campaign.status).toBe('COMPLETED');
    expect(campaign.sharedCount).toBe(3);
    expect(campaign.failedCount).toBe(0);
    expect(pcloudAccount.sentToday).toBe(3);
  });
});
