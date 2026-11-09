import nodemailer from 'nodemailer';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  const user = process.env.GMAIL_USER?.trim();
  // Ipinapakita ng Google ang app password na may espasyo, tinatanggal natin
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, '');

  if (!user || !pass) {
    throw new Error('GMAIL_USER or GMAIL_APP_PASSWORD is missing in .env.local');
  }

  transporter ??= nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  return transporter;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export async function sendResetEmail(to: string, name: string, link: string, minutes: number) {
  const t = getTransporter(); // throws kapag kulang ang credentials

  const info = await t.sendMail({
    from: `"Hope, Inc. ERP" <${process.env.GMAIL_USER!.trim()}>`,
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
      `<p style="color:#666;font-size:12px">If the button doesn't work, paste this into your browser:<br>${link}</p>` +
      `<p style="color:#666;font-size:12px">If you didn't ask for this, you can ignore this email.</p></div>`,
  });

  // Dapat nakalista ang tatanggap sa "accepted", kung hindi ay hindi ito naipadala
  if (!info.accepted?.length) {
    throw new Error(`Gmail rejected the recipient: ${JSON.stringify(info.rejected)}`);
  }

  console.log('[mail] sent to', info.accepted.join(', '), 'id:', info.messageId);
}