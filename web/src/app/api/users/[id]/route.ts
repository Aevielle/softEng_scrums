import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { fail, ServiceError, setBlocked, updateUser } from '@/lib/users/service';

// PATCH /api/users/:id
//   { "blocked": true | false }                       -> Block / Unblock
//   { "firstName", "lastName", "email", "role"? }     -> Edit User
// The service re-checks who may change whom, so typing the URL or calling the API
// by hand gets the same refusal as the screen.

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi('users');
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ code: 'INVALID', message: 'Send the changes as JSON.' }, { status: 400 });
  }

  try {
    const userId = Number(id);
    const input = body as Record<string, unknown>;
    if (typeof input.blocked === 'boolean') return NextResponse.json(await setBlocked(auth.user, userId, input.blocked));
    if ('blocked' in input) throw new ServiceError(400, 'INVALID', '"blocked" must be true or false.');
    return NextResponse.json(await updateUser(auth.user, userId, input));
  } catch (e) {
    return fail(e);
  }
}