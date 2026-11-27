import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { rightsFor } from '@/lib/auth/rights';
import type { CurrentUser } from '@/lib/auth/permissions';
import { DEPARTMENT_RIGHTS } from './rights';

// Gates shared by the Department API routes. Hiding a button is only a courtesy; these are the checks that
// actually refuse a request. Order, so a person without the right learns nothing else about the request:
//   1. signed in + "hr" module (401 / 403)   2. the specific right, or Admin for Restore (403)
//   3. JSON content type (415)               4. body parses (400)
// The service checks the right again (defence in depth), so a future caller of the service cannot skip it.

type Gate<T = object> = ({ ok: true; user: CurrentUser } & T) | { ok: false; response: NextResponse };

const deny = (status: number, body: { code: string; title?: string; message: string }) => ({
  ok: false as const,
  response: NextResponse.json(body, { status }),
});

// A plain cross-site <form> cannot send application/json, so this also blocks that kind of forged request.
const isJson = (req: Request) => (req.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json');

async function needRight(rightName: string): Promise<Gate> {
  const auth = await authorizeApi('hr');
  if (!auth.ok) return auth;

  const rights = await rightsFor(auth.user);
  if (!rights.has(rightName)) {
    return deny(403, { code: 'FORBIDDEN', title: 'Not allowed', message: `You need the "${rightName}" right to do this.` });
  }
  return { ok: true, user: auth.user };
}

/** POST /api/departments and PATCH /api/departments/[deptcode]: right + JSON body. */
export async function authorizeDepartmentWrite(req: Request, rightName: string): Promise<Gate<{ body: unknown }>> {
  const gate = await needRight(rightName);
  if (!gate.ok) return gate;

  if (!isJson(req)) return deny(415, { code: 'INVALID', message: 'Send the department as JSON.' });
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return deny(400, { code: 'INVALID', message: 'Send the department as JSON.' });
  return { ok: true, user: gate.user, body };
}

/** DELETE /api/departments/[deptcode]: needs the "Delete Department" right, no body. */
export async function authorizeDepartmentDelete(): Promise<Gate> {
  return needRight(DEPARTMENT_RIGHTS.delete);
}

/** POST /api/departments/[deptcode]/restore: Admin / Superadmin only (a User's ticked rights never count here). */
export async function authorizeDepartmentRestore(req: Request): Promise<Gate> {
  const auth = await authorizeApi('hr');
  if (!auth.ok) return auth;

  if (auth.user.role === 'user') {
    return deny(403, { code: 'FORBIDDEN', title: 'Not allowed', message: 'Only an Admin or Superadmin can restore a department.' });
  }
  if (!isJson(req)) return deny(415, { code: 'INVALID', message: 'Send the request as JSON.' });
  return { ok: true, user: auth.user };
}
