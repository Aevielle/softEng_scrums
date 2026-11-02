import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hashToken } from '@/lib/auth/reset';
import { validatePassword } from '@/lib/auth/password';

export async function POST(req: Request) {
  const { token, password, confirm } = await req.json().catch(() => ({}));

  if (!token || typeof token !== 'string')
    return NextResponse.json(
      { code: 'INVALID_LINK', message: 'This reset link is invalid, expired, or already used.' },
      { status: 400 });

  // Validate the password BEFORE using up the token, so typos don't burn the link
  const weak = validatePassword(password);
  if (weak) return NextResponse.json({ code: 'WEAK', message: weak }, { status: 400 });
  if (password !== confirm)
    return NextResponse.json(
      { code: 'MISMATCH', message: 'Passwords do not match.' }, { status: 400 });

  // Atomic "use once": only one request can flip is_used from false to true
  const { data: row } = await supabaseAdmin
    .from('password_reset_tokens')
    .update({ is_used: true })
    .eq('token_hash', hashToken(token))
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .select('user_id')
    .maybeSingle();

  if (!row)
    return NextResponse.json(
      { code: 'INVALID_LINK', message: 'This reset link is invalid, expired, or already used.' },
      { status: 400 });

  const hash = await bcrypt.hash(password, 12);
  const { error } = await supabaseAdmin
    .from('app_user')
    .update({ password_hash: hash, must_change_password: false })
    .eq('user_id', row.user_id);

  if (error)
    return NextResponse.json(
      { code: 'SERVER', message: 'Could not update password. Please request a new link.' },
      { status: 500 });

  return NextResponse.json({ ok: true });
}