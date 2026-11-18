import { NextResponse, after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { newToken, hashToken, RESET_TTL_MIN } from '@/lib/auth/reset';
import { sendResetEmail } from '@/lib/auth/mailer';
import { siteOrigin } from '@/lib/auth/origin';

const GENERIC = 'If that email is registered, we sent a secure reset link. Check your inbox.';

const sent = () => NextResponse.json({ message: GENERIC, expiresIn: RESET_TTL_MIN * 60 });

const serverError = () =>
  NextResponse.json(
    { code: 'SERVER', title: 'Server Error', message: 'Something went wrong on our side. Please try again.' },
    { status: 500 }
  );

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { code: 'EMPTY', title: 'Empty Field', message: 'Please fill out the forms.' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { code: 'FORMAT', title: 'Wrong Email', message: 'Enter valid email address.' }, { status: 400 });
    }

    // Case-insensitive; "_" and "%" are escaped so they can't act as wildcards
    const pattern = email.replace(/[\\%_]/g, '\\$&');

    const { data: user, error: lookupError } = await supabaseAdmin
      .from('app_user')
      .select('user_id, first_name, email, is_blocked, account_status')
      .ilike('email', pattern)
      .limit(1)
      .maybeSingle();

    // A failed lookup is a server problem, not "no such account"
    if (lookupError) {
      console.error('[forgot-password] user lookup failed:', lookupError.message, lookupError.code);
      return serverError();
    }

    // Unknown, blocked or not-yet-approved account: send nothing, answer the same way
    if (!user || user.is_blocked || user.account_status !== 'active') {
      console.log(
        '[forgot-password] no email sent for', email,
        user ? `(status: ${user.account_status}, blocked: ${user.is_blocked})` : '(no such account)'
      );
      return sent();
    }

    // A new request cancels any older unused links for this user
    const { error: cancelError } = await supabaseAdmin
      .from('password_reset_tokens')
      .update({ is_used: true })
      .eq('user_id', user.user_id)
      .eq('is_used', false);

    if (cancelError) {
      console.error('[forgot-password] could not cancel old links:', cancelError.message, cancelError.code);
      return serverError();
    }

    const token = newToken();
    const { error: insertError } = await supabaseAdmin.from('password_reset_tokens').insert({
      user_id: user.user_id,
      token_hash: hashToken(token),
      expires_at: new Date(Date.now() + RESET_TTL_MIN * 60_000).toISOString(),
      is_used: false,
    });

    if (insertError) {
      console.error('[forgot-password] token insert failed:', insertError.message, insertError.code);
      return serverError();
    }

    const link = `${siteOrigin(req)}/reset-password?token=${token}`;
    const deliver = () => sendResetEmail(user.email, user.first_name || 'there', link, RESET_TTL_MIN);

    if (process.env.NODE_ENV === 'development') {
      // While developing, show a mail problem right away
      try {
        await deliver();
      } catch (err) {
        console.error('[forgot-password] email failed:', err);
        const reason = err instanceof Error ? err.message : String(err);
        return NextResponse.json(
          { code: 'EMAIL', title: 'Email not sent', message: `Email failed: ${reason}` },
          { status: 502 }
        );
      }
    } else {
      // Production: after the response, so response time doesn't reveal anything
      after(async () => {
        try {
          await deliver();
        } catch (err) {
          console.error('[forgot-password] email failed:', err);
        }
      });
    }

    return sent();
  } catch (err) {
    console.error('[forgot-password] unexpected error:', err);
    return serverError();
  }
}
