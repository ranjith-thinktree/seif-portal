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
}

module.exports = new EmailService();
