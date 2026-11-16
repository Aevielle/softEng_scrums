import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { approveUser, fail, ServiceError, setBlocked, setRole, updateUser } from '@/lib/users/service';
import { declineUser } from '@/lib/users/decline';

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
    if (input.approve === true) return NextResponse.json(await approveUser(auth.user, userId));
    if (input.decline === true) return NextResponse.json(await declineUser(auth.user, userId));
    if ('setRole' in input) return NextResponse.json(await setRole(auth.user, userId, input.setRole));
    if (typeof input.blocked === 'boolean') return NextResponse.json(await setBlocked(auth.user, userId, input.blocked));
    if ('blocked' in input) throw new ServiceError(400, 'INVALID', '"blocked" must be true or false.');
    return NextResponse.json(await updateUser(auth.user, userId, input));
  } catch (e) {
    return fail(e);
  }
}
