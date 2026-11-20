import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { fail } from '@/lib/users/service';
import { createCustomer, listCustomers } from '@/lib/customers/service';
import { filterCustomers, type StatusTab } from '@/lib/customers/filter';

// GET /api/customers?q=acme&status=Inactive
// Same rule as the page: no "customers" right, no data. A User always gets Active rows only,
// whatever ?status= says.
export async function GET(req: Request) {
  const auth = await authorizeApi('customers');
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const isAdmin = auth.user.role !== 'user';
    const s = searchParams.get('status');
    const status: StatusTab = isAdmin && (s === 'Active' || s === 'Inactive') ? s : 'All';

    const rows = await listCustomers(auth.user);
    return NextResponse.json({ customers: filterCustomers(rows, { q: searchParams.get('q') ?? '', status }) });
  } catch (e) {
    return fail(e);
  }
}

// POST /api/customers  { custname, address, payterm }
// Needs the "Add Customer" right (checked in the service, not just by hiding the button).
// The number, Status and Stamp are filled in here; anything the browser sends for them is ignored.
export async function POST(req: Request) {
  const auth = await authorizeApi('customers');
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ code: 'INVALID', message: 'Send the customer as JSON.' }, { status: 400 });
  }

  try {
    return NextResponse.json(await createCustomer(auth.user, body), { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
