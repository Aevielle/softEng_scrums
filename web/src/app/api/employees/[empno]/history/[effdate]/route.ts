import { NextResponse } from 'next/server';
import { fail } from '@/lib/users/service';
import { deleteHistory, updateHistory } from '@/lib/jobhistory/service';
import { JOBHISTORY_RIGHTS } from '@/lib/jobhistory/rights';
import { authorizeHistoryDelete, authorizeHistoryWrite } from '@/lib/jobhistory/http';

type Ctx = { params: Promise<{ empno: string; effdate: string }> };

// The row is named by the employee and its CURRENT effective date (one active row per employee and date).

// PATCH /api/employees/E-001/history/2023-01-01  { effdate, jobcode, deptcode, salary }
// Needs the "Edit Job History" right. The Stamp becomes "EDITED <who> <when>". The effective date may change, but not
// to a date this employee already has an active row for (409).
// 200 { entry } | 400 | 401 | 403 | 404 | 409 (deleted / date already used) | 415
export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await authorizeHistoryWrite(req, JOBHISTORY_RIGHTS.edit);
  if (!gate.ok) return gate.response;

  const { empno, effdate } = await ctx.params;
  try {
    return NextResponse.json(await updateHistory(gate.user, empno, effdate, gate.body));
  } catch (e) {
    return fail(e);
  }
}

// DELETE /api/employees/E-001/history/2023-01-01
// Soft delete: the row becomes Inactive and the Stamp becomes "DELETED <who> <when>". Needs the "Delete Job History" right.
// 200 { entry } | 401 | 403 | 404 | 409 (already deleted)
export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await authorizeHistoryDelete();
  if (!gate.ok) return gate.response;

  const { empno, effdate } = await ctx.params;
  try {
    return NextResponse.json(await deleteHistory(gate.user, empno, effdate));
  } catch (e) {
    return fail(e);
  }
}
