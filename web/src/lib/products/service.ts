import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ProductRow } from './filter';

type Actor = { role: string };

// Same rule as customers: product has no status column, a row is soft-deleted when its stamp starts with "DELETED".
const isDeleted = (stamp: string | null | undefined) => /^DELETED/i.test(stamp ?? '');

// "Today" in Manila, so a price effective today shows up at midnight local time, not at 8 AM (UTC).
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }); // YYYY-MM-DD

// S2-DBA-02: the price rule lives in the database. null = no price on or before that date.
async function currentPrice(prodcode: string, asOf: string): Promise<number | null> {
  const { data, error } = await supabaseAdmin.rpc('get_product_price_as_of', {
    p_prodcode: prodcode,
    p_as_of_date: asOf,
  });
  if (error) throw error;
  return data == null ? null : Number(data);
}

async function withPrices<T extends { prodcode: string }>(rows: T[]) {
  const asOf = today();
  const prices = await Promise.all(rows.map((r) => currentPrice(r.prodcode, asOf)));
  return rows.map((r, i) => ({ ...r, price: prices[i] }));
}

export async function listProducts(actor: Actor): Promise<ProductRow[]> {
  const isAdmin = actor.role !== 'user';

  if (isAdmin) {
    const { data, error } = await supabaseAdmin
      .from('product')
      .select('prodcode, description, unit, stamp')
      .order('prodcode', { ascending: true });
    if (error) throw error;

    const rows = await withPrices(data ?? []);
    return rows.map((r) => ({
      ...r,
      status: isDeleted(r.stamp) ? ('Inactive' as const) : ('Active' as const),
    }));
  }

  // A User never receives stamp or status. We filter on stamp without selecting it.
  // The .or() keeps rows whose stamp is NULL (a plain NOT ILIKE would drop them).
  const { data, error } = await supabaseAdmin
    .from('product')
    .select('prodcode, description, unit')
    .or('stamp.is.null,stamp.not.ilike.DELETED%')
    .order('prodcode', { ascending: true });
  if (error) throw error;

  return withPrices(data ?? []);
}