import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession, createSession } from '@/lib/auth/session';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Not signed in.' }, { status: 401 });

  const { password, confirm } = await req.json();
  if (!password || password.length < 8)
    return NextResponse.json({ message: 'Password must be at least 8 characters.' }, { status: 400 });
  if (password !== confirm)
    return NextResponse.json({ message: 'Passwords do not match.' }, { status: 400 });

  const hash = await bcrypt.hash(password, 10);
  const { error } = await supabaseAdmin
    .from('app_user')
    .update({ password_hash: hash, must_change_password: false })
    .eq('id', session.sub);
  if (error) return NextResponse.json({ message: 'Could not update password.' }, { status: 500 });

  await createSession({ ...session, mustChange: false });
  return NextResponse.json({ redirect: '/dashboard' });
}