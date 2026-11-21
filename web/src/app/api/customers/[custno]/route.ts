import { NextResponse } from 'next/server';
import { fail } from '@/lib/users/service';
import { deleteCustomer, updateCustomer } from '@/lib/customers/service';
import { CUSTOMER_RIGHTS } from '@/lib/customers/rights';
import { authorizeCustomerWrite } from '@/lib/customers/http';

// PATCH /api/customers/C0082  { custname, address, payterm }
// Needs the "Edit Customer" right, checked first on the server (the button being hidden is never enough).
// The number cannot be changed here, and the Stamp becomes "EDITED <who> <when>".
// 200 { customer } | 400 | 401 | 403 | 404 | 409 (deleted) | 415
export async function PATCH(req: Request, ctx: { params: Promise<{ custno: string }> }) {
  const gate = await authorizeCustomerWrite(req, CUSTOMER_RIGHTS.edit);
  if (!gate.ok) return gate.response;

  const { custno } = await ctx.params;
  try {
    return NextResponse.json(await updateCustomer(gate.user, custno, gate.body));
  } catch (e) {
    return fail(e);
  }
}

// DELETE /api/customers/C0082
// Needs the "Delete Customer" right, checked first on the server. Soft delete: the row stays, the Stamp becomes
// "DELETED <who> <when>". Refused with 409 HAS_ACTIVE_SALES while the customer still has active sales.
export async function DELETE(req: Request, ctx: { params: Promise<{ custno: string }> }) {
  const gate = await authorizeCustomerWrite(req, CUSTOMER_RIGHTS.del, { body: false });
  if (!gate.ok) return gate.response;

  const { custno } = await ctx.params;
  try {
    return NextResponse.json(await deleteCustomer(gate.user, custno));
  } catch (e) {
    return fail(e);
  }
}
