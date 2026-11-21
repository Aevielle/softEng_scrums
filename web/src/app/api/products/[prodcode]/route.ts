import { NextResponse } from 'next/server';
import { fail } from '@/lib/users/service';
import { deleteProduct, updateProduct } from '@/lib/products/service';
import { validateProductInput } from '@/lib/products/validate';
import { PRODUCT_RIGHTS } from '@/lib/products/rights';
import { authorizeProductWrite, productErrorResponse, validationFailed } from '@/lib/products/http';

// PATCH /api/products/P-003   body: { description, unit }
// Needs the "Edit Product" right. The code in the URL picks the row and is never changed;
// Status and Stamp in the body (if any) are ignored. The new Stamp is EDITED <who> <when>, made here.
// 200 { product } | 400 VALIDATION { errors } | 401 | 403 | 404 | 409 (product is Inactive) | 415
export async function PATCH(req: Request, { params }: { params: Promise<{ prodcode: string }> }) {
  const gate = await authorizeProductWrite(req, PRODUCT_RIGHTS.edit);
  if (!gate.ok) return gate.response;

  const { prodcode } = await params;

  const check = validateProductInput(gate.body);
  if (!check.ok) return validationFailed(check.errors);

  try {
    const product = await updateProduct(gate.user, prodcode, check.values);
    return NextResponse.json({ product });
  } catch (e) {
    return productErrorResponse(e) ?? fail(e);
  }
}

// DELETE /api/products/P-003
// Needs the "Delete Product" right, checked here on the server (the button being hidden is never enough).
// Soft delete: the row stays, Status becomes Inactive and the Stamp becomes DELETED <who> <when>.
// 200 { product } | 401 | 403 | 404 | 409 (already Inactive, or the product is on an active sale line)
export async function DELETE(req: Request, { params }: { params: Promise<{ prodcode: string }> }) {
  const gate = await authorizeProductWrite(req, PRODUCT_RIGHTS.del, { body: false });
  if (!gate.ok) return gate.response;

  const { prodcode } = await params;

  try {
    const product = await deleteProduct(gate.user, prodcode);
    return NextResponse.json({ product });
  } catch (e) {
    return productErrorResponse(e) ?? fail(e);
  }
}
