import { NextResponse } from 'next/server';
import { fail } from '@/lib/users/service';
import { restoreProduct } from '@/lib/products/service';
import { authorizeProductRestore, productErrorResponse } from '@/lib/products/http';

// POST /api/products/P-003/restore
// Admin and Superadmin only, checked here on the server. Brings an Inactive product back to Active.
// 200 { product } | 401 | 403 | 404 | 409 (already Active) | 415
export async function POST(req: Request, { params }: { params: Promise<{ prodcode: string }> }) {
  const gate = await authorizeProductRestore(req);
  if (!gate.ok) return gate.response;

  const { prodcode } = await params;

  try {
    const product = await restoreProduct(gate.user, prodcode);
    return NextResponse.json({ product });
  } catch (e) {
    return productErrorResponse(e) ?? fail(e);
  }
}