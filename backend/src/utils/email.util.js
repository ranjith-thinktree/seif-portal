const nodemailer = require('nodemailer');
const crypto = require('crypto');

/**
 * Email Service for Partner Onboarding and Notifications
 */
class EmailService {
  constructor() {
    this._transporter = null;
    this._verified = false;
    this.fromName = process.env.SMTP_FROM_NAME || 'SEIF Portal';
    this.portalUrl =
      process.env.FRONTEND_URL || process.env.PORTAL_URL || 'http://localhost:5173';
  }

  get smtpUser() {
    return (process.env.SMTP_USER || '').trim();
  }

  get smtpPassword() {
    return String(process.env.SMTP_PASSWORD || '').replace(/\s+/g, '');
  }

  get fromEmail() {
    return (process.env.SMTP_FROM_EMAIL || '').trim() || 'noreply@seif.org';
  }

  get fromHeader() {
    return { name: this.fromName, address: this.fromEmail };
  }

  usesGmailSmtp() {
    const host = String(process.env.SMTP_HOST || '').toLowerCase();
    return host.includes('gmail.com') || host.includes('google.com');
  }

  get transporter() {
    if (!this._transporter) {
      const port = parseInt(process.env.SMTP_PORT, 10) || 587;
      const secure =
        String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;
      this._transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port,
        secure,
        auth: this.smtpUser
          ? {
              user: this.smtpUser,
              pass: this.smtpPassword,
            }
          : undefined,
      });
    }
    return this._transporter;
  }

  isConfigured() {
    return Boolean(this.smtpUser && this.smtpPassword);
  }

  async ensureReady() {
    if (!this.isConfigured()) {
      throw new Error(
        'SMTP is not configured. Add SMTP_USER and SMTP_PASSWORD to backend/.env or backend/env, then restart the server.'
      );
    }
    if (this._verified) return;
    await this.transporter.verify();
    this._verified = true;
    console.log(`[email] SMTP verified. Visible From: "${this.fromName}" <${this.fromEmail}>`);
    if (this.usesGmailSmtp() && this.fromEmail.toLowerCase() !== this.smtpUser.toLowerCase()) {
      console.warn(
        `[email] Gmail will still show ${this.smtpUser} in From unless "${this.fromEmail}" is added as a Send mail as alias in that Gmail account (Settings → Accounts → Send mail as).`
      );
    }
  }

  async sendConfiguredMail(options) {
    await this.ensureReady();
    const mail = {
      ...options,
      from: this.fromHeader,
      replyTo: this.fromEmail,
    };
    // Gmail SMTP rejects envelope-from that is not the login mailbox.
    // Other providers should send as SMTP_FROM_EMAIL, not the SMTP login.
    if (!this.usesGmailSmtp()) {
      mail.sender = this.fromEmail;
      mail.envelope = { from: this.fromEmail, to: options.to };
    }
    return this.transporter.sendMail(mail);
  }

  /**
   * Send an editable draft (plain text) wrapped in a simple HTML layout.
   */
  async sendDraftEmail({ toEmail, subject, textBody }) {
    if (!toEmail) return { success: false, skipped: true };
    const esc = (value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    const htmlBody = esc(textBody)
      .split('\n')
      .map((line) => (line.trim() === '' ? '<br />' : `<p style="margin:0 0 10px;">${line}</p>`))
      .join('');
    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;margin:0;background:#f3f4f6;">
        <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <div style="background:#009530;color:#fff;padding:16px 24px;">
              <p style="margin:0;font-size:13px;opacity:.92;">SEIF Portal</p>
              <h1 style="margin:4px 0 0;font-size:18px;">${esc(subject)}</h1>
            </div>
            <div style="padding:24px;">${htmlBody}</div>
            <div style="padding:0 24px 20px;font-size:12px;color:#9ca3af;">This is an automated email from ${esc(this.fromName)}. Please do not reply.</div>
          </div>
        </div>
      </body>
      </html>
    `;
    const info = await this.sendConfiguredMail({
      to: toEmail,
      subject,
      text: textBody,
      html,
    });
    return { success: true, messageId: info.messageId };
  }

  /**
   * Generate random password
   * @param {number} length - Password length
   * @returns {string} Generated password
   */
  generatePassword(length = 12) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';
    let password = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
      password += charset[array[i] % charset.length];
    }

    return password;
  }

  /**
   * Generate password reset token
   * @returns {string} Reset token
   */
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Send partner welcome email with login credentials
   * @param {Object} partnerData - Partner information
   * @param {string} partnerData.email - Partner email
   * @param {string} partnerData.name - Partner name
   * @param {string} partnerData.partnerId - Partner readable ID
   * @param {string} partnerData.tempPassword - Temporary password
   * @returns {Promise<Object>} Email result
   */
  async sendPartnerWelcomeEmail(partnerData) {
    const { email, name, partnerId, tempPassword } = partnerData;

    const subject = 'Welcome to SEIF Portal - Your Account Details';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .credentials { background-color: white; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0; }
          .credential-item { margin: 10px 0; }
          .credential-label { font-weight: bold; color: #1f2937; }
          .credential-value { font-family: monospace; background-color: #f3f4f6; padding: 5px 10px; display: inline-block; }
          .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .steps { background-color: white; padding: 20px; margin: 20px 0; }
          .step { margin: 15px 0; padding-left: 30px; position: relative; }
          .step-number { position: absolute; left: 0; top: 0; background-color: #2563eb; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; }
          .button { background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to SEIF Portal</h1>
          </div>
          
          <div class="content">
            <h2>Dear ${name},</h2>
            <p>Your partner account has been successfully created by our administrator. We're excited to have you on board!</p>
            
            <div class="credentials">
              <h3>Your Login Credentials</h3>
              <div class="credential-item">
                <span class="credential-label">Partner ID:</span>
                <span class="credential-value">${partnerId}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Email:</span>
                <span class="credential-value">${email}</span>
              </div>
              <div class="credential-item">
                <span class="credential-label">Temporary Password:</span>
                <span class="credential-value">${tempPassword}</span>
              </div>
            </div>

            <div class="warning">
              <strong>⚠️ Important Security Notice:</strong>
              <p>For security reasons, you must reset your password within <strong>48 hours</strong>. After this period, your account will be temporarily locked until you contact support.</p>
            </div>

            <div class="steps">
              <h3>How to Reset Your Password:</h3>
              <div class="step">
                <span class="step-number">1</span>
                <strong>Login to Portal:</strong> Visit <a href="${this.portalUrl}/login">${this.portalUrl}/login</a>
              </div>
              <div class="step">
                <span class="step-number">2</span>
                <strong>Use Your Credentials:</strong> Enter your email and temporary password provided above
              </div>
              <div class="step">
                <span class="step-number">3</span>
                <strong>Navigate to Profile:</strong> Click on your profile icon in the top right corner
              </div>
              <div class="step">
                <span class="step-number">4</span>
                <strong>Change Password:</strong> Go to "Change Password" section
              </div>
              <div class="step">
                <span class="step-number">5</span>
                <strong>Set New Password:</strong> Enter your temporary password and create a new secure password
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${this.portalUrl}/login" class="button">Login to Portal</a>
            </div>

            <p><strong>Password Requirements:</strong></p>
            <ul>
              <li>Minimum 8 characters</li>
              <li>At least one uppercase letter</li>
              <li>At least one lowercase letter</li>
              <li>At least one number</li>
              <li>At least one special character (@, #, $, %, &, *)</li>
            </ul>

            <p>If you have any questions or need assistance, please contact our support team.</p>
          </div>

          <div class="footer">
            <p>This is an automated email. Please do not reply to this message.</p>
            <p>&copy; ${new Date().getFullYear()} SEIF Portal. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Welcome to SEIF Portal!

Dear ${name},

Your partner account has been successfully created. Here are your login credentials:

Partner ID: ${partnerId}
Email: ${email}
Temporary Password: ${tempPassword}

IMPORTANT: You must reset your password within 48 hours for security reasons.

How to Reset Your Password:
1. Visit ${this.portalUrl}/login
2. Login with your email and temporary password
3. Click on your profile icon in the top right corner
4. Go to "Change Password" section
5. Enter your temporary password and create a new secure password

Password Requirements:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

If you need assistance, please contact our support team.

This is an automated email. Please do not reply to this message.
    `;

    try {
      const info = await this.sendConfiguredMail({
        to: email,
        subject: subject,
        text: text,
        html: html,
      });

      console.log('Welcome email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }
  }

  /**
   * Send password reset reminder (24 hours before expiry)
   * @param {Object} userData - User information
   * @returns {Promise<Object>} Email result
   */
  async sendPasswordResetReminder(userData) {
    const { email, name } = userData;

    const subject = 'Reminder: Reset Your Password - 24 Hours Remaining';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #f59e0b; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; border: 1px solid #e5e7eb; }
          .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
          .button { background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Password Reset Reminder</h1>
          </div>
          
          <div class="content">
            <h2>Hello ${name},</h2>
            
            <div class="warning">
              <p><strong>Your temporary password will expire in 24 hours!</strong></p>
              <p>Please login and reset your password immediately to avoid account lockout.</p>
            </div>

            <div style="text-align: center;">
              <a href="${this.portalUrl}/login" class="button">Login Now</a>
            </div>

            <p>If you've already reset your password, please disregard this message.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const info = await this.sendConfiguredMail({
        to: email,
        subject: subject,
        html: html,
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending reminder email:', error);
      throw error;
    }
  }

  /**
   * Send center approval email to partner
   * @param {Object} centerData - Center information
   * @param {string} centerData.email - Partner email
   * @param {string} centerData.name - Partner name
   * @param {string} centerData.centerName - Center name
   * @param {string} centerData.centerCode - Center code
   * @returns {Promise<Object>} Email result
   */
  async sendCenterApprovalEmail(centerData) {
    const { email, name, centerName, centerCode } = centerData;

    const subject = 'Center Approved - SEIF Portal';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #10b981; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .center-info { background-color: white; padding: 20px; border-left: 4px solid #10b981; margin: 20px 0; }
          .info-item { margin: 10px 0; }
          .info-label { font-weight: bold; color: #1f2937; }
          .info-value { color: #4b5563; }
          .success-box { background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; }
          .next-steps { background-color: white; padding: 20px; margin: 20px 0; }
          .step { margin: 15px 0; padding-left: 30px; position: relative; }
          .step-number { position: absolute; left: 0; top: 0; background-color: #10b981; color: white; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; }
          .button { background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Center Approved!</h1>
          </div>
          
          <div class="content">
            <h2>Dear ${name},</h2>
            
            <div class="success-box">
              <p><strong>Great news!</strong> Your center has been approved by our administrator and is now active in the SEIF Portal.</p>
            </div>
            
            <div class="center-info">
              <h3>Center Details</h3>
              <div class="info-item">
                <span class="info-label">Center Name:</span>
                <span class="info-value">${centerName}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Center Code:</span>
                <span class="info-value">${centerCode}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Status:</span>
                <span class="info-value" style="color: #10b981; font-weight: bold;">Active & Approved</span>
              </div>
            </div>

            <div class="next-steps">
              <h3>What's Next?</h3>
              <div class="step">
                <span class="step-number">1</span>
                <div>
                  <strong>Upload Student Data</strong>
                  <p>You can now upload student data for this center using the Upload page.</p>
                </div>
              </div>
              <div class="step">
                <span class="step-number">2</span>
                <div>
                  <strong>Manage Batches</strong>
                  <p>Create and manage batches for your approved center.</p>
                </div>
              </div>
              <div class="step">
                <span class="step-number">3</span>
                <div>
                  <strong>View Data</strong>
                  <p>Access and manage your center's data through the Data Management page.</p>
                </div>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${this.portalUrl}/partner/centers" class="button">View My Centers</a>
            </div>

            <p>If you have any questions, please contact the administrator.</p>
          </div>

          <div class="footer">
            <p>This is an automated message from SEIF Portal.</p>
            <p>&copy; 2024 SEIF. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const info = await this.sendConfiguredMail({
        to: email,
        subject: subject,
        html: html,
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending center approval email:', error);
      throw error;
    }
  }

  /**
   * Current Indian financial year label (April–March), e.g. "2026-27".
   */
  getCurrentFinancialYearLabel(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-based
    const startYear = month >= 3 ? year : year - 1;
    return `${startYear}-${String(startYear + 1).slice(-2)}`;
  }

  /**
   * Email partner organisation when admin marks a center eligible for
   * Refurbishment & Upgradation (template #1).
   */
  async sendRefurbishmentEligiblePartnerEmail({
    toEmail,
    recipientName,
    partnerName,
    centerName,
    financialYear,
  }) {
    if (!toEmail) return { success: false, skipped: true };

    const esc = (value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const fy = financialYear || this.getCurrentFinancialYearLabel();
    const safeName = esc(recipientName || partnerName || 'Partner');
    const center = esc(centerName || 'your center');
    const subject = `Submission of Refurbishment & Upgradation detail for FY ${fy}`;
    const openUrl = this.portalUrl;

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;margin:0;background:#f3f4f6;">
        <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <div style="background:#009530;color:#fff;padding:20px 24px;">
              <h1 style="margin:0;font-size:20px;">Refurbishment &amp; Upgradation</h1>
              <p style="margin:6px 0 0;font-size:13px;opacity:.92;">FY ${esc(fy)} — eligible center notification</p>
            </div>
            <div style="padding:24px;">
              <p style="margin-top:0;">Dear <strong>${safeName}</strong>,</p>
              <p>As part of the <strong>Refurbishment &amp; Upgradation</strong> process for the current year, your center/Centers has been identified as eligible.</p>
              <div style="margin:20px 0;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
                <p style="margin:0 0 8px;"><strong>Financial Year:</strong> ${esc(fy)}</p>
                <p style="margin:0;"><strong>Center:</strong> ${center}</p>
              </div>
              <p style="margin:0 0 16px;">Kindly provide the following details in the portal.</p>
              <p style="margin:0;">
                <a href="${esc(openUrl)}" style="display:inline-block;background:#009530;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">
                  Open SEIF Portal
                </a>
              </p>
              <p style="margin:16px 0 0;">For any queries or assistance, please feel free to contact us.</p>
              <p style="margin:16px 0 0;">Regards,<br /><strong>${esc(this.fromName)}</strong></p>
            </div>
            <div style="padding:0 24px 24px;font-size:12px;color:#9ca3af;">This is an automated email from SEIF Portal.</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = [
      `Dear ${recipientName || partnerName || 'Partner'},`,
      '',
      'As part of the Refurbishment & Upgradation process for the current year, your center/Centers has been identified as eligible.',
      '',
      `Financial Year: ${fy}`,
      `Center: ${centerName || 'your center'}`,
      '',
      'Kindly provide the following details in the portal.',
      '',
      `Open: ${openUrl}`,
      '',
      'For any queries or assistance, please feel free to contact us.',
      '',
      'Regards,',
      this.fromName,
    ].join('\n');

    const info = await this.sendConfiguredMail({
      to: toEmail,
      subject,
      text,
      html,
    });

    return { success: true, messageId: info.messageId };
  }

  /**
   * Send refurbishment eligibility notification email to partner
   * @param {Object} data - Notification data
   * @param {string} data.email - Partner email address
   * @param {string} data.partnerName - Partner organisation name
   * @param {string} data.centerName - Center name
   * @param {string} data.message - Custom message (optional)
   * @returns {Promise<Object>} Email result
   */
  async sendRefurbishmentNotificationEmail({
    email,
    partnerName,
    centerName,
    message,
    packageModifications = null,
  }) {
    const subject = `Refurbishment Notification – ${centerName}`;
    const customMsg =
      message ||
      'Your center is eligible for refurbishment. Please log in to the portal to review and submit your requirements.';

    const packageHtml = packageModifications
      ? RefurbishmentService_buildPackageEmailHtml(packageModifications)
      : '';

    function RefurbishmentService_buildPackageEmailHtml(mods) {
      const sections = [];
      if (mods.removed?.length) {
        sections.push(
          `<p style="margin:8px 0 4px;font-weight:600;">Removed packages</p><ul style="margin:0;padding-left:18px;">${mods.removed
            .map(
              (p) =>
                `<li>${p.package_name || 'Package'}${p.course_name ? ` (${p.course_name})` : ''}</li>`
            )
            .join('')}</ul>`
        );
      }
      if (mods.added?.length) {
        sections.push(
          `<p style="margin:8px 0 4px;font-weight:600;">Added packages</p><ul style="margin:0;padding-left:18px;">${mods.added
            .map(
              (p) =>
                `<li>${p.package_name || 'Package'}${p.course_name ? ` (${p.course_name})` : ''}</li>`
            )
            .join('')}</ul>`
        );
      }
      if (!sections.length) return '';
      return `<div style="margin-top:16px;padding:12px 16px;background:#fff;border-left:4px solid #009530;border-radius:0 8px 8px 0;">${sections.join('')}</div>`;
    }

    const packageText = packageModifications
      ? [
          packageModifications.removed?.length
            ? `Removed packages: ${packageModifications.removed
                .map((p) => `${p.package_name}${p.course_name ? ` (${p.course_name})` : ''}`)
                .join(', ')}`
            : null,
          packageModifications.added?.length
            ? `Added packages: ${packageModifications.added
                .map((p) => `${p.package_name}${p.course_name ? ` (${p.course_name})` : ''}`)
                .join(', ')}`
            : null,
        ]
          .filter(Boolean)
          .join('\n')
      : '';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #009530; color: white; padding: 24px 30px; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 22px; }
          .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
          .info-box { background-color: white; padding: 20px; border-left: 4px solid #009530; margin: 20px 0; border-radius: 0 8px 8px 0; }
          .badge { display: inline-block; background-color: #dcfce7; color: #166534; font-size: 12px; font-weight: bold; padding: 4px 12px; border-radius: 20px; margin-bottom: 12px; }
          .button { display: inline-block; background-color: #009530; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏗️ Refurbishment Notification</h1>
          </div>
          <div class="content">
            <p>Dear <strong>${partnerName}</strong>,</p>
            <div class="info-box">
              <div class="badge">Action Required</div>
              <p style="margin:0; font-size:15px;">${customMsg}</p>
            </div>
            ${packageHtml}
            <table style="width:100%; border-collapse:collapse; margin: 16px 0;">
              <tr>
                <td style="padding:8px 0; color:#6b7280; font-size:13px; width:40%;">Center</td>
                <td style="padding:8px 0; font-weight:600; font-size:13px;">${centerName}</td>
              </tr>
            </table>
            <p style="font-size:14px; color:#4b5563;">Please log in to the SEIF Portal to view the details and submit your response.</p>
            <div style="text-align:center;">
              <a href="${this.portalUrl}" class="button">Open SEIF Portal</a>
            </div>
            <p style="font-size:12px; color:#9ca3af; margin-top:20px;">If you have any questions, please contact your administrator.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from SEIF Portal. Please do not reply.</p>
            <p>&copy; ${new Date().getFullYear()} SEIF. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Dear ${partnerName},

${customMsg}
${packageText ? `\n${packageText}\n` : ''}

Center: ${centerName}

Please log in to the SEIF Portal to view the details and submit your response:
${this.portalUrl}

This is an automated message from SEIF Portal. Please do not reply.
    `;

    try {
      const info = await this.sendConfiguredMail({
        to: email,
        subject,
        text,
        html,
      });
      console.log(
        `[EmailService] Refurbishment notification email sent to ${email}:`,
        info.messageId
      );
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('[EmailService] Error sending refurbishment notification email:', error);
      throw error;
    }
  }

  /**
   * Send report export as email attachment
   * @param {Object} options
   * @param {string} options.toEmail
   * @param {string} options.recipientName
   * @param {string} options.reportName
   * @param {Object} options.attachment
   * @returns {Promise<Object>}
   */
  async sendReportExportEmail({ toEmail, recipientName, reportName, attachment }) {
    const safeRecipientName = recipientName || 'User';
    const safeReportName = reportName || 'Custom Report';

    const subject = `SEIF Report Export: ${safeReportName}`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; }
          .container { max-width: 640px; margin: 0 auto; padding: 24px; }
          .header { border-bottom: 1px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 16px; }
          .title { font-size: 20px; font-weight: 700; color: #111827; margin: 0; }
          .muted { color: #6b7280; font-size: 13px; }
          .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="title">SEIF Report Export</h1>
            <p class="muted">Generated by SEIF Portal</p>
          </div>

          <p>Hello <strong>${safeRecipientName}</strong>,</p>
          <p>Your report export is attached.</p>

          <div class="card">
            <p style="margin:0;"><strong>Report:</strong> ${safeReportName}</p>
            <p style="margin:6px 0 0 0;"><strong>Generated At:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <p class="muted">This is an automated email from SEIF Portal. Please do not reply.</p>
        </div>
      </body>
      </html>
    `;

    const text = `Hello ${safeRecipientName},\n\nYour report export is attached.\n\nReport: ${safeReportName}\nGenerated At: ${new Date().toLocaleString()}\n\nThis is an automated email from SEIF Portal.`;

    const info = await this.sendConfiguredMail({
      to: toEmail,
      subject,
      text,
      html,
      attachments: [
        {
          filename: attachment.filename,
          content: attachment.content,
          contentType: attachment.contentType,
        },
      ],
    });

    return { success: true, messageId: info.messageId };
  }

  formatCertificationEmailDate(value) {
    if (!value) return '—';
    const raw =
      value instanceof Date
        ? value.toISOString().slice(0, 10)
        : String(value).slice(0, 10);
    const parsed = new Date(`${raw}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Email active ADMIN users when a partner submits an assessment request.
   */
  async sendCertificationAssessmentRequestAdminEmail({
    toEmail,
    recipientName,
    partnerName,
    centerName,
    assessmentDate,
    requestId,
  }) {
    if (!toEmail) return { success: false, skipped: true };

    const esc = (value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const safeName = esc(recipientName || 'Admin');
    const partner = esc(partnerName || '—');
    const center = esc(centerName || '—');
    const assessment = esc(this.formatCertificationEmailDate(assessmentDate));
    const openUrl = `${this.portalUrl}/admin/certificates?uploadId=${encodeURIComponent(requestId || '')}`;
    const subject = 'Assessment Request Received';

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;margin:0;background:#f3f4f6;">
        <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <div style="background:#2563eb;color:#fff;padding:20px 24px;">
              <h1 style="margin:0;font-size:20px;">Assessment Request Received</h1>
              <p style="margin:6px 0 0;font-size:13px;opacity:.92;">A partner has submitted a new assessment request for your review.</p>
            </div>
            <div style="padding:24px;">
              <p style="margin-top:0;">Dear <strong>${safeName}</strong>,</p>
              <p>A request has been received from a partner to conduct an assessment on <strong>${assessment}</strong>.</p>
              <p>Please find the details below:</p>
              <div style="margin:20px 0;padding:16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;">
                <p style="margin:0 0 8px;"><strong>Partner Name:</strong> ${partner}</p>
                <p style="margin:0 0 8px;"><strong>Center name:</strong> ${center}</p>
                <p style="margin:0;"><strong>Assessment Date:</strong> ${assessment}</p>
              </div>
              <p style="margin:0 0 16px;">Kindly review the request and take the necessary action.</p>
              <p style="margin:0;">
                <a href="${esc(openUrl)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">
                  Review request
                </a>
              </p>
              <p style="margin:16px 0 0;">Thank you.</p>
            </div>
            <div style="padding:0 24px 24px;font-size:12px;color:#9ca3af;">This is an automated email from SEIF Portal.</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = [
      `Dear ${recipientName || 'Admin'},`,
      '',
      `A request has been received from a partner to conduct an assessment on ${this.formatCertificationEmailDate(assessmentDate)}.`,
      '',
      `Partner Name: ${partnerName || '—'}`,
      `Center name: ${centerName || '—'}`,
      `Assessment Date: ${this.formatCertificationEmailDate(assessmentDate)}`,
      '',
      'Kindly review the request and take the necessary action.',
      '',
      `Review: ${openUrl}`,
      '',
      'Thank you.',
    ].join('\n');

    const info = await this.sendConfiguredMail({
      to: toEmail,
      subject,
      text,
      html,
    });

    return { success: true, messageId: info.messageId };
  }

  /**
   * Confirmation email to the partner after they submit an assessment request.
   */
  async sendCertificationAssessmentSubmittedPartnerEmail({
    toEmail,
    recipientName,
    partnerName,
    centerName,
    batchNumber,
    assessmentDate,
    requestId,
  }) {
    if (!toEmail) return { success: false, skipped: true };

    const esc = (value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const safeName = esc(recipientName || partnerName || 'Partner');
    const partner = esc(partnerName || '—');
    const center = esc(centerName || '—');
    const batch = esc(batchNumber || '—');
    const assessment = esc(this.formatCertificationEmailDate(assessmentDate));
    const openUrl = `${this.portalUrl}/certificates?uploadId=${encodeURIComponent(requestId || '')}`;
    const subject = 'Assessment Request Submitted';

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;margin:0;background:#f3f4f6;">
        <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <div style="background:#009530;color:#fff;padding:20px 24px;">
              <h1 style="margin:0;font-size:20px;">Assessment Request Submitted</h1>
              <p style="margin:6px 0 0;font-size:13px;opacity:.92;">Your request has been received and is pending admin review.</p>
            </div>
            <div style="padding:24px;">
              <p style="margin-top:0;">Dear <strong>${safeName}</strong>,</p>
              <p>Thank you for submitting your request to conduct an assessment. This is a confirmation that we have received the following details:</p>
              <div style="margin:20px 0;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
                <p style="margin:0 0 8px;"><strong>Partner Name:</strong> ${partner}</p>
                <p style="margin:0 0 8px;"><strong>Center Name:</strong> ${center}</p>
                <p style="margin:0 0 8px;"><strong>Batch Name/ID:</strong> ${batch}</p>
                <p style="margin:0;"><strong>Assessment Date:</strong> ${assessment}</p>
              </div>
              <p style="margin:0 0 16px;">You will receive another email once the admin reviews this request.</p>
              <p style="margin:0;">
                <a href="${esc(openUrl)}" style="display:inline-block;background:#009530;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">
                  View in SEIF Portal
                </a>
              </p>
              <p style="margin:16px 0 0;">Regards,<br /><strong>${esc(this.fromName)}</strong></p>
            </div>
            <div style="padding:0 24px 24px;font-size:12px;color:#9ca3af;">This is an automated email from SEIF Portal.</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = [
      `Dear ${recipientName || partnerName || 'Partner'},`,
      '',
      'Thank you for submitting your request to conduct an assessment. This is a confirmation that we have received the following details:',
      '',
      `Partner Name: ${partnerName || '—'}`,
      `Center Name: ${centerName || '—'}`,
      `Batch Name/ID: ${batchNumber || '—'}`,
      `Assessment Date: ${this.formatCertificationEmailDate(assessmentDate)}`,
      '',
      'You will receive another email once the admin reviews this request.',
      '',
      `View: ${openUrl}`,
      '',
      `Regards,`,
      this.fromName,
    ].join('\n');

    const info = await this.sendConfiguredMail({
      to: toEmail,
      subject,
      text,
      html,
    });

    return { success: true, messageId: info.messageId };
  }

  /**
   * Email partner organisation contact when admin approves an assessment request.
   */
  async sendCertificationAssessmentApprovedPartnerEmail({
    toEmail,
    recipientName,
    partnerName,
    centerName,
    batchNumber,
    assessmentDate,
    requestId,
  }) {
    if (!toEmail) return { success: false, skipped: true };

    const esc = (value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const safeName = esc(recipientName || partnerName || 'Partner');
    const assessment = esc(this.formatCertificationEmailDate(assessmentDate));
    const batch = esc(batchNumber || '—');
    const location = esc(centerName || '—');
    const openUrl = `${this.portalUrl}/upload`;
    const subject = 'Assessment Request Approved';

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;margin:0;background:#f3f4f6;">
        <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <div style="background:#009530;color:#fff;padding:20px 24px;">
              <h1 style="margin:0;font-size:20px;">Assessment Request Approved</h1>
              <p style="margin:6px 0 0;font-size:13px;opacity:.92;">Your assessment request has been approved by the admin.</p>
            </div>
            <div style="padding:24px;">
              <p style="margin-top:0;">Dear <strong>${safeName}</strong>,</p>
              <p>We are happy to inform you that your request to conduct an assessment on <strong>${assessment}</strong> has been approved.</p>
              <p><strong>Assessment Details:</strong></p>
              <div style="margin:20px 0;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
                <p style="margin:0 0 8px;"><strong>Assessment Date:</strong> ${assessment}</p>
                <p style="margin:0 0 8px;"><strong>Batch Name/ID:</strong> ${batch}</p>
                <p style="margin:0;"><strong>Location:</strong> ${location}</p>
              </div>
              <p style="margin:0 0 16px;">Please proceed with the necessary preparations. If you have any questions, feel free to contact us.</p>
              <p style="margin:0;">
                <a href="${esc(openUrl)}" style="display:inline-block;background:#009530;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">
                  Open SEIF Portal
                </a>
              </p>
              <p style="margin:16px 0 0;">Thank you.</p>
            </div>
            <div style="padding:0 24px 24px;font-size:12px;color:#9ca3af;">This is an automated email from SEIF Portal.</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = [
      `Dear ${recipientName || partnerName || 'Partner'},`,
      '',
      `We are happy to inform you that your request to conduct an assessment on ${this.formatCertificationEmailDate(assessmentDate)} has been approved.`,
      '',
      'Assessment Details:',
      `Assessment Date: ${this.formatCertificationEmailDate(assessmentDate)}`,
      `Batch Name/ID: ${batchNumber || '—'}`,
      `Location: ${centerName || '—'}`,
      '',
      'Please proceed with the necessary preparations. If you have any questions, feel free to contact us.',
      '',
      `Open: ${openUrl}`,
      '',
      'Thank you.',
    ].join('\n');

    const info = await this.sendConfiguredMail({
      to: toEmail,
      subject,
      text,
      html,
    });

    return { success: true, messageId: info.messageId };
  }

  /**
   * Email partner when admin rejects a certification request.
   */
  async sendCertificationRejectionEmail({
    toEmail,
    recipientName,
    partnerName,
    centerName,
    batchNumber,
    requestId,
    rejectionReason,
    remarks,
  }) {
    if (!toEmail) return { success: false, skipped: true };

    const esc = (value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const subject = `SEIF: Certification Request Rejected — ${centerName || 'Center'}`;
    const reason = esc(rejectionReason || 'No reason provided.');
    const note = remarks ? esc(remarks) : '';
    const safeName = esc(recipientName || 'Partner');
    const center = esc(centerName || '—');
    const batch = esc(batchNumber || '—');
    const ref = esc(requestId || '—');

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;margin:0;background:#f3f4f6;">
        <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <div style="background:#dc2626;color:#fff;padding:20px 24px;">
              <h1 style="margin:0;font-size:20px;">Certification Request Rejected</h1>
              <p style="margin:6px 0 0;font-size:13px;opacity:.92;">Please review the reason and submit a new request with corrected details.</p>
            </div>
            <div style="padding:24px;">
              <p style="margin-top:0;">Hello <strong>${safeName}</strong>,</p>
              <p>Your certification request for <strong>${center}</strong> (batch <strong>${batch}</strong>) was rejected by the admin.</p>
              <div style="margin:20px 0;padding:16px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;">
                <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#991b1b;text-transform:uppercase;">Rejection reason</p>
                <p style="margin:0;color:#7f1d1d;white-space:pre-wrap;">${reason}</p>
                ${note ? `<p style="margin:12px 0 0;color:#7f1d1d;white-space:pre-wrap;"><strong>Remarks:</strong> ${note}</p>` : ''}
              </div>
              <p style="margin:0;">Request reference: <strong>${ref}</strong></p>
              <p style="margin:16px 0 0;">Log in to SEIF, open the Upload page, and submit a new certification request with the corrected information.</p>
            </div>
            <div style="padding:0 24px 24px;font-size:12px;color:#9ca3af;">This is an automated email from SEIF Portal.</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = [
      `Hello ${recipientName || 'Partner'},`,
      '',
      `Your certification request for ${centerName || 'your center'} (batch ${batchNumber || 'N/A'}) was rejected.`,
      '',
      `Reason: ${rejectionReason || 'No reason provided.'}`,
      remarks ? `Remarks: ${remarks}` : '',
      '',
      `Request reference: ${requestId || '—'}`,
      '',
      'Please log in to SEIF and submit a new certification request with corrected details.',
    ]
      .filter(Boolean)
      .join('\n');

    const info = await this.sendConfiguredMail({
      to: toEmail,
      subject,
      text,
      html,
    });

    return { success: true, messageId: info.messageId };
  }

  /**
   * Email ESSCI when admin approves a partner certification request.
   */
  async sendCertificationApprovedEssciEmail({
    toEmail,
    recipientName,
    partnerName,
    centerName,
    batchNumber,
    requestId,
    assessmentDate,
  }) {
    if (!toEmail) return { success: false, skipped: true };

    const esc = (value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const safeName = esc(recipientName || 'ESSCI Team');
    const partner = esc(partnerName || '—');
    const center = esc(centerName || '—');
    const batch = esc(batchNumber || '—');
    const assessment = esc(this.formatCertificationEmailDate(assessmentDate));
    const openUrl = `${this.portalUrl}/requests?uploadId=${encodeURIComponent(requestId || '')}`;

    const subject = 'Approved Assessment Notification';

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;margin:0;background:#f3f4f6;">
        <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <div style="background:#009530;color:#fff;padding:20px 24px;">
              <h1 style="margin:0;font-size:20px;">Approved Assessment Notification</h1>
              <p style="margin:6px 0 0;font-size:13px;opacity:.92;">An assessment request has been approved and is ready for ESSCI action.</p>
            </div>
            <div style="padding:24px;">
              <p style="margin-top:0;">Dear <strong>${safeName}</strong>,</p>
              <p>This is to inform you that the assessment request submitted by <strong>${partner}</strong> has been approved.</p>
              <p><strong>Assessment Details:</strong></p>
              <div style="margin:20px 0;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
                <p style="margin:0 0 8px;"><strong>Partner Name:</strong> ${partner}</p>
                <p style="margin:0 0 8px;"><strong>Center Name:</strong> ${center}</p>
                <p style="margin:0 0 8px;"><strong>Batch Name/ID:</strong> ${batch}</p>
                <p style="margin:0;"><strong>Assessment Date:</strong> ${assessment}</p>
              </div>
              <p style="margin:0 0 16px;">Kindly note the above assessment and take the necessary action from your end. Please reach out using the provided email ID and contact number to complete the process.</p>
              <p style="margin:0;">
                <a href="${esc(openUrl)}" style="display:inline-block;background:#009530;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">
                  Open request
                </a>
              </p>
              <p style="margin:16px 0 0;">Thank you.</p>
            </div>
            <div style="padding:0 24px 24px;font-size:12px;color:#9ca3af;">This is an automated email from SEIF Portal.</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = [
      `Dear ${recipientName || 'ESSCI Team'},`,
      '',
      `This is to inform you that the assessment request submitted by ${partnerName || 'the partner'} has been approved.`,
      '',
      'Assessment Details:',
      `Partner Name: ${partnerName || '—'}`,
      `Center Name: ${centerName || '—'}`,
      `Batch Name/ID: ${batchNumber || '—'}`,
      `Assessment Date: ${this.formatCertificationEmailDate(assessmentDate)}`,
      '',
      'Kindly note the above assessment and take the necessary action from your end.',
      'Please reach out using the provided email ID and contact number to complete the process.',
      '',
      `Open: ${openUrl}`,
      '',
      'Thank you.',
    ].join('\n');

    const info = await this.sendConfiguredMail({
      to: toEmail,
      subject,
      text,
      html,
    });

    return { success: true, messageId: info.messageId };
  }

  /**
   * Email partner / center spoke when ESSCI uploads certificates and result sheet.
   */
  async sendCertificationCertificatesReadyPartnerEmail({
    toEmail,
    recipientName,
    partnerName,
    centerName,
    batchNumber,
    requestId,
    assessmentDate,
  }) {
    if (!toEmail) return { success: false, skipped: true };

    const esc = (value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const safeName = esc(recipientName || partnerName || 'Partner');
    const batch = esc(batchNumber || '—');
    const assessment = esc(this.formatCertificationEmailDate(assessmentDate));
    const openUrl = `${this.portalUrl}/certificates?uploadId=${encodeURIComponent(requestId || '')}`;
    const subject = 'Assessment Completed – Results & Certificates Available';

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;margin:0;background:#f3f4f6;">
        <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <div style="background:#009530;color:#fff;padding:20px 24px;">
              <h1 style="margin:0;font-size:20px;">Assessment Completed</h1>
              <p style="margin:6px 0 0;font-size:13px;opacity:.92;">Results and certificates are now available in SEIF.</p>
            </div>
            <div style="padding:24px;">
              <p style="margin-top:0;">Dear <strong>${safeName}</strong>,</p>
              <p>We are pleased to inform you that the assessment for <strong>${batch}</strong> has been successfully completed by ESSCI.</p>
              <p>The assessment results and certificates have been uploaded and are available for your reference.</p>
              <div style="margin:20px 0;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
                <p style="margin:0 0 8px;"><strong>Batch Name/ID:</strong> ${batch}</p>
                <p style="margin:0;"><strong>Assessment Date:</strong> ${assessment}</p>
              </div>
              <p style="margin:0 0 16px;">Please review the uploaded documents and let us know if you require any assistance.</p>
              <p style="margin:0;">
                <a href="${esc(openUrl)}" style="display:inline-block;background:#009530;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">
                  View certificates
                </a>
              </p>
              <p style="margin:16px 0 0;">Regards,<br /><strong>${esc(this.fromName)}</strong></p>
            </div>
            <div style="padding:0 24px 24px;font-size:12px;color:#9ca3af;">This is an automated email from SEIF Portal.</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = [
      `Dear ${recipientName || partnerName || 'Partner'},`,
      '',
      `We are pleased to inform you that the assessment for ${batchNumber || 'your batch'} has been successfully completed by ESSCI.`,
      '',
      'The assessment results and certificates have been uploaded and are available for your reference.',
      '',
      'Details:',
      `Batch Name/ID: ${batchNumber || '—'}`,
      `Assessment Date: ${this.formatCertificationEmailDate(assessmentDate)}`,
      '',
      'Please review the uploaded documents and let us know if you require any assistance.',
      '',
      `Open: ${openUrl}`,
      '',
      `Regards,`,
      this.fromName,
    ].join('\n');

    const info = await this.sendConfiguredMail({
      to: toEmail,
      subject,
      text,
      html,
    });

    return { success: true, messageId: info.messageId };
  }

  /**
   * Email active ADMIN users when ESSCI uploads certificates.
   */
  async sendCertificationCertificatesReadyAdminEmail({
    toEmail,
    recipientName,
    partnerName,
    centerName,
    batchNumber,
    requestId,
    assessmentDate,
  }) {
    if (!toEmail) return { success: false, skipped: true };

    const esc = (value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const safeName = esc(recipientName || 'Admin');
    const partner = esc(partnerName || '—');
    const center = esc(centerName || '—');
    const batch = esc(batchNumber || '—');
    const assessment = esc(this.formatCertificationEmailDate(assessmentDate));
    const openUrl = `${this.portalUrl}/admin/certificates?uploadId=${encodeURIComponent(requestId || '')}`;
    const subject = 'Assessment Completed – Results & Certificates Uploaded';

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6;margin:0;background:#f3f4f6;">
        <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
            <div style="background:#009530;color:#fff;padding:20px 24px;">
              <h1 style="margin:0;font-size:20px;">Assessment Completed</h1>
              <p style="margin:6px 0 0;font-size:13px;opacity:.92;">ESSCI has uploaded results and certificates for review.</p>
            </div>
            <div style="padding:24px;">
              <p style="margin-top:0;">Dear <strong>${safeName}</strong>,</p>
              <p>This is to inform you that the assessment for <strong>${batch}</strong> has been successfully completed by ESSCI.</p>
              <p>The assessment results and certificates have been uploaded to the designated folder and are now available for review.</p>
              <div style="margin:20px 0;padding:16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;">
                <p style="margin:0 0 8px;"><strong>Partner Name:</strong> ${partner}</p>
                <p style="margin:0 0 8px;"><strong>Center Name:</strong> ${center}</p>
                <p style="margin:0 0 8px;"><strong>Batch Name/ID:</strong> ${batch}</p>
                <p style="margin:0;"><strong>Assessment Date:</strong> ${assessment}</p>
              </div>
              <p style="margin:0 0 16px;">Kindly review the uploaded documents and proceed with the necessary actions.</p>
              <p style="margin:0;">
                <a href="${esc(openUrl)}" style="display:inline-block;background:#009530;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">
                  Review request
                </a>
              </p>
              <p style="margin:16px 0 0;">Regards,<br /><strong>${esc(this.fromName)}</strong></p>
            </div>
            <div style="padding:0 24px 24px;font-size:12px;color:#9ca3af;">This is an automated email from SEIF Portal.</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = [
      `Dear ${recipientName || 'Admin'},`,
      '',
      `This is to inform you that the assessment for ${batchNumber || 'the batch'} has been successfully completed by ESSCI.`,
      '',
      'The assessment results and certificates have been uploaded to the designated folder and are now available for review.',
      '',
      'Details:',
      `Partner Name: ${partnerName || '—'}`,
      `Center Name: ${centerName || '—'}`,
      `Batch Name/ID: ${batchNumber || '—'}`,
      `Assessment Date: ${this.formatCertificationEmailDate(assessmentDate)}`,
      '',
      'Kindly review the uploaded documents and proceed with the necessary actions.',
      '',
      `Open: ${openUrl}`,
      '',
      'Regards,',
      this.fromName,
    ].join('\n');

    const info = await this.sendConfiguredMail({
      to: toEmail,
      subject,
      text,
      html,
    });

    return { success: true, messageId: info.messageId };
  }

}

module.exports = new EmailService();
