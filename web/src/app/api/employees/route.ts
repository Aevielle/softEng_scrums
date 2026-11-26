import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { fail } from '@/lib/users/service';
import { createEmployee, listEmployees } from '@/lib/employees/service';
import { filterEmployees, type StatusTab } from '@/lib/employees/filter';
import { EMPLOYEE_RIGHTS } from '@/lib/employees/rights';
import { authorizeEmployeeWrite } from '@/lib/employees/http';

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

// POST /api/employees  { lastname, firstname, gender, birthdate, hiredate, sepdate? }
// Needs the "Add Employee" right, checked first on the server (not just by hiding the button).
// The number, Status and Stamp are filled in here; anything the browser sends for them is ignored.
// 201 { employee } | 400 | 401 | 403 | 415
export async function POST(req: Request) {
  const gate = await authorizeEmployeeWrite(req, EMPLOYEE_RIGHTS.add);
  if (!gate.ok) return gate.response;

  try {
    return NextResponse.json(await createEmployee(gate.user, gate.body), { status: 201 });
  } catch (e) {
    return fail(e);
  }
}