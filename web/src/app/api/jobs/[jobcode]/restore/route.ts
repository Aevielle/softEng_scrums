import { NextResponse } from 'next/server';
import { fail } from '@/lib/users/service';
import { restoreJob } from '@/lib/jobs/service';
import { authorizeJobRestore } from '@/lib/jobs/http';

// POST /api/jobs/J04/restore   (send Content-Type: application/json, the body can be {})
// Brings a deleted job back to Active; the Stamp becomes "EDITED <who> <when>".
// Admin / Superadmin only: a User gets 403 even if they hold the Delete Job right.
// 200 { job } | 401 | 403 | 404 | 409 (already active) | 415
export async function POST(req: Request, ctx: { params: Promise<{ jobcode: string }> }) {
  const gate = await authorizeJobRestore(req);
  if (!gate.ok) return gate.response;

  const { jobcode } = await ctx.params;
  try {
    return NextResponse.json(await restoreJob(gate.user, jobcode));
  } catch (e) {
    return fail(e);
  }
}