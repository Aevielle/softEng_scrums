import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { fail } from '@/lib/users/service';
import { createJob, listJobs } from '@/lib/jobs/service';
import { filterJobs, type StatusTab } from '@/lib/jobs/filter';
import { JOB_RIGHTS } from '@/lib/jobs/rights';
import { authorizeJobWrite } from '@/lib/jobs/http';

// GET /api/jobs?q=sales&status=Inactive
// Same rule as the page: no "hr" (Human Resources) access, no data -> 401 / 403 before anything is read.
// A User always gets Active rows only, whatever ?status= says.
export async function GET(req: Request) {
  const auth = await authorizeApi('hr');
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const isAdmin = auth.user.role !== 'user';
    const s = searchParams.get('status');
    const status: StatusTab = isAdmin && (s === 'Active' || s === 'Inactive') ? s : 'All';

    const rows = await listJobs(auth.user);
    return NextResponse.json({ jobs: filterJobs(rows, { q: searchParams.get('q') ?? '', status }) });
  } catch (e) {
    return fail(e);
  }
}

// POST /api/jobs  { jobdesc }
// Needs the "Add Job" right, checked first on the server (not just by hiding the button).
// The code, Status and Stamp are filled in here; anything the browser sends for them is ignored.
// 201 { job } | 400 | 401 | 403 | 415
export async function POST(req: Request) {
  const gate = await authorizeJobWrite(req, JOB_RIGHTS.add);
  if (!gate.ok) return gate.response;

  try {
    return NextResponse.json(await createJob(gate.user, gate.body), { status: 201 });
  } catch (e) {
    return fail(e);
  }
}