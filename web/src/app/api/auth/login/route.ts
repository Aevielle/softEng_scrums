import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSession } from '@/lib/auth/session';

// Used so unknown emails take the same time as wrong passwords
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.5G3b6dZlZk1X9F7sZ0vYQ3m8pYqe';

export async function POST(req: Request) {
  const { email, password, remember } = await req.json();

  if (!email?.trim() || !password) {
    return NextResponse.json(
      { code: 'EMPTY', message: 'Please fill out the forms.' }, { status: 400 });
  }

  const { data: user } = await supabaseAdmin
    .from('app_user')
    .select('user_id, email, password_hash, is_blocked, account_status, must_change_password, role:role_id(role_name)')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

  // One general error for unknown email OR wrong password
  if (!user || !ok) {
    return NextResponse.json(
      { code: 'INVALID', message: 'Invalid email or password. Please check and try again.' },
      { status: 401 });
  }

  // Checked only after the password is correct, so status isn't leaked to strangers
  if (user.is_blocked) {
  return NextResponse.json(
    { code: 'BLOCKED', message: 'Your account is blocked. Please contact your administrator.' },
    { status: 403 });
  }
  
  if (user.account_status === 'pending') {
  return NextResponse.json(
    { code: 'PENDING', message: 'Your account is waiting for Superadmin approval.' },
    { status: 403 });
  }
  
  const roleObj = Array.isArray(user.role) ? user.role[0] : user.role;

  await createSession(
    { sub: String(user.user_id), role: roleObj?.role_name ?? 'User', mustChange: !!user.must_change_password },
  !!remember
  );

  return NextResponse.json({
    redirect: user.must_change_password ? '/set-password' : '/dashboard',
  });
}