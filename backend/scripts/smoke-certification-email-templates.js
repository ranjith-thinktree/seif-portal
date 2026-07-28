/**
 * Smoke-send certification email templates to a single inbox for visual QA.
 * Does NOT change production recipient logic.
 *
 * Usage:
 *   node scripts/smoke-certification-email-templates.js
 *   node scripts/smoke-certification-email-templates.js --to=you@example.com
 */
'use strict';

require('dotenv').config();

const emailService = require('../src/utils/email.util');

const TO =
  process.argv.find((a) => a.startsWith('--to='))?.slice(5) ||
  'ranjith@thinktreemedia.in';

const sample = {
  partnerName: 'Smoke Test Partner Org',
  centerName: 'Smoke Test Center',
  batchNumber: 'SMOKE-BATCH-2026-01',
  assessmentDate: '2026-07-15',
  requestId: 'smoke-cert-email-upload-id',
  rejectionReason: 'Incomplete trainee details in the submission.',
  remarks: 'Please correct and resubmit the same request.',
};

const sends = [
  {
    label: '#1 Admin — Assessment Request Received',
    subjectExpected: 'Assessment Request Received',
    run: () =>
      emailService.sendCertificationAssessmentRequestAdminEmail({
        toEmail: TO,
        recipientName: 'Admin',
        ...sample,
      }),
  },
  {
    label: '#2 Partner — Assessment Request Approved',
    subjectExpected: 'Assessment Request Approved',
    run: () =>
      emailService.sendCertificationAssessmentApprovedPartnerEmail({
        toEmail: TO,
        recipientName: sample.partnerName,
        ...sample,
      }),
  },
  {
    label: '#3 ESSCI — Approved Assessment Notification',
    subjectExpected: 'Approved Assessment Notification',
    run: () =>
      emailService.sendCertificationApprovedEssciEmail({
        toEmail: TO,
        recipientName: 'ESSCI Team',
        ...sample,
      }),
  },
  {
    label: '#4a Admin — Results & Certificates Uploaded',
    subjectExpected: 'Assessment Completed – Results & Certificates Uploaded',
    run: () =>
      emailService.sendCertificationCertificatesReadyAdminEmail({
        toEmail: TO,
        recipientName: 'Admin',
        ...sample,
      }),
  },
  {
    label: '#4b Partner — Results & Certificates Available',
    subjectExpected: 'Assessment Completed – Results & Certificates Available',
    run: () =>
      emailService.sendCertificationCertificatesReadyPartnerEmail({
        toEmail: TO,
        recipientName: sample.partnerName,
        ...sample,
      }),
  },
  {
    label: 'Rejection — Certification Request Rejected (kept as-is)',
    subjectExpected: `SEIF: Certification Request Rejected — ${sample.centerName}`,
    run: () =>
      emailService.sendCertificationRejectionEmail({
        toEmail: TO,
        recipientName: sample.partnerName,
        ...sample,
      }),
  },
];

async function main() {
  console.log('\n📧 Certification email template smoke send\n');
  console.log(`To: ${TO}`);
  console.log(`From: ${process.env.SMTP_FROM_NAME || 'SEIF Portal'} <${process.env.SMTP_FROM_EMAIL || 'noreply@seif.org'}>`);
  console.log(`SMTP: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}\n`);

  let passed = 0;
  let failed = 0;

  for (const item of sends) {
    try {
      const result = await item.run();
      if (result?.skipped) {
        console.log(`  ⚠️  SKIPPED ${item.label} (no toEmail)`);
        failed += 1;
        continue;
      }
      console.log(`  ✅ SENT ${item.label}`);
      console.log(`     subject: ${item.subjectExpected}`);
      console.log(`     messageId: ${result?.messageId || '—'}`);
      passed += 1;
    } catch (err) {
      console.log(`  ❌ FAIL  ${item.label}: ${err.message}`);
      failed += 1;
    }
  }

  console.log(`\nResult: ${passed} sent, ${failed} failed\n`);
  console.log('Please check your inbox and confirm the copy looks correct.');
  console.log('Waiting for your OK before Refurbishment email templates.\n');
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
