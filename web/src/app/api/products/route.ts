import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { fail } from '@/lib/users/service';
import { createProduct, listProducts } from '@/lib/products/service';
import { filterProducts, type StatusTab } from '@/lib/products/filter';
import { validateProductInput } from '@/lib/products/validate';
import { PRODUCT_RIGHTS } from '@/lib/products/rights';
import { authorizeProductWrite, productErrorResponse, validationFailed } from '@/lib/products/http';

// GET /api/products?q=steel&status=Inactive
// Same rule as the page: no "products" right, no data. A User always gets Active rows only,
// without status or stamp, whatever ?status= says.
export async function GET(req: Request) {
  const auth = await authorizeApi('products'); // 401 not signed in, 403 no rights
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const isAdmin = auth.user.role !== 'user';
    const s = searchParams.get('status');
    const status: StatusTab = isAdmin && (s === 'Active' || s === 'Inactive') ? s : 'All';

    const rows = await listProducts(auth.user);
    return NextResponse.json({ products: filterProducts(rows, { q: searchParams.get('q') ?? '', status }) });
  } catch (e) {
    return fail(e);
  }
}

// POST /api/products   body: { description, unit }
// Needs the "Add Product" right. The code, Status and Stamp are made here, never read from the body.
// 201 { product } | 400 VALIDATION { errors } | 401 | 403 | 415
export async function POST(req: Request) {
  const gate = await authorizeProductWrite(req, PRODUCT_RIGHTS.add);
  if (!gate.ok) return gate.response;

  const check = validateProductInput(gate.body);
  if (!check.ok) return validationFailed(check.errors);

  try {
    const product = await createProduct(gate.user, check.values);
    return NextResponse.json({ product }, { status: 201 });
  } catch (e) {
    return productErrorResponse(e) ?? fail(e);
  }
}
