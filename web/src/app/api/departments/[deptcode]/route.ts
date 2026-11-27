import { NextResponse } from 'next/server';
import { fail } from '@/lib/users/service';
import { deleteDepartment, updateDepartment } from '@/lib/departments/service';
import { DEPARTMENT_RIGHTS } from '@/lib/departments/rights';
import { authorizeDepartmentDelete, authorizeDepartmentWrite } from '@/lib/departments/http';

type Ctx = { params: Promise<{ deptcode: string }> };

// PATCH /api/departments/D-001  { deptname }
// Needs the "Edit Department" right, checked first on the server (the button being hidden is never enough).
// The code cannot be changed here, and the Stamp becomes "EDITED <who> <when>".
// 200 { department } | 400 | 401 | 403 | 404 | 409 (deleted) | 415
export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await authorizeDepartmentWrite(req, DEPARTMENT_RIGHTS.edit);
  if (!gate.ok) return gate.response;

  const { deptcode } = await ctx.params;
  try {
    return NextResponse.json(await updateDepartment(gate.user, deptcode, gate.body));
  } catch (e) {
    return fail(e);
  }
}

// DELETE /api/departments/D-001
// Soft delete: the row becomes Inactive and the Stamp becomes "DELETED <who> <when>". Needs the "Delete Department" right.
// Refused with 409 while active job history rows still use the department.
// 200 { department } | 401 | 403 | 404 | 409 (still used / already deleted)
export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await authorizeDepartmentDelete();
  if (!gate.ok) return gate.response;

  const { deptcode } = await ctx.params;
  try {
    return NextResponse.json(await deleteDepartment(gate.user, deptcode));
  } catch (e) {
    return fail(e);
  }
}
