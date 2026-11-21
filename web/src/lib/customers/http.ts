import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { rightsFor } from '@/lib/auth/rights';
import type { CurrentUser } from '@/lib/auth/permissions';

// Gate shared by POST /api/customers, PATCH and DELETE /api/customers/[custno] (S2-DEV-08).
// Hiding a button is only a courtesy; this is the check that actually refuses the request.
// Order, so a person without the right learns nothing else about the request:
//   1. signed in + "customers" module (401 / 403)   2. the specific right (403)
//   3. JSON content type (415)                       4. body parses (400)
// The service checks the right again (defence in depth), so a future caller of the service cannot skip it.

type WriteAuth =
  | { ok: true; user: CurrentUser; body: unknown }
  | { ok: false; response: NextResponse };

export async function authorizeCustomerWrite(
  req: Request,
  rightName: string,
  opts: { body?: boolean } = {}
): Promise<WriteAuth> {
  const auth = await authorizeApi('customers');
  if (!auth.ok) return auth;

  const rights = await rightsFor(auth.user);
  if (!rights.has(rightName)) {
    return {
      ok: false,
      response: NextResponse.json(
        { code: 'FORBIDDEN', title: 'Not allowed', message: `You need the "${rightName}" right to do this.` },
        { status: 403 }
      ),
    };
  }

  // Delete has no body: rights are already checked, and a cross-site <form> cannot send DELETE anyway.
  if (opts.body === false) return { ok: true, user: auth.user, body: null };

  // A plain cross-site <form> cannot send application/json, so this also blocks that kind of forged request.
  if (!(req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) {
    return {
      ok: false,
      response: NextResponse.json({ code: 'INVALID', message: 'Send the customer as JSON.' }, { status: 415 }),
    };
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return {
      ok: false,
      response: NextResponse.json({ code: 'INVALID', message: 'Send the customer as JSON.' }, { status: 400 }),
    };
  }
  return { ok: true, user: auth.user, body };
}
