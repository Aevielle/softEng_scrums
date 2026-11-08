import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isAdmin } from '@/lib/auth/roles';

// Admin-only route. Used to test role-based access control.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: 'Not signed in.' }, { status: 401 });
  if (!isAdmin(session.role)) {
    return NextResponse.json({ code: 'FORBIDDEN', message: 'Admin access required.' }, { status: 403 });
  }
  return NextResponse.json({ ok: true, role: session.role });
}