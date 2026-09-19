import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY && !!process.env.EMAIL_FROM;
}

export async function sendEmail(to: string, subject: string, html: string, text?: string): Promise<{ sent: boolean; error?: string }> {
  const client = getResendClient();
  if (!client) {
    const reason = !process.env.RESEND_API_KEY ? 'RESEND_API_KEY not set' : 'Unknown initialization failure';
    console.warn(`[Email] Resend not configured (${reason}), skipping email to domain: ${to.split('@')[1] || 'unknown'}`);
    return { sent: false, error: reason };
  }

  const from = process.env.EMAIL_FROM!;
  const recipientDomain = to.split('@')[1] || 'unknown';

  console.log(`[Email] Sending "${subject}" to domain: ${recipientDomain}`);

  try {
    const result = await client.emails.send({
      from,
      to: [to],
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });

    if (result.error) {
      const errorMsg = result.error.message || 'Unknown Resend API error';
      console.error(`[Email] Resend API error for domain ${recipientDomain}: ${errorMsg}`);
      return { sent: false, error: errorMsg };
    }

    console.log(`[Email] Email sent successfully to domain: ${recipientDomain}, id: ${result.data?.id || 'unknown'}`);
    return { sent: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Email] Unexpected error sending to domain ${recipientDomain}: ${errorMsg}`);
    return { sent: false, error: errorMsg };
  }
}

export async function sendOTPEmail(email: string, otp: string, type: 'signup' | 'reset' | 'verify'): Promise<{ sent: boolean; error?: string }> {
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

  return await sendEmail(email, subjects[type], html, text);
}
