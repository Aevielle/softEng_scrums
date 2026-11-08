import { requirePageAccess } from '@/lib/auth/guard';

export default async function ProductsPage() {
  await requirePageAccess('products'); // typing /products without rights redirects to /dashboard
  return <h1>Products</h1>;
}