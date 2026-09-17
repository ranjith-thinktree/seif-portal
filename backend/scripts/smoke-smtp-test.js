/**
 * One-shot SMTP diagnostic + test send.
 *
 * Usage:
 *   node scripts/smoke-smtp-test.js
 *   node scripts/smoke-smtp-test.js your.email@example.com
 *
 * Reads backend/env (or .env). Does NOT print the password.
 */
require('../src/config/loadEnv');

const emailService = require('../src/utils/email.util');

const toEmail = process.argv[2] || process.env.SMTP_TEST_TO || process.env.SMTP_USER;

async function main() {
  console.log('================================================');
  console.log('SEIF SMTP smoke test');
  console.log('================================================');

  // Force fresh transporter so env changes are picked up
  emailService._transporter = null;
  emailService._verified = false;

  const ctx = emailService.getSmtpDebugContext();

  console.log('[1] Loaded SMTP config (safe):');
  console.log(JSON.stringify(ctx, null, 2));

  if (!emailService.isConfigured()) {
    console.error('[FAIL] SMTP_USER / SMTP_PASSWORD missing after parse.');
    process.exit(1);
  }

  if (!toEmail) {
    console.error('[FAIL] Pass a recipient: node scripts/smoke-smtp-test.js you@example.com');
    process.exit(1);
  }

  console.log(`[2] Verifying SMTP connection to ${ctx.host}:${ctx.port} ...`);
  try {
    await emailService.ensureReady();
    console.log('[OK] SMTP verify succeeded');
  } catch (error) {
    console.error('[FAIL] SMTP verify failed');
    console.error(error.message || error);
    process.exit(1);
  }

  console.log(`[3] Sending one test email to ${toEmail} ...`);
  try {
    const info = await emailService.sendConfiguredMail({
      to: toEmail,
      subject: 'SEIF Portal SMTP smoke test',
      text: `SMTP smoke test at ${new Date().toISOString()}\nHost=${ctx.host}\nPort=${ctx.port}\nSecure=${ctx.secure}`,
      html: `<p>SMTP smoke test at <b>${new Date().toISOString()}</b></p><p>Host=${ctx.host}, Port=${ctx.port}, Secure=${ctx.secure}</p>`,
    });
    console.log('[OK] sendMail accepted by server');
    console.log(
      JSON.stringify(
        {
          messageId: info.messageId,
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response,
        },
        null,
        2
      )
    );
    console.log('================================================');
    console.log('Done. Check the inbox (and spam) for the test mail.');
    process.exit(0);
  } catch (error) {
    console.error('[FAIL] sendMail failed');
    console.error(error.message || error);
    process.exit(1);
  }
}

main();
