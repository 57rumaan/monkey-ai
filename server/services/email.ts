export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface EmailService {
  send(to: string, subject: string, html: string, text?: string): Promise<void>;
  sendOTP(email: string, otp: string, type: 'signup' | 'reset' | 'verify'): Promise<void>;
}

function getEmailConfig(): EmailConfig | null {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'noreply@monkey-ai.com';

  if (!host || !user || !pass) {
    return null;
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    from,
  };
}

let emailTransporter: any = null;

async function getTransporter() {
  if (emailTransporter) return emailTransporter;

  const config = getEmailConfig();
  if (!config) {
    return null;
  }

  try {
    const nodemailer = await import('nodemailer');
    emailTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
    await emailTransporter.verify();
    return emailTransporter;
  } catch (error) {
    console.error('Failed to create email transporter:', error);
    return null;
  }
}

export async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<void> {
  const transporter = await getTransporter();
  if (!transporter) {
    console.warn('Email service not configured, skipping email to:', to);
    return;
  }

  const config = getEmailConfig();
  if (!config) return;

  await transporter.sendMail({
    from: config.from,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]*>/g, ''),
  });
}

export async function sendOTPEmail(email: string, otp: string, type: 'signup' | 'reset' | 'verify'): Promise<void> {
  const subjects = {
    signup: 'Verify your MONKEY AI account',
    reset: 'Reset your MONKEY AI password',
    verify: 'Verify your email address',
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">MONKEY AI</h1>
      </div>
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <h2 style="color: #1f2937; margin-top: 0;">${type === 'signup' ? 'Welcome to MONKEY AI!' : type === 'reset' ? 'Password Reset Request' : 'Email Verification'}</h2>
        <p style="color: #4b5563; font-size: 16px;">${type === 'signup' ? 'Thanks for signing up! Please verify your email address to complete your registration.' : type === 'reset' ? 'You requested a password reset. Use the code below to reset your password.' : 'Please verify your email address.'}</p>
        <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: 700; color: #f59e0b; letter-spacing: 8px; font-family: monospace;">${otp}</span>
        </div>
        <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes. If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">MONKEY AI - Professional AI Assistant</p>
      </div>
    </body>
    </html>
  `;

  const text = `
${type === 'signup' ? 'Welcome to MONKEY AI!' : type === 'reset' ? 'Password Reset Request' : 'Email Verification'}

Your verification code is: ${otp}

This code will expire in 10 minutes. If you didn't request this, please ignore this email.

MONKEY AI - Professional AI Assistant
  `;

  await sendEmail(email, subjects[type], html, text);
}

export function isEmailConfigured(): boolean {
  return getEmailConfig() !== null;
}