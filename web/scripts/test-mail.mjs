import nodemailer from 'nodemailer';

const to = process.argv[2];
if (!to) {
  console.error('Usage: node --env-file=.env.local scripts/test-mail.mjs you@gmail.com');
  process.exit(1);
}

const t = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER?.trim(),
    pass: process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, ''),
  },
});

try {
  await t.verify();
  const info = await t.sendMail({
    from: `"Hope, Inc. ERP" <${process.env.GMAIL_USER}>`,
    to,
    subject: 'Hope ERP mail test',
    text: 'Kung nababasa mo ito, gumagana ang Gmail sender.',
  });
  console.log('SENT:', info.accepted, info.messageId);
} catch (e) {
  console.error('FAILED:', e.message);
}