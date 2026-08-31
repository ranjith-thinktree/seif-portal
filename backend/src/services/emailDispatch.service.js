const db = require('../database/connection');
const emailService = require('../utils/email.util');
const { renderTemplate } = require('./emailTemplate.service');

/** Same active-admin set as User Management → Admins (active). */
const ACTIVE_ADMIN_SQL = `
  UPPER(TRIM(COALESCE(role, ''))) IN ('ADMIN', 'SUPER_ADMIN')
  AND LOWER(COALESCE(NULLIF(TRIM(status), ''), 'active')) = 'active'
`;

const uniqueEmails = (rows) => {
  const map = new Map();
  for (const row of rows || []) {
    const email = String(row.email || '').trim();
    if (!email) continue;
    const key = email.toLowerCase();
    if (!map.has(key)) {
      map.set(key, { email, name: row.full_name || row.name || row.contact_name || '' });
    }
  }
  return [...map.values()];
};

async function getActiveAdminUsers() {
  const [rows] = await db.query(
    `SELECT id, email, full_name, role, status
     FROM users
     WHERE ${ACTIVE_ADMIN_SQL}`
  );
  return rows || [];
}

async function getActiveAdminIds() {
  const users = await getActiveAdminUsers();
  return users.map((row) => row.id);
}

async function getAdminRecipients() {
  const users = await getActiveAdminUsers();
  return uniqueEmails(users);
}

async function getEssciRecipients() {
  const [rows] = await db.query(
    `SELECT email, full_name
     FROM users
     WHERE role = 'ESSCI'
       AND LOWER(COALESCE(status, 'active')) = 'active'
       AND email IS NOT NULL AND TRIM(email) <> ''`
  );
  return uniqueEmails(rows);
}

async function getPartnerRecipients(partnerId) {
  if (!partnerId) return [];
  const [users] = await db.query(
    `SELECT email, full_name
     FROM users
     WHERE partner_id = ?
       AND role = 'PARTNER'
       AND LOWER(COALESCE(status, 'active')) = 'active'
       AND email IS NOT NULL AND TRIM(email) <> ''`,
    [partnerId]
  );
  const [partners] = await db.query(
    `SELECT contact_email AS email, contact_person AS full_name, name
     FROM partners WHERE id = ? LIMIT 1`,
    [partnerId]
  );
  return uniqueEmails([...(users || []), ...(partners || [])]);
}

async function sendToRecipients(templateKey, vars, recipients) {
  if (!recipients?.length) {
    console.warn(`[email] ${templateKey}: no recipients`);
    return { sent: 0 };
  }
  const rendered = await renderTemplate(templateKey, {
    yourName: process.env.SMTP_FROM_NAME || 'SEIF Portal',
    adminName: vars.adminName || process.env.SMTP_FROM_NAME || 'SEIF Portal',
    date: vars.date || new Date().toLocaleDateString('en-IN'),
    ...vars,
  });
  const addresses = recipients.map((r) => r.email).join(', ');
  console.log(`[email] ${templateKey} sending to ${recipients.length} recipient(s): ${addresses}`);
  const results = await Promise.allSettled(
    recipients.map((recipient) =>
      emailService.sendDraftEmail({
        toEmail: recipient.email,
        subject: rendered.subject,
        textBody: rendered.body,
      })
    )
  );
  let sent = 0;
  results.forEach((result, index) => {
    const email = recipients[index].email;
    if (result.status === 'fulfilled') {
      sent += 1;
      console.log(`[email] ${templateKey} sent to ${email}`);
    } else {
      console.error(
        `[email] ${templateKey} failed for ${email}:`,
        result.reason?.message || result.reason
      );
    }
  });
  return { sent, subject: rendered.subject, recipients: recipients.map((r) => r.email) };
}

async function sendByAudience(templateKey, vars = {}, options = {}) {
  const { audience, partnerId, extraEmails = [] } = options;
  let recipients = [];
  if (audience === 'admin') {
    recipients = await getAdminRecipients();
    if (!recipients.length) {
      console.warn(
        `[email] ${templateKey}: no active ADMIN/SUPER_ADMIN users with an email address`
      );
    }
  } else if (audience === 'essci') recipients = await getEssciRecipients();
  else if (audience === 'partner') recipients = await getPartnerRecipients(partnerId);
  const extras = uniqueEmails(extraEmails.map((email) => ({ email })));
  const merged = uniqueEmails([...recipients, ...extras]);
  return sendToRecipients(templateKey, vars, merged);
}

function fireEmail(templateKey, vars, options) {
  setImmediate(() => {
    sendByAudience(templateKey, vars, options).catch((error) => {
      console.error(`[email] ${templateKey} dispatch failed:`, error.message);
    });
  });
}

module.exports = {
  ACTIVE_ADMIN_SQL,
  getActiveAdminUsers,
  getActiveAdminIds,
  getAdminRecipients,
  getEssciRecipients,
  getPartnerRecipients,
  sendToRecipients,
  sendByAudience,
  fireEmail,
};
