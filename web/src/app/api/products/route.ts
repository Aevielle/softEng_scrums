import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';
import { fail } from '@/lib/users/service';
import { listProducts } from '@/lib/products/service';
import { filterProducts, type StatusTab } from '@/lib/products/filter';

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