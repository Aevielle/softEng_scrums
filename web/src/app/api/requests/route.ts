import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { fail } from '@/lib/users/service';
import { createRequest } from '@/lib/requests/service';

/** A signed-in Admin or User sends a profile, role or access request. Any signed-in account may call it; the rules inside decide what is allowed. */
export async function POST(req: Request) {
  const auth = await authorizeApi();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ code: 'INVALID', message: 'Send the request as JSON.' }, { status: 400 });
  }
  try {
    return NextResponse.json(await createRequest(auth.user, body as Record<string, unknown>), { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
