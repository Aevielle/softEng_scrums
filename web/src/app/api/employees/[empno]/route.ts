import { NextResponse } from 'next/server';
import { fail } from '@/lib/users/service';
import { updateEmployee } from '@/lib/employees/service';
import { EMPLOYEE_RIGHTS } from '@/lib/employees/rights';
import { authorizeEmployeeWrite } from '@/lib/employees/http';

// PATCH /api/employees/E-001  { lastname, firstname, gender, birthdate, hiredate, sepdate? }
// Needs the "Edit Employee" right, checked first on the server (the button being hidden is never enough).
// The number cannot be changed here, and the Stamp becomes "EDITED <who> <when>".
// 200 { employee } | 400 | 401 | 403 | 404 | 409 (deleted) | 415
export async function PATCH(req: Request, ctx: { params: Promise<{ empno: string }> }) {
  const gate = await authorizeEmployeeWrite(req, EMPLOYEE_RIGHTS.edit);
  if (!gate.ok) return gate.response;

  const { empno } = await ctx.params;
  try {
    return NextResponse.json(await updateEmployee(gate.user, empno, gate.body));
  } catch (e) {
    return fail(e);
  }
}