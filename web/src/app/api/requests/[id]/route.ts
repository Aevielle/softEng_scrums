import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { fail } from '@/lib/users/service';
import { decideRequest } from '@/lib/requests/service';

/** Superadmin answers a request: body { decision: 'approve' | 'decline' }. Checked again in the service. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authorizeApi('users');
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ code: 'INVALID', message: 'Send the answer as JSON.' }, { status: 400 });
  }
  try {
    return NextResponse.json(await decideRequest(auth.user, id, (body as { decision?: unknown }).decision));
  } catch (e) {
    return fail(e);
  }
}
