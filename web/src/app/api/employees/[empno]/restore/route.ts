import { NextResponse } from 'next/server';
import { fail } from '@/lib/users/service';
import { restoreEmployee } from '@/lib/employees/service';
import { authorizeEmployeeRestore } from '@/lib/employees/http';

// POST /api/employees/E-004/restore   (S3-DEV-05)
// Brings a deleted employee back to Active. Only an Admin / Superadmin may do it (a User gets 403); it has no right of
// its own. The separation date is not touched: if the person had left the company, they still show that date.
// The Stamp becomes "EDITED <who> <when>". Send an empty JSON body: {}
// 200 { employee } | 401 | 403 | 404 | 409 (already active) | 415
export async function POST(req: Request, ctx: { params: Promise<{ empno: string }> }) {
  const gate = await authorizeEmployeeRestore(req);
  if (!gate.ok) return gate.response;

  const { empno } = await ctx.params;
  try {
    return NextResponse.json(await restoreEmployee(gate.user, empno));
  } catch (e) {
    return fail(e);
  }
}
