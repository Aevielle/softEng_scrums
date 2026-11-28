import { NextResponse } from 'next/server';
import { fail } from '@/lib/users/service';
import { deleteEmployee, updateEmployee } from '@/lib/employees/service';
import { EMPLOYEE_RIGHTS } from '@/lib/employees/rights';
import { authorizeEmployeeDelete, authorizeEmployeeWrite } from '@/lib/employees/http';

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

// DELETE /api/employees/E-001   (S3-DEV-05)
// Soft delete: the employee becomes Inactive with the Stamp "DELETED <who> <when>". The row is never removed, and the
// separation date is left alone (it means the person left the company; Delete means the record is deleted).
// Needs the "Delete Employee" right, checked first on the server. The database refuses it, with a clear message,
// while the employee still has active sales (Geliz's S3-DBA-04 trigger).
// 200 { employee } | 401 | 403 | 404 | 409 (already deleted, or still has active sales)
export async function DELETE(_req: Request, ctx: { params: Promise<{ empno: string }> }) {
  const gate = await authorizeEmployeeDelete(EMPLOYEE_RIGHTS.delete);
  if (!gate.ok) return gate.response;

  const { empno } = await ctx.params;
  try {
    return NextResponse.json(await deleteEmployee(gate.user, empno));
  } catch (e) {
    return fail(e);
  }
}