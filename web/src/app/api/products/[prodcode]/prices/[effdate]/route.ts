import { NextResponse } from 'next/server';
import { fail } from '@/lib/users/service';
import { deletePrice, updatePrice } from '@/lib/products/prices-service';
import { isValidDate, validatePriceInput } from '@/lib/products/prices';
import { PRICE_RIGHTS } from '@/lib/products/rights';
import { authorizeProductWrite, priceErrorResponse, validationFailed } from '@/lib/products/http';

type Ctx = { params: Promise<{ prodcode: string; effdate: string }> };

const notFound = () =>
  NextResponse.json({ code: 'NOT_FOUND', message: 'This price no longer exists. Reopen the dialog.' }, { status: 404 });

// PATCH /api/products/P-003/prices/2026-02-01   body: { effdate, unitprice }
// Needs the "Edit Price" right, checked here. The date in the URL picks the row; the body holds the new values.
// 200 { price, currentPrice } | 400 VALIDATION | 401 | 403 | 404 | 409 (same date as another price / Inactive) | 415
export async function PATCH(req: Request, { params }: Ctx) {
  const gate = await authorizeProductWrite(req, PRICE_RIGHTS.edit);
  if (!gate.ok) return gate.response;

  const { prodcode, effdate } = await params;
  if (!isValidDate(effdate)) return notFound();

  const check = validatePriceInput(gate.body);
  if (!check.ok) return validationFailed(check.errors);

  try {
    return NextResponse.json(await updatePrice(gate.user, prodcode, effdate, check.values));
  } catch (e) {
    return priceErrorResponse(e) ?? fail(e);
  }
}

// DELETE /api/products/P-003/prices/2026-02-01
// Needs the "Delete Price" right, checked here. Soft delete: the row stays and its Stamp becomes DELETED.
// 200 { price, currentPrice } | 401 | 403 | 404 | 409 (already Inactive)
export async function DELETE(req: Request, { params }: Ctx) {
  const gate = await authorizeProductWrite(req, PRICE_RIGHTS.del, { body: false });
  if (!gate.ok) return gate.response;

  const { prodcode, effdate } = await params;
  if (!isValidDate(effdate)) return notFound();

  try {
    return NextResponse.json(await deletePrice(gate.user, prodcode, effdate));
  } catch (e) {
    return priceErrorResponse(e) ?? fail(e);
  }
}
