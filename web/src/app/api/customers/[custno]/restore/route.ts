import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { fail } from '@/lib/users/service';
import { restoreCustomer } from '@/lib/customers/service';

// POST /api/customers/C0082/restore
// Admin and Superadmin only (checked in the service). Brings the customer back with its old links.
// Must be sent as JSON: a plain cross-site <form> cannot send that content type, so it cannot forge a restore.
export async function POST(req: Request, ctx: { params: Promise<{ custno: string }> }) {
  const auth = await authorizeApi('customers');
  if (!auth.ok) return auth.response;

  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return NextResponse.json({ code: 'INVALID', message: 'Send the request as JSON.' }, { status: 415 });
  }

  const { custno } = await ctx.params;
  try {
    return NextResponse.json(await restoreCustomer(auth.user, custno));
  } catch (e) {
    return fail(e);
  }
}
