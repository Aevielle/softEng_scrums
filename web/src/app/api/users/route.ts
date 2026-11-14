import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { createUser, fail, listUsers } from '@/lib/users/service';

// Both handlers run the rights check first: 401 if not signed in, 403 without the "users" right.

export async function GET() {
  const auth = await authorizeApi('users');
  if (!auth.ok) return auth.response;
  try {
    return NextResponse.json({ users: await listUsers(auth.user) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  const auth = await authorizeApi('users');
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ code: 'INVALID', message: 'Send the user details as JSON.' }, { status: 400 });
  }
  try {
    return NextResponse.json(await createUser(auth.user, body as Record<string, unknown>), { status: 201 });
  } catch (e) {
    return fail(e);
  }
}