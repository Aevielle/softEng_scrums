import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

// Gmail only: an app password, or OAuth2 when the three GMAIL_* OAuth values are set
function settings() {
  const user = process.env.GMAIL_USER?.trim();
  if (!user) throw new Error('GMAIL_USER is missing in .env.local');

  const clientId = process.env.GMAIL_CLIENT_ID?.trim();
  const clientSecret = process.env.GMAIL_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN?.trim();
  const appPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');

  if (clientId && clientSecret && refreshToken) {
    return { user, auth: { type: 'OAuth2' as const, user, clientId, clientSecret, refreshToken } };
  }
  if (appPassword) {
    return { user, auth: { user, pass: appPassword } };
  }

  throw new Error(
    'Set GMAIL_APP_PASSWORD (or GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET and GMAIL_REFRESH_TOKEN) in .env.local'
  );
}

function getTransporter() {
  const s = settings();
  transporter ??= nodemailer.createTransport({ service: 'gmail', auth: s.auth });
  return transporter;
}

const esc = (v: string) =>
  v.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

const appUrl = () => (process.env.APP_URL ?? '').trim().replace(/\/$/, '');

function layout(title: string, bodyHtml: string, button?: { label: string; href: string }) {
  const btn = button
    ? `<p><a href="${button.href}" style="display:inline-block;padding:12px 20px;background:#2858d1;color:#fff;` +
      `border-radius:8px;text-decoration:none;font-weight:bold">${esc(button.label)}</a></p>` +
      `<p style="color:#666;font-size:12px">If the button doesn't work, paste this into your browser:<br>${button.href}</p>`
    : '';
  return `<div style="font-family:Arial,sans-serif;max-width:480px"><h2>${esc(title)}</h2>${bodyHtml}${btn}</div>`;
}

async function deliver(to: string, subject: string, text: string, html: string) {
  const t = getTransporter();
  const { user } = settings();

  const info = await t.sendMail({ from: `"Hope, Inc. ERP" <${user}>`, to, subject, text, html });

  if (!info.accepted?.length) {
    throw new Error(`Mail server rejected the recipient: ${JSON.stringify(info.rejected)}`);
  }
  console.log('[mail] sent to', info.accepted.join(', '), 'id:', info.messageId);
}

export async function sendResetEmail(to: string, name: string, link: string, minutes: number) {
  await deliver(
    to,
    'Reset your Hope, Inc. ERP password',
    `Hi ${name},\n\nUse this link to set a new password. It expires in ${minutes} minutes and works once:\n${link}\n\n` +
      `If you didn't ask for this, you can ignore this email.`,
    layout(
      'Reset your password',
      `<p>Hi ${esc(name)},</p><p>Use the button below to set a new password. The link expires in ` +
        `<b>${minutes} minutes</b> and works once.</p>` +
        `<p style="color:#666;font-size:12px">If you didn't ask for this, you can ignore this email.</p>`,
      { label: 'Set a new password', href: link }
    )
  );
}

export async function sendRegistrationEmail(to: string, name: string, needsApproval: boolean) {
  const next = needsApproval
    ? 'Your account is now waiting for approval by an Admin. You can sign in once it is approved.'
    : 'Your account is ready. You can sign in now.';

  await deliver(
    to,
    'We received your Hope, Inc. ERP registration',
    `Hi ${name},\n\nThanks for registering for Hope, Inc. ERP.\n\n` +
      `Email: ${to}\nRole: User\n\n${next}\n\nIf you didn't register, you can ignore this email.`,
    layout(
      'Thanks for registering',
      `<p>Hi ${esc(name)},</p><p>We received your registration for Hope, Inc. ERP.</p>` +
        `<table style="border-collapse:collapse;margin:12px 0">` +
        `<tr><td style="padding:4px 16px 4px 0;color:#666">Email</td><td><b>${esc(to)}</b></td></tr>` +
        `<tr><td style="padding:4px 16px 4px 0;color:#666">Role</td><td><b>User</b></td></tr>` +
        `<tr><td style="padding:4px 16px 4px 0;color:#666">Status</td>` +
        `<td><b>${needsApproval ? 'Waiting for approval' : 'Active'}</b></td></tr></table>` +
        `<p>${esc(next)}</p>` +
        `<p style="color:#666;font-size:12px">If you didn't register, you can ignore this email.</p>`
    )
  );
}

export async function sendApprovedEmail(to: string, name: string) {
  const url = appUrl();

  await deliver(
    to,
    'Your Hope, Inc. ERP account is approved',
    `Hi ${name},\n\nYour account has been approved. You can now sign in${url ? `:\n${url}` : '.'}`,
    layout(
      'Your account is approved',
      `<p>Hi ${esc(name)},</p><p>Your account has been approved. You can now sign in.</p>`,
      url ? { label: 'Go to Hope, Inc. ERP', href: url } : undefined
    )
  );
}
