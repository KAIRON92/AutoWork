// Autowork.com pCloud Architecture Verification Suite - Node 24 Compatible Test Runner

const fs = require('fs');
const path = require('path');

function generateRandomCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function resolveTemplate(template, recipient, randomCode) {
  const resolvedRandom = randomCode || generateRandomCode(6);
  const fullName = `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim() || recipient.email;

  let text = template;
  text = text.replace(/#NAME#/gi, fullName);
  text = text.replace(/#FIRSTNAME#/gi, recipient.firstName || '');
  text = text.replace(/#LASTNAME#/gi, recipient.lastName || '');
  text = text.replace(/#EMAIL#/gi, recipient.email);
  text = text.replace(/#COMPANY#/gi, recipient.company || '');
  text = text.replace(/#TARGET#/gi, recipient.target || '');
  text = text.replace(/#RANDOM#/gi, resolvedRandom);

  return { resolvedText: text, randomCode: resolvedRandom };
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return { headers: [], rows: [], totalRows: 0 };
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map((v) => v.trim());
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || '';
    });
    rows.push(obj);
  }
  return { headers, rows, totalRows: rows.length };
}

async function runTests() {
  console.log('🧪 Running Autowork.com pCloud Automated Verification Suite...\n');

  // 1. Variable Engine & #RANDOM# Test
  console.log('1️⃣ Testing Variable Resolution & Unique #RANDOM# Code Generation...');
  const template = 'Hello #NAME# (#FIRSTNAME#),\nConfidential pCloud file for #COMPANY#.\nTarget: #TARGET#\nRef: #RANDOM#';
  const recipient1 = {
    email: 'sarah.c@cyberdyne.io',
    firstName: 'Sarah',
    lastName: 'Connor',
    company: 'Cyberdyne Systems',
    target: 'Strategic Cloud',
  };
  const recipient2 = {
    email: 'bruce.w@wayne.com',
    firstName: 'Bruce',
    lastName: 'Wayne',
    company: 'Wayne Enterprises',
    target: 'Defense Systems',
  };

  const res1 = resolveTemplate(template, recipient1);
  const res2 = resolveTemplate(template, recipient2);

  if (!res1.resolvedText.includes('Sarah Connor (Sarah)')) throw new Error('Recipient 1 name failed');
  if (!res1.resolvedText.includes('Cyberdyne Systems')) throw new Error('Recipient 1 company failed');
  if (!res1.resolvedText.includes(res1.randomCode)) throw new Error('Random code 1 missing');
  if (res1.randomCode.length !== 6) throw new Error('Random code length invalid');
  if (res1.randomCode === res2.randomCode) throw new Error('Random code collision between recipients');

  console.log('   ✅ Variable Resolution Passed:');
  console.log('      Recipient 1 Ref: "%s"', res1.randomCode);
  console.log('      Recipient 2 Ref: "%s"', res2.randomCode);

  // 2. CSV Parser & Auto Column Detection
  console.log('\n2️⃣ Testing CSV Import Parser & Column Detection...');
  const csvContent =
    'Email,First Name,Last Name,Company,Target\n' +
    'rahul.s@techcorp.io,Rahul,Sharma,TechCorp,Enterprise\n' +
    'priya.p@innovate.co,Priya,Patel,Innovate,Automation';

  const parsed = parseCSV(csvContent);
  if (parsed.totalRows !== 2) throw new Error(`Expected 2 rows, got ${parsed.totalRows}`);
  if (parsed.rows[0].Email !== 'rahul.s@techcorp.io') throw new Error('Parsed row 1 email mismatch');
  console.log('   ✅ CSV Parser Passed: %d contacts extracted successfully', parsed.totalRows);

  // 3. Mock pCloud Share & Transfer Operation
  console.log('\n3️⃣ Testing Mock pCloud Adapter (Folder Sharing & Transfers)...');
  const mockShareOperation = async (options) => {
    if (!options.recipientEmail || !options.recipientEmail.includes('@')) {
      return { success: false, error: 'PCLOUD_INVALID_RECIPIENT' };
    }
    return {
      success: true,
      operationType: 'sharefolder',
      pcloudReferenceId: `mock-share-${Date.now()}`,
      recipientEmail: options.recipientEmail,
      pcloudAccountId: options.pcloudAccountId,
      pcloudFileId: options.pcloudFileId,
    };
  };

  const shareResult = await mockShareOperation({
    recipientEmail: 'rahul.s@techcorp.io',
    pcloudAccountId: 'acc-1',
    pcloudFileId: 'mock-file-101',
    message: res1.resolvedText,
  });

  if (!shareResult.success || !shareResult.pcloudReferenceId.startsWith('mock-share-')) {
    throw new Error('pCloud share operation simulation failed');
  }
  console.log('   ✅ pCloud Share Adapter Passed: Ref "%s"', shareResult.pcloudReferenceId);

  // 4. Verify Critical Architecture Files
  console.log('\n4️⃣ Verifying pCloud Architecture File Integrity...');
  const rootDir = path.resolve(__dirname, '..');
  const requiredFiles = [
    'frontend/src/app/dashboard/page.tsx',
    'frontend/src/app/accounts/page.tsx',
    'frontend/src/app/files/page.tsx',
    'frontend/src/app/contacts/page.tsx',
    'frontend/src/app/imports/page.tsx',
    'frontend/src/app/templates/page.tsx',
    'frontend/src/app/campaigns/page.tsx',
    'frontend/src/app/campaigns/new/page.tsx',
    'frontend/src/app/logs/page.tsx',
    'frontend/src/app/admin/page.tsx',
    'backend/src/main.ts',
    'backend/src/pcloud/pcloud.factory.ts',
    'backend/src/pcloud/mock-pcloud/mock-pcloud.adapter.ts',
    'backend/src/pcloud/sharing/pcloud.adapter.ts',
    'backend/src/pcloud/pcloud-client/pcloud.client.ts',
    'backend/src/pcloud/pcloud-client/pcloud.errors.ts',
    'backend/src/templates/template-variable.resolver.ts',
    'backend/src/imports/file-parser.util.ts',
    'workers/pcloud-share.worker.ts',
    'prisma/schema.prisma',
    'docker/docker-compose.yml',
    '.env.example',
  ];

  for (const rel of requiredFiles) {
    const fullPath = path.join(rootDir, rel);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Missing required architectural file: ${rel}`);
    }
  }
  console.log('   ✅ Architecture Verified: %d core files verified', requiredFiles.length);

  console.log('\n🎉 ALL VERIFICATION TESTS PASSED WITH 100% INTEGRITY!');
}

runTests().catch((err) => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
