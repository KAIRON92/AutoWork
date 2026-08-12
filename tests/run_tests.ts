import { FakeEmailAdapter } from '../automation-modules/email/providers/fake.adapter';
import { PCloudStorageAdapter } from '../backend/src/storage/pcloud.adapter';
import { TemplatesService } from '../backend/src/templates/templates.service';

async function runTests() {
  console.log('🧪 Running Autowork.com Verification Suite...\n');

  // 1. Test Variable Engine
  console.log('1️⃣ Testing Server-Side Variable Resolution Engine...');
  const templateService = new TemplatesService();
  const subject = 'Inquiry for #COMPANY# (#RANDOM#)';
  const body = 'Hello #FIRSTNAME#,\n\nWelcome to #COMPANY#. Ref ID: #RANDOM#';
  const recipient = {
    email: 'sarah.c@cyberdyne.io',
    firstName: 'Sarah',
    lastName: 'Connor',
    company: 'Cyberdyne Systems',
  };
  const resolved = templateService.resolveTemplate(subject, body, recipient);
  
  if (!resolved.subject.includes('Cyberdyne Systems')) throw new Error('Subject #COMPANY# failed');
  if (resolved.subject.includes('#RANDOM#')) throw new Error('Subject #RANDOM# failed');
  if (!resolved.body.includes('Hello Sarah')) throw new Error('Body #FIRSTNAME# failed');
  console.log('   ✅ Variable Resolution Passed: ', resolved.subject);

  // 2. Test Fake Email Provider Adapter
  console.log('\n2️⃣ Testing Fake Email Provider Adapter...');
  const fakeAdapter = new FakeEmailAdapter({ simulatedLatencyMs: 10, successRate: 1.0 });
  const val = await fakeAdapter.validateAccount({ email: 'test@autowork.com' });
  if (!val.valid) throw new Error('Account validation failed');
  
  const dispatch = await fakeAdapter.sendEmail({
    to: { email: 'prospect@acme.com', name: 'Prospect' },
    subject: 'Outreach',
    body: 'Hello',
  });
  if (!dispatch.success || dispatch.statusCode !== 200) throw new Error('Email dispatch failed');
  console.log('   ✅ Fake Email Adapter Passed:', dispatch.responseMessage);

  // 3. Test pCloud Storage Adapter
  console.log('\n3️⃣ Testing pCloud Storage Adapter (Simulation Mode)...');
  const pcloudAdapter = new PCloudStorageAdapter();
  const conn = await pcloudAdapter.verifyConnection();
  if (!conn.connected) throw new Error('pCloud connection failed');
  
  const upload = await pcloudAdapter.uploadFile({
    filename: 'brochure.pdf',
    buffer: Buffer.from('PDF File Contents'),
    mimeType: 'application/pdf',
  });
  if (!upload.fileId || upload.filename !== 'brochure.pdf') throw new Error('pCloud upload failed');
  console.log('   ✅ pCloud Adapter Upload Passed: File ID', upload.fileId);

  console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('❌ Test Failed:', err);
  process.exit(1);
});
