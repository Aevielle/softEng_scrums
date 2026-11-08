import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashToken } from '@/lib/auth/reset';
import { validatePassword } from '@/lib/auth/password';

const INVALID_LINK = {
  code: 'INVALID_LINK',
  message: 'This reset link is invalid, expired, or already used.',
};

const serverError = () =>
  NextResponse.json(
    { code: 'SERVER', message: 'Could not update password. Please request a new link.' },
    { status: 500 }
  );

export async function POST(req: Request) {
  try {
    const { token, password, confirm } = await req.json().catch(() => ({}));

    if (!token || typeof token !== 'string') {
      return NextResponse.json(INVALID_LINK, { status: 400 });
    }

    // Validate BEFORE using up the token, so typos don't burn the link
    if (typeof password !== 'string') {
      return NextResponse.json(
        { code: 'WEAK', message: 'Please enter a new password.' }, { status: 400 });
    }
    const weak = validatePassword(password);
    if (weak) return NextResponse.json({ code: 'WEAK', message: weak }, { status: 400 });
    if (password !== confirm) {
      return NextResponse.json(
        { code: 'MISMATCH', message: 'Passwords do not match.' }, { status: 400 });
    }

    // Hash first, so a hashing failure can't burn the token
    const hash = await bcrypt.hash(password, 12);
    const tokenHash = hashToken(token);

    // Atomic "use once": only one request can flip is_used from false to true
    const { data: row, error: claimError } = await supabaseAdmin
      .from('password_reset_tokens')
      .update({ is_used: true })
      .eq('token_hash', tokenHash)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .select('user_id')
      .maybeSingle();

    if (claimError) {
      console.error('[reset-password] token claim failed:', claimError.message, claimError.code);
      return serverError();
    }
    if (!row) return NextResponse.json(INVALID_LINK, { status: 400 });

    const { error: updateError } = await supabaseAdmin
      .from('app_user')
      .update({ password_hash: hash, must_change_password: false })
      .eq('user_id', row.user_id);

    if (updateError) {
      console.error('[reset-password] password update failed:', updateError.message, updateError.code);

      // Give the link back so the user can retry instead of requesting a new one
      const { error: restoreError } = await supabaseAdmin
        .from('password_reset_tokens')
        .update({ is_used: false })
        .eq('token_hash', tokenHash);
      if (restoreError) {
        console.error('[reset-password] could not restore token:', restoreError.message);
      }

      return serverError();
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[reset-password] unexpected error:', err);
    return serverError();
  }
}