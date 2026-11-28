import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { rightsFor } from '@/lib/auth/rights';
import type { CurrentUser } from '@/lib/auth/permissions';

// Gate shared by POST /api/employees and PATCH /api/employees/[empno] (S3-DEV-04).
// Hiding a button is only a courtesy; this is the check that actually refuses the request.
// Order, so a person without the right learns nothing else about the request:
//   1. signed in + "hr" module (401 / 403)   2. the specific right (403)
//   3. JSON content type (415)               4. body parses (400)
// The service checks the right again (defence in depth), so a future caller of the service cannot skip it.

type WriteAuth =
  | { ok: true; user: CurrentUser; body: unknown }
  | { ok: false; response: NextResponse };

const forbidden = (message: string) =>
  NextResponse.json({ code: 'FORBIDDEN', title: 'Not allowed', message }, { status: 403 });

// A plain cross-site <form> cannot send application/json, so requiring it also blocks that kind of forged request.
const isJson = (req: Request) => (req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json');

export async function authorizeEmployeeWrite(req: Request, rightName: string): Promise<WriteAuth> {
  const auth = await authorizeApi('hr');
  if (!auth.ok) return auth;

  const rights = await rightsFor(auth.user);
  if (!rights.has(rightName)) {
    return { ok: false, response: forbidden(`You need the "${rightName}" right to do this.`) };
  }

  if (!isJson(req)) {
    return { ok: false, response: NextResponse.json({ code: 'INVALID', message: 'Send the employee as JSON.' }, { status: 415 }) };
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return { ok: false, response: NextResponse.json({ code: 'INVALID', message: 'Send the employee as JSON.' }, { status: 400 }) };
  }
  return { ok: true, user: auth.user, body };
}

type ActionAuth = { ok: true; user: CurrentUser } | { ok: false; response: NextResponse };

/** DELETE /api/employees/[empno] (S3-DEV-05): signed in + "hr" module, then the "Delete Employee" right. No body.
 *  A cross-site <form> cannot send the DELETE method, so no content-type check is needed here. */
export async function authorizeEmployeeDelete(rightName: string): Promise<ActionAuth> {
  const auth = await authorizeApi('hr');
  if (!auth.ok) return auth;

  const rights = await rightsFor(auth.user);
  if (!rights.has(rightName)) {
    return { ok: false, response: forbidden(`You need the "${rightName}" right to do this.`) };
  }
  return { ok: true, user: auth.user };
}

/** POST /api/employees/[empno]/restore (S3-DEV-05): signed in + "hr" module, then Admin / Superadmin only.
 *  POST can be forged by a cross-site <form>, so it must be JSON, like the other write routes. */
export async function authorizeEmployeeRestore(req: Request): Promise<ActionAuth> {
  const auth = await authorizeApi('hr');
  if (!auth.ok) return auth;

  if (auth.user.role === 'user') return { ok: false, response: forbidden('Only an Admin can restore an employee.') };

  if (!isJson(req)) {
    return { ok: false, response: NextResponse.json({ code: 'INVALID', message: 'Send the request as JSON.' }, { status: 415 }) };
  }
  return { ok: true, user: auth.user };
}