/**
 * Smoke-send updated certification rejection + Refurb #1 eligibility emails.
 * Does NOT change production recipient logic beyond calling the email helpers.
 *
 * Usage:
 *   node scripts/smoke-rejection-and-refurb-eligible-emails.js
 *   node scripts/smoke-rejection-and-refurb-eligible-emails.js --to=you@example.com
 */
'use strict';

require('dotenv').config();

const emailService = require('../src/utils/email.util');

const TO =
  process.argv.find((a) => a.startsWith('--to='))?.slice(5) ||
  'ranjith@thinktreemedia.in';

const fy = emailService.getCurrentFinancialYearLabel();

const sample = {
  partnerName: 'Smoke Test Partner Org',
  centerName: 'Smoke Test Center',
  batchNumber: 'SMOKE-BATCH-2026-01',
  assessmentDate: '2026-07-15',
  requestId: 'smoke-cert-reject-upload-id',
  rejectionReason: 'Incomplete trainee details in the submission.',
  remarks: 'Please correct the details and submit a new request.',
  financialYear: fy,
};

async function main() {
  console.log('\n📧 Rejection + Refurb #1 smoke send\n');
  console.log(`To: ${TO}`);
  console.log(`FY label: ${fy}\n`);

  let passed = 0;
  let failed = 0;

  const sends = [
    {
      label: 'Certification Rejection (new-request wording)',
      subject: `SEIF: Certification Request Rejected — ${sample.centerName}`,
      run: () =>
        emailService.sendCertificationRejectionEmail({
          toEmail: TO,
          recipientName: sample.partnerName,
          ...sample,
        }),
    },
    {
      label: 'Refurb #1 — Eligible partner notification',
      subject: `Submission of Refurbishment & Upgradation detail for FY ${fy}`,
      run: () =>
        emailService.sendRefurbishmentEligiblePartnerEmail({
          toEmail: TO,
          recipientName: sample.partnerName,
          partnerName: sample.partnerName,
          centerName: sample.centerName,
          financialYear: fy,
        }),
    },
  ];

  for (const item of sends) {
    try {
      const result = await item.run();
      if (result?.skipped) {
        console.log(`  ⚠️  SKIPPED ${item.label}`);
        failed += 1;
        continue;
      }
      console.log(`  ✅ SENT ${item.label}`);
      console.log(`     subject: ${item.subject}`);
      console.log(`     messageId: ${result?.messageId || '—'}`);
      passed += 1;
    } catch (err) {
      console.log(`  ❌ FAIL  ${item.label}: ${err.message}`);
      failed += 1;
    }
  }

  console.log(`\nResult: ${passed} sent, ${failed} failed\n`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
