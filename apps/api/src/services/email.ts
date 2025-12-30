/**
 * Email Service for MyTeacher
 *
 * Sends transactional emails:
 * - Welcome email with temporary password
 * - Password reset emails
 * - Notification emails
 */

import { Resend } from 'resend';
import { generateUserGuidePDF } from '../lib/pdf-generator.js';

// Environment variables
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@myteacher.app';
const APP_NAME = 'MyTeacher';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Initialize Resend client
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Check if email service is configured
 */
export function isEmailConfigured(): boolean {
  return !!resend;
}

/**
 * Send welcome email with temporary password and PDF guide
 */
export async function sendWelcomeEmailWithPassword(options: {
  to: string;
  userId: string;
  name: string;
  tempPassword: string;
  loginUrl?: string;
}): Promise<EmailResult> {
  const loginUrl = options.loginUrl || `${FRONTEND_URL}/login`;

  if (!resend) {
    console.warn('Resend not configured, skipping welcome email');
    console.log('=== WELCOME EMAIL (Not Sent - No Email Service) ===');
    console.log(`To: ${options.to}`);
    console.log(`Name: ${options.name}`);
    console.log(`Temp Password: ${options.tempPassword}`);
    console.log(`Login URL: ${loginUrl}`);
    console.log('===================================================');
    return { success: false, error: 'Email service not configured' };
  }

  const subject = `Welcome to ${APP_NAME} - Your Account is Ready`;

  const text = `
Welcome to ${APP_NAME}, ${options.name}!

An administrator has created an account for you.

YOUR LOGIN CREDENTIALS
----------------------
Email: ${options.to}
Temporary Password: ${options.tempPassword}

IMPORTANT: You will be required to change your password when you first log in.

Login at: ${loginUrl}

NEXT STEPS
----------
1. Log in with your temporary password
2. Create a new secure password
3. Complete your profile setup (role, school, district)
4. Start managing your students

We've attached a comprehensive user guide (PDF) to help you get started.

If you did not expect this email, please contact your administrator immediately.

Best regards,
The ${APP_NAME} Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0 0 10px 0; font-size: 28px; }
    .header p { margin: 0; opacity: 0.9; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .credentials { background: white; border: 2px solid #4F46E5; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .credentials h3 { margin: 0 0 15px 0; color: #4F46E5; }
    .password-box { font-family: 'Courier New', monospace; font-size: 18px; background: #f3f4f6; padding: 12px 15px; border-radius: 6px; text-align: center; margin: 10px 0; letter-spacing: 1px; font-weight: bold; color: #1f2937; }
    .button { display: inline-block; background: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 20px; }
    .button:hover { background: #4338CA; }
    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 6px 6px 0; }
    .warning strong { color: #92400e; }
    .steps { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .steps h3 { margin: 0 0 15px 0; color: #374151; }
    .steps ol { margin: 0; padding-left: 20px; }
    .steps li { margin-bottom: 8px; color: #4b5563; }
    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
    .attachment-note { background: #ecfdf5; border: 1px solid #10b981; border-radius: 6px; padding: 15px; margin: 20px 0; }
    .attachment-note strong { color: #047857; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome, ${options.name}!</h1>
      <p>Your ${APP_NAME} account has been created</p>
    </div>
    <div class="content">
      <p>An administrator has created an account for you on ${APP_NAME}, your comprehensive special education management platform.</p>

      <div class="credentials">
        <h3>Your Login Credentials</h3>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${options.to}</p>
        <p style="margin: 10px 0 5px 0;"><strong>Temporary Password:</strong></p>
        <div class="password-box">${options.tempPassword}</div>
      </div>

      <div class="warning">
        <strong>Important:</strong> You will be required to change your password when you first log in. Please choose a strong, unique password.
      </div>

      <div class="steps">
        <h3>Next Steps</h3>
        <ol>
          <li>Log in with your temporary password</li>
          <li>Create a new secure password</li>
          <li>Complete your profile setup</li>
          <li>Start managing your students</li>
        </ol>
      </div>

      <div class="attachment-note">
        <strong>User Guide Attached</strong><br>
        We've attached a comprehensive PDF guide to help you get started with all the features available to you.
      </div>

      <center>
        <a href="${loginUrl}" class="button">Login Now</a>
      </center>

      <div class="footer">
        <p>If you did not expect to receive this email, please contact your administrator immediately.</p>
        <p style="margin-top: 15px;">
          Best regards,<br>
          The ${APP_NAME} Team
        </p>
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    // Generate the PDF guide
    const pdfBuffer = await generateUserGuidePDF();

    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: options.to,
      subject,
      text,
      html,
      attachments: [
        {
          filename: `${APP_NAME}-User-Guide.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    console.log(`Welcome email sent to ${options.to}, messageId: ${result.data?.id}`);

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error('Welcome email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send welcome email',
    };
  }
}

/**
 * Send a simple notification email
 */
export async function sendNotificationEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<EmailResult> {
  if (!resend) {
    console.warn('Resend not configured, skipping email');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const result = await resend.emails.send({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
    });

    return {
      success: true,
      messageId: result.data?.id,
    };
  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email',
    };
  }
}
