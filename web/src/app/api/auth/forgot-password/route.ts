import { NextResponse, after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { newToken, hashToken, RESET_TTL_MIN } from '@/lib/auth/reset';
import { sendResetEmail } from '@/lib/auth/mailer';

const GENERIC =
  'If that email is registered, we sent a secure reset link. Check your inbox.';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim().toLowerCase();

  if (!email)
    return NextResponse.json(
      { code: 'EMPTY', message: 'Please fill out the forms.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json(
      { code: 'FORMAT', message: 'Please enter a valid email address.' }, { status: 400 });

  const { data: user } = await supabaseAdmin
    .from('app_user')
    .select('user_id, email, status')
    .eq('email', email)
    .maybeSingle();

  // Unknown email or blocked user: do nothing, but answer exactly the same way.
  if (user && user.status !== 'blocked') {
    // A new request cancels any older unused links for this user
    await supabaseAdmin
      .from('password_reset_tokens')
      .update({ is_used: true })
      .eq('user_id', user.user_id)
      .eq('is_used', false);

    const token = newToken();
    const { error } = await supabaseAdmin.from('password_reset_tokens').insert({
      user_id: user.user_id,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + RESET_TTL_MIN * 60_000).toISOString(),
    });

    if (!error) {
      const base = process.env.APP_URL ?? new URL(req.url).origin;
      const link = `${base}/reset-password?token=${token}`;
      // Runs after the response is sent, so response time doesn't reveal anything
      after(() => sendResetEmail(user.email, link, RESET_TTL_MIN));
    }
  }

  return NextResponse.json({ message: GENERIC, expiresIn: RESET_TTL_MIN * 60 });
}