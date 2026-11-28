import { NextResponse } from 'next/server';
import { fail } from '@/lib/users/service';
import { deleteJob, updateJob } from '@/lib/jobs/service';
import { JOB_RIGHTS } from '@/lib/jobs/rights';
import { authorizeJobDelete, authorizeJobWrite } from '@/lib/jobs/http';

type Ctx = { params: Promise<{ jobcode: string }> };

// PATCH /api/jobs/J01  { jobdesc }
// Needs the "Edit Job" right, checked first on the server (the button being hidden is never enough).
// The code cannot be changed here, and the Stamp becomes "EDITED <who> <when>".
// 200 { job } | 400 | 401 | 403 | 404 | 409 (deleted) | 415
export async function PATCH(req: Request, ctx: Ctx) {
  const gate = await authorizeJobWrite(req, JOB_RIGHTS.edit);
  if (!gate.ok) return gate.response;

  const { jobcode } = await ctx.params;
  try {
    return NextResponse.json(await updateJob(gate.user, jobcode, gate.body));
  } catch (e) {
    return fail(e);
  }
}

// DELETE /api/jobs/J01
// Soft delete: the row becomes Inactive and the Stamp becomes "DELETED <who> <when>". Needs the "Delete Job" right.
// Refused with 409 while active job history rows still use the job.
// 200 { job } | 401 | 403 | 404 | 409 (still used / already deleted)
export async function DELETE(_req: Request, ctx: Ctx) {
  const gate = await authorizeJobDelete();
  if (!gate.ok) return gate.response;

  const { jobcode } = await ctx.params;
  try {
    return NextResponse.json(await deleteJob(gate.user, jobcode));
  } catch (e) {
    return fail(e);
  }
}