import { NextResponse } from 'next/server';
import { fail } from '@/lib/users/service';
import { createHistory, listHistory } from '@/lib/jobhistory/service';
import { JOBHISTORY_RIGHTS } from '@/lib/jobhistory/rights';
import { authorizeHistoryView, authorizeHistoryWrite } from '@/lib/jobhistory/http';

type Ctx = { params: Promise<{ empno: string }> };

// GET /api/employees/E-001/history   (S3-DEV-06)
// Needs the "View Job History" right, checked first on the server: birth dates and salaries are personal data.
// Newest effective date first. A User gets Active rows only and no Status / Stamp; an Admin gets everything.
// 200 { history } | 401 | 403 | 404
export async function GET(_req: Request, ctx: Ctx) {
  const gate = await authorizeHistoryView();
  if (!gate.ok) return gate.response;

  const { empno } = await ctx.params;
  try {
    return NextResponse.json({ history: await listHistory(gate.user, empno) });
  } catch (e) {
    return fail(e);
  }
}

// POST /api/employees/E-001/history  { effdate, jobcode, deptcode, salary }
// Needs the "Add Job History" right. The employee comes from the URL; Status and Stamp are filled in here.
// Refused (409) when this employee already has an active row with that effective date.
// 201 { entry } | 400 | 401 | 403 | 404 | 409 | 415
export async function POST(req: Request, ctx: Ctx) {
  const gate = await authorizeHistoryWrite(req, JOBHISTORY_RIGHTS.add);
  if (!gate.ok) return gate.response;

  const { empno } = await ctx.params;
  try {
    return NextResponse.json(await createHistory(gate.user, empno, gate.body), { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
