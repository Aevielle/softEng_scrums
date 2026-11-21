import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { fail } from '@/lib/users/service';
import { addPrice, listPrices } from '@/lib/products/prices-service';
import { validatePriceInput } from '@/lib/products/prices';
import { PRICE_RIGHTS } from '@/lib/products/rights';
import { authorizeProductWrite, priceErrorResponse, validationFailed } from '@/lib/products/http';

// GET /api/products/P-003/prices
// Same rule as the product list: no "products" right, no data. A User gets Active prices only,
// without status or stamp. 200 { product, prices, currentPrice } | 401 | 403 | 404
export async function GET(_req: Request, { params }: { params: Promise<{ prodcode: string }> }) {
  const auth = await authorizeApi('products');
  if (!auth.ok) return auth.response;

  const { prodcode } = await params;
  try {
    return NextResponse.json(await listPrices(auth.user, prodcode));
  } catch (e) {
    return priceErrorResponse(e) ?? fail(e);
  }
}

// POST /api/products/P-003/prices   body: { effdate: "2026-03-01", unitprice: 30 }
// Needs the "Add Price" right, checked here. The Stamp is made here, never read from the body.
// 201 { price, currentPrice } | 400 VALIDATION { errors } | 401 | 403 | 404 | 409 (same date / Inactive product) | 415
export async function POST(req: Request, { params }: { params: Promise<{ prodcode: string }> }) {
  const gate = await authorizeProductWrite(req, PRICE_RIGHTS.add);
  if (!gate.ok) return gate.response;

  const { prodcode } = await params;

  const check = validatePriceInput(gate.body);
  if (!check.ok) return validationFailed(check.errors);

  try {
    const result = await addPrice(gate.user, prodcode, check.values);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return priceErrorResponse(e) ?? fail(e);
  }
}
