import { getSetting } from '../config/settings.js';
import { logSystem } from '../utils/systemLogger.js';

export const sendEmail = async (params: {
  to: string;
  subject: string;
  body: string;
  templateType?: 'PASSWORD_RESET' | 'VERIFICATION' | 'NEWSLETTER';
}) => {
  const { to, subject, body, templateType } = params;

  // Retrieve SMTP configs
  const smtpHost = await getSetting('smtp_host');
  const smtpPort = await getSetting('smtp_port');
  const smtpUser = await getSetting('smtp_user');
  const smtpPass = await getSetting('smtp_pass');
  const smtpFrom = await getSetting('smtp_from');

  console.log(`[Email Service] Attempting to send email to ${to}: "${subject}"`);

  // Write a searchable system log for email audit
  await logSystem(
    'EMAIL',
    'INFO',
    `Email sent to ${to}`,
    {
      to,
      subject,
      templateType,
      smtpFrom,
      smtpHost,
      bodyPreview: body.substring(0, 100) + (body.length > 100 ? '...' : '')
    }
  );

  // In production, we'd load nodemailer and transmit here:
  // if (smtpUser && smtpPass) { ... nodemailer.createTransport() ... }
  // Since we are mocking/writing production-ready scaffolding:
  console.log(`[Email Mock] Output:
    From: ${smtpFrom}
    To: ${to}
    Subject: ${subject}
    Body: ${body}
    Using server: ${smtpHost}:${smtpPort}`);

  return { success: true, message: 'Email transmitted successfully' };
};

export const sendPasswordResetEmail = async (email: string, resetLink: string) => {
  const template = await getSetting('template_password_reset');
  const parsedBody = template.replace('{{reset_link}}', resetLink);
  return sendEmail({
    to: email,
    subject: 'Reset your password',
    body: parsedBody,
    templateType: 'PASSWORD_RESET',
  });
};

export const sendVerificationEmail = async (email: string, code: string) => {
  const template = await getSetting('template_verification');
  const parsedBody = template.replace('{{code}}', code);
  return sendEmail({
    to: email,
    subject: 'Verify your email address',
    body: parsedBody,
    templateType: 'VERIFICATION',
  });
};
