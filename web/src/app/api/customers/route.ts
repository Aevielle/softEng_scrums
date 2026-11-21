import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { fail } from '@/lib/users/service';
import { createCustomer, listCustomers } from '@/lib/customers/service';
import { filterCustomers, type StatusTab } from '@/lib/customers/filter';
import { CUSTOMER_RIGHTS } from '@/lib/customers/rights';
import { authorizeCustomerWrite } from '@/lib/customers/http';

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
// Needs the "Add Customer" right, checked first on the server (not just by hiding the button).
// The number, Status and Stamp are filled in here; anything the browser sends for them is ignored.
// 201 { customer } | 400 | 401 | 403 | 415
export async function POST(req: Request) {
  const gate = await authorizeCustomerWrite(req, CUSTOMER_RIGHTS.add);
  if (!gate.ok) return gate.response;

  try {
    return NextResponse.json(await createCustomer(gate.user, gate.body), { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
