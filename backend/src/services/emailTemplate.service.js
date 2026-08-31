const db = require('../database/connection');
const DEFAULTS = require('../config/email-templates.defaults');

let tableReady = false;

const render = (text, vars = {}) =>
  String(text || '').replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => {
    const value = vars[key];
    if (value === undefined || value === null || value === '') return '—';
    return String(value);
  });

async function ensureTable() {
  if (tableReady) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS email_templates (
      template_key VARCHAR(120) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(80) NOT NULL,
      audience VARCHAR(40) NOT NULL,
      subject TEXT NOT NULL,
      body MEDIUMTEXT NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  tableReady = true;
}

function defaultByKey(key) {
  return DEFAULTS.find((item) => item.key === key) || null;
}

async function listTemplates() {
  await ensureTable();
  const [rows] = await db.query(
    'SELECT template_key, name, category, audience, subject, body, updated_at FROM email_templates'
  );
  const overrides = new Map((rows || []).map((row) => [row.template_key, row]));
  return DEFAULTS.map((item) => {
    const override = overrides.get(item.key);
    return {
      key: item.key,
      name: item.name,
      category: item.category,
      audience: item.audience,
      subject: override?.subject ?? item.subject,
      body: override?.body ?? item.body,
      isCustomized: Boolean(override),
      updatedAt: override?.updated_at || null,
    };
  });
}

async function getTemplate(key) {
  const all = await listTemplates();
  return all.find((item) => item.key === key) || null;
}

async function saveTemplate(key, { subject, body }) {
  const base = defaultByKey(key);
  if (!base) {
    throw new Error(`Unknown email template: ${key}`);
  }
  await ensureTable();
  await db.query(
    `INSERT INTO email_templates (template_key, name, category, audience, subject, body)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE subject = VALUES(subject), body = VALUES(body), name = VALUES(name),
       category = VALUES(category), audience = VALUES(audience)`,
    [key, base.name, base.category, base.audience, subject, body]
  );
  return getTemplate(key);
}

async function resetTemplate(key) {
  await ensureTable();
  await db.query('DELETE FROM email_templates WHERE template_key = ?', [key]);
  return getTemplate(key);
}

async function renderTemplate(key, vars = {}) {
  const template = await getTemplate(key);
  if (!template) throw new Error(`Unknown email template: ${key}`);
  return {
    ...template,
    subject: render(template.subject, vars),
    body: render(template.body, vars),
  };
}

module.exports = {
  DEFAULTS,
  listTemplates,
  getTemplate,
  saveTemplate,
  resetTemplate,
  renderTemplate,
  render,
};
