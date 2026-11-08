import { NextResponse } from 'next/server';
import { authorizeApi } from '@/lib/auth/guard';

export async function GET() {
  const auth = await authorizeApi('products');
  if (!auth.ok) return auth.response; // 401 not signed in, 403 no rights

  return NextResponse.json({ items: [] }); // real query goes here
}