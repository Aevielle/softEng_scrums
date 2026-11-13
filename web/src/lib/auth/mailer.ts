import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

function settings() {
  // Gmail via OAuth2 (no password is stored)
  const user = process.env.GMAIL_USER?.trim();
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();
  const from = (process.env.MAIL_FROM || user)?.trim();

  if (!user || !clientId || !clientSecret || !refreshToken || !from) {
    throw new Error(
      'Mail is not configured: set GMAIL_USER, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REFRESH_TOKEN in .env.local'
    );
  }
  return { user, clientId, clientSecret, refreshToken, from };
}

function getTransporter() {
  const s = settings();
  transporter ??= nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: s.user,
      clientId: s.clientId,
      clientSecret: s.clientSecret,
      refreshToken: s.refreshToken,
    },
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

export async function sendRegistrationEmail(to: string, name: string, needsApproval: boolean) {
  const t = getTransporter();
  const { from } = settings();

  const next = needsApproval
    ? 'Your account is now waiting for approval by an Admin. You can sign in once it is approved.'
    : 'Your account is ready. You can sign in now.';

  const info = await t.sendMail({
    from: `"Hope, Inc. ERP" <${from}>`,
    to,
    subject: 'We received your Hope, Inc. ERP registration',
    text:
      `Hi ${name},\n\nThanks for registering for Hope, Inc. ERP.\n\n` +
      `Email: ${to}\nRole: User\n\n${next}\n\n` +
      `If you didn't register, you can ignore this email.`,
    html:
      `<div style="font-family:Arial,sans-serif;max-width:480px">` +
      `<h2>Thanks for registering</h2>` +
      `<p>Hi ${esc(name)},</p>` +
      `<p>We received your registration for Hope, Inc. ERP.</p>` +
      `<table style="border-collapse:collapse;margin:12px 0">` +
      `<tr><td style="padding:4px 16px 4px 0;color:#666">Email</td><td><b>${esc(to)}</b></td></tr>` +
      `<tr><td style="padding:4px 16px 4px 0;color:#666">Role</td><td><b>User</b></td></tr>` +
      `<tr><td style="padding:4px 16px 4px 0;color:#666">Status</td>` +
      `<td><b>${needsApproval ? 'Waiting for approval' : 'Active'}</b></td></tr></table>` +
      `<p>${esc(next)}</p>` +
      `<p style="color:#666;font-size:12px">If you didn't register, you can ignore this email.</p></div>`,
  });

  if (!info.accepted?.length) {
    throw new Error(`Mail server rejected the recipient: ${JSON.stringify(info.rejected)}`);
  }

  console.log('[mail] sent to', info.accepted.join(', '), 'id:', info.messageId);
}