import { supabaseAdmin } from '@/lib/supabase/admin';
import { makeStamp } from '@/lib/stamp';
import { isDeleted, NOT_DELETED, today } from './common';
import { currentPrice } from './prices-service';
import type { ProductRow } from './filter';
import type { ProductInput } from './validate';

type Actor = { role: string };
/** Whoever is saving: lib/stamp.ts shows the email's part before "@" in the Stamp. */
type WriteActor = { role: string; email: string };

// Soft delete rule, "today" and the not-deleted filter live in ./common. The current price comes from
// ./prices-service (S2-DEV-07): it skips soft-deleted prices.

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
    .or(NOT_DELETED)
    .order('prodcode', { ascending: true });
  if (error) throw error;

  return withPrices(data ?? []);
}

// ---------------------------------------------------------------------------
// S2-DEV-05: create and edit
// ---------------------------------------------------------------------------

/** Business errors the API routes turn into 404 / 409. Anything else is an unexpected failure. */
export class ProductError extends Error {
  constructor(public code: 'NOT_FOUND' | 'DELETED', message: string) {
    super(message);
  }
}

/** Prefix and width of the auto-numbered code: P-001, P-002 ... (as in Rilaneh's mockup). */
const CODE_PREFIX = 'P-';
const CODE_WIDTH = 3;
const CODE_RE = /^P-(\d+)$/i;
const MAX_INSERT_TRIES = 5;

export function formatCode(n: number): string {
  return CODE_PREFIX + String(n).padStart(CODE_WIDTH, '0');
}

/**
 * Highest number used so far, soft-deleted rows included, so a deleted code is never handed out again.
 * Pages through the table because Supabase returns at most 1000 rows per request.
 */
async function highestSerial(): Promise<number> {
  const PAGE = 1000;
  let max = 0;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from('product')
      .select('prodcode')
      .order('prodcode', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) {
      const m = CODE_RE.exec(String(r.prodcode));
      if (m) max = Math.max(max, Number(m[1]));
    }
    if ((data?.length ?? 0) < PAGE) break;
  }
  return max;
}

type ProductRecord = { prodcode: string; description: string | null; unit: string | null; stamp: string | null };

/** What the browser receives. A User never gets status or stamp, same rule as listProducts. */
function shape(actor: Actor, rec: ProductRecord, price: number | null): ProductRow {
  const base = { prodcode: rec.prodcode, description: rec.description, unit: rec.unit, price };
  if (actor.role === 'user') return base;
  return { ...base, status: isDeleted(rec.stamp) ? 'Inactive' : 'Active', stamp: rec.stamp };
}

/**
 * Add Product. The code and Stamp are generated here; `input` must already have passed validateProductInput.
 * Status is not sent: S2-DBA-03 made 'Active' the column default.
 * If two people save at the same moment and get the same code, the primary key rejects the second insert
 * and we try the next number (23505 = unique_violation).
 */
export async function createProduct(actor: WriteActor, input: ProductInput): Promise<ProductRow> {
  let serial = (await highestSerial()) + 1;

  for (let attempt = 0; attempt < MAX_INSERT_TRIES; attempt++, serial++) {
    const { data, error } = await supabaseAdmin
      .from('product')
      .insert({
        prodcode: formatCode(serial),
        description: input.description,
        unit: input.unit,
        stamp: makeStamp('CREATED', actor.email),
      })
      .select('prodcode, description, unit, stamp')
      .single();

    if (!error) return shape(actor, data, null); // a new product has no price yet
    if (error.code !== '23505') throw error;
  }
  throw new Error('Could not reserve a product code. Please try again.');
}

/**
 * Edit Product: only description and unit change (code never does). Soft-deleted products cannot be edited;
 * an Admin restores them first. A User is told "not found" for a deleted row, since Users never see those.
 */
export async function updateProduct(actor: WriteActor, prodcode: string, input: ProductInput): Promise<ProductRow> {
  const existing = await supabaseAdmin.from('product').select('prodcode, stamp').eq('prodcode', prodcode).maybeSingle();
  if (existing.error) throw existing.error;

  const gone = new ProductError('NOT_FOUND', 'This product no longer exists. Refresh the page.');
  if (!existing.data) throw gone;
  if (isDeleted(existing.data.stamp)) {
    if (actor.role === 'user') throw gone;
    throw new ProductError('DELETED', 'This product is Inactive. Restore it before editing.');
  }

  // The .or() repeats the "not deleted" rule inside the UPDATE itself, so a delete that lands
  // between the check above and this write cannot be overwritten.
  const { data, error } = await supabaseAdmin
    .from('product')
    .update({ description: input.description, unit: input.unit, stamp: makeStamp('EDITED', actor.email) })
    .eq('prodcode', prodcode)
    .or(NOT_DELETED)
    .select('prodcode, description, unit, stamp')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw gone;

  return shape(actor, data, await currentPrice(prodcode, today()));
}
