import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { fail } from '@/lib/users/service';
import { updateOwnProfile } from '@/lib/requests/service';

/** Superadmin only: save your own name and email. Admins and Users send a change request instead. */
export async function PATCH(req: Request) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ code: 'INVALID', message: 'Send the changes as JSON.' }, { status: 400 });
  }
  try {
    return NextResponse.json(await updateOwnProfile(auth.user, body as Record<string, unknown>));
  } catch (e) {
    return fail(e);
  }
}
