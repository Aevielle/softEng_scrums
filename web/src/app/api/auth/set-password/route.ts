import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession, createSession } from '@/lib/auth/session';
import { validatePassword } from '@/lib/auth/password';

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ message: 'Not signed in.' }, { status: 401 });

    const { password, confirm } = await req.json().catch(() => ({}));

    if (typeof password !== 'string') {
      return NextResponse.json({ message: 'Please enter a new password.' }, { status: 400 });
    }
    const weak = validatePassword(password);
    if (weak) return NextResponse.json({ message: weak }, { status: 400 });

    // confirm is required and must match. Checked before hashing or any DB write.
    if (typeof confirm !== 'string' || password !== confirm) {
      return NextResponse.json(
        { code: 'MISMATCH', message: 'Passwords do not match.' },
        { status: 400 },
      );
    }

    const hash = await bcrypt.hash(password, 12);
    const { error } = await supabaseAdmin
      .from('app_user')
      .update({ password_hash: hash, must_change_password: false })
      .eq('user_id', Number(session.sub));

    if (error) {
      console.error('[set-password] update failed:', error.message, error.code);
      return NextResponse.json({ message: 'Could not update password.' }, { status: 500 });
    }

    await createSession({ sub: session.sub, role: session.role, mustChange: false });
    return NextResponse.json({ redirect: '/dashboard' });
  } catch (err) {
    console.error('[set-password] unexpected error:', err);
    return NextResponse.json({ message: 'Could not update password.' }, { status: 500 });
  }
}