import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { fail } from '@/lib/users/service';
import { updateCustomer } from '@/lib/customers/service';

// PATCH /api/customers/C0082  { custname, address, payterm }
// Needs the "Edit Customer" right (checked in the service). The number cannot be changed here,
// and the Stamp becomes "EDITED <who> <when>".
export async function PATCH(req: Request, ctx: { params: Promise<{ custno: string }> }) {
  const auth = await authorizeApi('customers');
  if (!auth.ok) return auth.response;

  const { custno } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ code: 'INVALID', message: 'Send the changes as JSON.' }, { status: 400 });
  }

  try {
    return NextResponse.json(await updateCustomer(auth.user, custno, body));
  } catch (e) {
    return fail(e);
  }
}
