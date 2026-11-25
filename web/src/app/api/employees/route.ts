import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { fail } from '@/lib/users/service';
import { listEmployees } from '@/lib/employees/service';
import { filterEmployees, type StatusTab } from '@/lib/employees/filter';

// GET /api/employees?q=santos&status=Inactive
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

    const rows = await listEmployees(auth.user);
    return NextResponse.json({ employees: filterEmployees(rows, { q: searchParams.get('q') ?? '', status }) });
  } catch (e) {
    return fail(e);
  }
}