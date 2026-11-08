import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSession } from '@/lib/auth/session';

// Used so unknown emails take the same time as wrong passwords
const DUMMY_HASH = '$2a$10$CwTycUXWue0Thq9StjUM0uJ8.5G3b6dZlZk1X9F7sZ0vYQ3m8pYqe';

<<<<<<< HEAD
const fail = (code: string, message: string, status: number) =>
  NextResponse.json({ code, message }, { status });

// Demo accounts: any password works, but ONLY when DEMO_LOGIN=true
const DEMO_ACCOUNTS: Record<string, { firstName: string; role: string }> = {
  'superadmin@hope.com': { firstName: 'Superadmin', role: 'Superadmin' },
  'admin@hope.com': { firstName: 'Admin', role: 'Admin' },
  'user@hope.com': { firstName: 'User', role: 'User' },
};
=======
const serverError = () =>
  NextResponse.json(
    { code: 'SERVER', title: 'Server Error', message: 'Something went wrong on our side. Please try again.' },
    { status: 500 }
  );
>>>>>>> my-65-fixes

export async function POST(req: Request) {
  try {
    let body: { email?: string; password?: string; remember?: boolean };
    try {
      body = await req.json();
    } catch {
<<<<<<< HEAD
      return fail('EMPTY', 'Please fill out the forms.', 400);
=======
      return NextResponse.json(
        { code: 'EMPTY', message: 'Please fill out the forms.' }, { status: 400 });
>>>>>>> my-65-fixes
    }

    const { email, password, remember } = body;

    if (!email?.trim() || !password) {
<<<<<<< HEAD
      return fail('EMPTY', 'Please fill out the forms.', 400);
=======
      return NextResponse.json(
        { code: 'EMPTY', message: 'Please fill out the forms.' }, { status: 400 });
>>>>>>> my-65-fixes
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
<<<<<<< HEAD
      return fail('WRONG_EMAIL', 'Enter valid email address.', 400);
    }

    const demo = process.env.DEMO_LOGIN === 'true' ? DEMO_ACCOUNTS[cleanEmail] : undefined;

    if (demo) {
      await createSession(
        { sub: `demo-${demo.role.toLowerCase()}`, role: demo.role, mustChange: false },
        !!remember
      );

      return NextResponse.json({
        redirect: '/dashboard',
        user: { firstName: demo.firstName, email: cleanEmail, role: demo.role },
      });
=======
      return NextResponse.json(
        { code: 'FORMAT', message: 'Enter valid email address.' }, { status: 400 });
>>>>>>> my-65-fixes
    }

    const { data: user, error } = await supabaseAdmin
      .from('app_user')
<<<<<<< HEAD
      .select('user_id, first_name, email, password_hash, is_blocked, account_status, must_change_password, role:role_id(role_name)')
=======
      .select('user_id, email, password_hash, is_blocked, account_status, role:role_id(role_name)')
>>>>>>> my-65-fixes
      .eq('email', cleanEmail)
      .maybeSingle();

    if (error) {
      console.error('[login] app_user query failed:', error.message, error.code);
<<<<<<< HEAD
      return fail('SERVER', 'Something went wrong on our side. Please try again.', 500);
=======
      return serverError();
>>>>>>> my-65-fixes
    }

    const ok = await bcrypt.compare(password, user?.password_hash ?? DUMMY_HASH);

<<<<<<< HEAD
    if (!user || !ok) {
      return fail('INVALID', 'Invalid email or password. Please check and try again.', 401);
    }

    if (user.is_blocked) {
      return fail('BLOCKED', 'Your account is blocked. Please contact your administrator.', 403);
    }

    if (user.account_status === 'pending') {
      return fail('PENDING', 'Your account is waiting for Superadmin approval.', 403);
    }

    const roleObj = Array.isArray(user.role) ? user.role[0] : user.role;
    const roleName = roleObj?.role_name ?? 'User';

    await createSession(
      { sub: String(user.user_id), role: roleName, mustChange: !!user.must_change_password },
      !!remember
    );

    return NextResponse.json({
      redirect: user.must_change_password ? '/set-password' : '/dashboard',
      user: { firstName: user.first_name, email: user.email, role: roleName },
    });
  } catch (err) {
    console.error('[login] unexpected error:', err);
    return fail('SERVER', 'Something went wrong on our side. Please try again.', 500);
=======
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
      { sub: String(user.user_id), role: roleObj?.role_name ?? 'User', mustChange: false },
      !!remember
    );

    return NextResponse.json({ redirect: '/dashboard' });
  } catch (err) {
    // Anything unexpected (createSession, env vars, bcrypt, etc.) lands here
    console.error('[login] unexpected error:', err);
    return serverError();
>>>>>>> my-65-fixes
  }
}