import { NextResponse } from 'next/server';
import { fail } from '@/lib/users/service';
import { restoreDepartment } from '@/lib/departments/service';
import { authorizeDepartmentRestore } from '@/lib/departments/http';

// POST /api/departments/D-004/restore   (send Content-Type: application/json, the body can be {})
// Brings a deleted department back to Active; the Stamp becomes "EDITED <who> <when>".
// Admin / Superadmin only: a User gets 403 even if they hold the Delete Department right.
// 200 { department } | 401 | 403 | 404 | 409 (already active) | 415
export async function POST(req: Request, ctx: { params: Promise<{ deptcode: string }> }) {
  const gate = await authorizeDepartmentRestore(req);
  if (!gate.ok) return gate.response;

  const { deptcode } = await ctx.params;
  try {
    return NextResponse.json(await restoreDepartment(gate.user, deptcode));
  } catch (e) {
    return fail(e);
  }
}
