const nodemailer = require('nodemailer');
const crypto = require('crypto');

/**
 * Email Service for Partner Onboarding and Notifications
 */
class EmailService {
  constructor() {
    // Initialize transporter (configure with your SMTP settings)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    this.fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@seif.org';
    this.fromName = process.env.SMTP_FROM_NAME || 'SEIF Portal';
    this.portalUrl = process.env.PORTAL_URL || 'http://localhost:5173';
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
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
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
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
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
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
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
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
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

    const info = await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromEmail}>`,
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

  /**
   * Email center spoke person with ESSCI step 1 assessment access details.
   */
  async sendCertificationSpokeStep1Email({
    toEmail,
    recipientName,
    partnerName,
    centerName,
    batchNumber,
    batchStartDate,
    batchEndDate,
    assessmentDate,
    responseLink,
    responseId,
    responsePassword,
    qrCodePath,
    qrCodeName,
  }) {
    if (!toEmail) return { success: false, skipped: true };

    const path = require('path');
    const fs = require('fs');

    const esc = (value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const fmtDate = (value) => {
      if (!value) return '—';
      try {
        return new Date(value).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      } catch {
        return '—';
      }
    };

    const safeName = esc(recipientName || 'Center Spoke Person');
    const partner = esc(partnerName || '—');
    const center = esc(centerName || 'your center');
    const batch = esc(batchNumber || '—');
    const subject = `SEIF: Assessment Access Details — ${centerName || 'Center'}`;

    const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
    const attachments = [];
    let qrHtml = '';

    if (qrCodePath && fs.existsSync(qrCodePath)) {
      const ext = path.extname(qrCodePath).toLowerCase();
      const filename = qrCodeName || path.basename(qrCodePath);
      const attachment = { filename, path: qrCodePath };

      if (IMAGE_EXTS.includes(ext)) {
        attachment.cid = 'essci-qrcode';
        attachments.push(attachment);
        qrHtml = `
          <div style="margin-top:20px;text-align:center;">
            <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#374151;">Assessment QR Code</p>
            <img src="cid:essci-qrcode" alt="Assessment QR Code" style="max-width:220px;height:auto;border:1px solid #e5e7eb;border-radius:8px;padding:8px;background:#fff;" />
          </div>`;
      } else {
        attachments.push(attachment);
        qrHtml = `
          <div style="margin-top:16px;padding:12px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
            <p style="margin:0;font-size:13px;color:#166534;">
              <strong>QR Code:</strong> Attached as <strong>${esc(filename)}</strong>
            </p>
          </div>`;
      }
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6; margin: 0; background: #f3f4f6; }
          .container { max-width: 640px; margin: 0 auto; padding: 24px 16px; }
          .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
          .header { background: #009530; color: #ffffff; padding: 20px 24px; }
          .header h1 { margin: 0; font-size: 20px; font-weight: 700; }
          .header p { margin: 6px 0 0; font-size: 13px; opacity: 0.92; }
          .body { padding: 24px; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 12px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #6b7280; margin: 0 0 10px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
          .item-label { font-size: 12px; color: #6b7280; margin: 0 0 2px; }
          .item-value { font-size: 14px; color: #111827; margin: 0; font-weight: 600; word-break: break-word; }
          .access-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; }
          .access-row { margin: 0 0 10px; font-size: 14px; }
          .access-row:last-child { margin-bottom: 0; }
          .access-label { display: inline-block; min-width: 88px; font-weight: 700; color: #374151; }
          .access-value { color: #111827; word-break: break-all; }
          .link { color: #009530; text-decoration: none; font-weight: 600; }
          .footer { padding: 0 24px 24px; font-size: 12px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="card">
            <div class="header">
              <h1>Assessment Access Details</h1>
              <p>ESSCI has shared certification assessment access for your center batch.</p>
            </div>
            <div class="body">
              <p style="margin-top:0;">Hello <strong>${safeName}</strong>,</p>
              <p style="margin-bottom:20px;">
                Please use the details below for <strong>${center}</strong> (batch <strong>${batch}</strong>).
              </p>

              <div class="section">
                <p class="section-title">Batch Details</p>
                <div class="grid">
                  <div>
                    <p class="item-label">Partner</p>
                    <p class="item-value">${partner}</p>
                  </div>
                  <div>
                    <p class="item-label">Center</p>
                    <p class="item-value">${center}</p>
                  </div>
                  <div>
                    <p class="item-label">Batch</p>
                    <p class="item-value">${batch}</p>
                  </div>
                  <div>
                    <p class="item-label">Assessment Date</p>
                    <p class="item-value">${fmtDate(assessmentDate)}</p>
                  </div>
                  <div>
                    <p class="item-label">Batch Start</p>
                    <p class="item-value">${fmtDate(batchStartDate)}</p>
                  </div>
                  <div>
                    <p class="item-label">Batch End</p>
                    <p class="item-value">${fmtDate(batchEndDate)}</p>
                  </div>
                </div>
              </div>

              <div class="section">
                <p class="section-title">Assessment Login</p>
                <div class="access-box">
                  ${responseLink ? `<p class="access-row"><span class="access-label">Link</span><span class="access-value"><a class="link" href="${esc(responseLink)}">${esc(responseLink)}</a></span></p>` : ''}
                  ${responseId ? `<p class="access-row"><span class="access-label">ID</span><span class="access-value">${esc(responseId)}</span></p>` : ''}
                  ${responsePassword ? `<p class="access-row"><span class="access-label">Password</span><span class="access-value">${esc(responsePassword)}</span></p>` : ''}
                </div>
                ${qrHtml}
              </div>
            </div>
            <div class="footer">This is an automated email from SEIF Portal. Please do not reply.</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = [
      `Hello ${recipientName || 'Center Spoke Person'},`,
      '',
      `ESSCI has shared assessment access details for ${centerName || 'your center'} (batch ${batchNumber || 'N/A'}).`,
      '',
      'Batch Details',
      `Partner: ${partnerName || '—'}`,
      `Center: ${centerName || '—'}`,
      `Batch: ${batchNumber || '—'}`,
      `Assessment Date: ${fmtDate(assessmentDate)}`,
      `Batch Start: ${fmtDate(batchStartDate)}`,
      `Batch End: ${fmtDate(batchEndDate)}`,
      '',
      'Assessment Login',
      responseLink ? `Link: ${responseLink}` : '',
      responseId ? `ID: ${responseId}` : '',
      responsePassword ? `Password: ${responsePassword}` : '',
      qrCodePath ? `QR Code: ${attachments.length ? 'attached to this email' : 'not available'}` : '',
      '',
      'This is an automated email from SEIF Portal.',
    ]
      .filter((line) => line !== '')
      .join('\n');

    const info = await this.transporter.sendMail({
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: toEmail,
      subject,
      text,
      html,
      attachments,
    });

    return { success: true, messageId: info.messageId };
  }
}

module.exports = new EmailService();
