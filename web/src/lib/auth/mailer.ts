import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function settings() {
  // Generic SMTP (Brevo, etc.), or the older Gmail variables
  const host = process.env.SMTP_HOST?.trim() || (process.env.GMAIL_USER ? 'smtp.gmail.com' : '');
  const port = Number(process.env.SMTP_PORT) || (process.env.GMAIL_USER ? 465 : 587);
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER)?.trim();
  const pass = (process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD)?.replace(/\s+/g, '');
  const from = (process.env.MAIL_FROM || process.env.GMAIL_USER)?.trim();

  if (!host || !user || !pass || !from) {
    throw new Error('Mail is not configured: set SMTP_HOST, SMTP_USER, SMTP_PASS and MAIL_FROM in .env.local');
  }
  return { host, port, user, pass, from };
}

function getTransporter() {
  const s = settings();
  transporter ??= nodemailer.createTransport({
    host: s.host,
    port: s.port,
    secure: s.port === 465,
    auth: { user: s.user, pass: s.pass },
  });
  return transporter;
}

const esc = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function sendResetEmail(to: string, name: string, link: string, minutes: number) {
  const t = getTransporter();
  const { from } = settings();

  const info = await t.sendMail({
    from: `"Hope, Inc. ERP" <${from}>`,
    to,
    subject: 'Reset your Hope, Inc. ERP password',
    text:
      `Hi ${name},\n\nUse this link to set a new password. It expires in ${minutes} minutes:\n${link}\n\n` +
      `If you didn't ask for this, you can ignore this email.`,
    html:
      `<div style="font-family:Arial,sans-serif;max-width:480px">` +
      `<h2>Reset your password</h2>` +
      `<p>Hi ${esc(name)},</p>` +
      `<p>Use the button below to set a new password. The link expires in <b>${minutes} minutes</b> and works once.</p>` +
      `<p><a href="${link}" style="display:inline-block;padding:12px 20px;background:#2858d1;color:#fff;` +
      `border-radius:8px;text-decoration:none;font-weight:bold">Set a new password</a></p>` +
      `<p style="color:#666;font-size:12px">If the button doesn't work, paste this into your browser:<br>${link}</p></div>`,
  });

  if (!info.accepted?.length) {
    throw new Error(`Mail server rejected the recipient: ${JSON.stringify(info.rejected)}`);
  }

  console.log('[mail] sent to', info.accepted.join(', '), 'id:', info.messageId);
}