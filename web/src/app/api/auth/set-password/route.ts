import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession, createSession } from '@/lib/auth/session';
import { validatePassword } from '@/lib/auth/password';

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Not signed in.' }, { status: 401 });

  const { password, confirm } = await req.json();
  const weak = validatePassword(password);
  if (weak) return NextResponse.json({ message: weak }, { status: 400 });

  const hash = await bcrypt.hash(password, 12);
  const { error } = await supabaseAdmin
    .from('app_user')
    .update({ password_hash: hash, must_change_password: false })
    .eq('user_id', Number(session.sub));
  if (error) return NextResponse.json({ message: 'Could not update password.' }, { status: 500 });

  await createSession({ ...session, mustChange: false });
  return NextResponse.json({ redirect: '/dashboard' });
}