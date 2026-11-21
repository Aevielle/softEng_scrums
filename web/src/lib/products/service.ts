import { supabaseAdmin } from '@/lib/supabase/admin';
import { makeStamp } from '@/lib/stamp';
import { today } from './common';
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
      .select('prodcode, description, unit, stamp, is_deleted')
      .order('prodcode', { ascending: true });
    if (error) throw error;

    // Status comes from the is_deleted column (what S2-DBA-04 protects), the same as Customers.
    const rows = await withPrices(data ?? []);
    return rows.map(({ is_deleted, ...r }) => ({
      ...r,
      status: is_deleted ? ('Inactive' as const) : ('Active' as const),
    }));
  }

  // A User never receives stamp or status. We filter on is_deleted without selecting it.
  const { data, error } = await supabaseAdmin
    .from('product')
    .select('prodcode, description, unit')
    .eq('is_deleted', false)
    .order('prodcode', { ascending: true });
  if (error) throw error;

  return withPrices(data ?? []);
}

// ---------------------------------------------------------------------------
// S2-DEV-05: create and edit
// ---------------------------------------------------------------------------

/** Business errors the API routes turn into 404 / 409. Anything else is an unexpected failure. */
export class ProductError extends Error {
  constructor(public code: 'NOT_FOUND' | 'DELETED' | 'IN_USE' | 'NOT_DELETED', message: string) {
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

type ProductRecord = { prodcode: string; description: string | null; unit: string | null; stamp: string | null; is_deleted: boolean | null };

/** What the browser receives. A User never gets status or stamp, same rule as listProducts. */
function shape(actor: Actor, rec: ProductRecord, price: number | null): ProductRow {
  const base = { prodcode: rec.prodcode, description: rec.description, unit: rec.unit, price };
  if (actor.role === 'user') return base;
  return { ...base, status: rec.is_deleted ? 'Inactive' : 'Active', stamp: rec.stamp };
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
      .select('prodcode, description, unit, stamp, is_deleted')
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
  const existing = await supabaseAdmin.from('product').select('prodcode, is_deleted').eq('prodcode', prodcode).maybeSingle();
  if (existing.error) throw existing.error;

  const gone = new ProductError('NOT_FOUND', 'This product no longer exists. Refresh the page.');
  if (!existing.data) throw gone;
  if (existing.data.is_deleted) {
    if (actor.role === 'user') throw gone;
    throw new ProductError('DELETED', 'This product is Inactive. Restore it before editing.');
  }

  // The is_deleted filter repeats the "not deleted" rule inside the UPDATE itself, so a delete that lands
  // between the check above and this write cannot be overwritten.
  const { data, error } = await supabaseAdmin
    .from('product')
    .update({ description: input.description, unit: input.unit, stamp: makeStamp('EDITED', actor.email) })
    .eq('prodcode', prodcode)
    .eq('is_deleted', false)
    .select('prodcode, description, unit, stamp, is_deleted')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw gone;

  return shape(actor, data, await currentPrice(prodcode, today()));
}

// ---------------------------------------------------------------------------
// S2-DEV-06: soft delete and restore
// ---------------------------------------------------------------------------

const PRODUCT_GONE = 'This product no longer exists. Refresh the page.';

/** The S2-DBA-04 trigger refuses a soft delete while active related rows exist (SQLSTATE P0001). */
const RAISE_EXCEPTION = 'P0001';

const inUseMessage = (prodcode: string, n?: number) =>
  n
    ? `Cannot delete ${prodcode}: it is on ${n} active sale line${n === 1 ? '' : 's'}. Remove it from those sales first.`
    : `Cannot delete ${prodcode}: it is on an active sale line. Remove it from those sales first.`;

/** How many active sale lines (salesdetail rows that are not soft-deleted) use this product. */
async function activeSaleLines(prodcode: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('salesdetail')
    .select('transno', { count: 'exact', head: true })
    .eq('prodcode', prodcode)
    .eq('is_deleted', false);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Delete Product (soft): Status becomes Inactive (is_deleted) and the trigger stamps it DELETE <who> <when>. The row stays,
 * so old sales keep their link to it. Refused while the product is on an active sale line.
 * The caller has already checked the "Delete Product" right.
 */
export async function deleteProduct(actor: WriteActor, prodcode: string): Promise<ProductRow> {
  const existing = await supabaseAdmin.from('product').select('prodcode, is_deleted').eq('prodcode', prodcode).maybeSingle();
  if (existing.error) throw existing.error;

  const gone = new ProductError('NOT_FOUND', PRODUCT_GONE);
  if (!existing.data) throw gone;
  if (existing.data.is_deleted) {
    if (actor.role === 'user') throw gone;
    throw new ProductError('DELETED', 'This product is already Inactive.');
  }

  const lines = await activeSaleLines(prodcode);
  if (lines > 0) throw new ProductError('IN_USE', inUseMessage(prodcode, lines));

  // Only is_deleted is written. The S2-DBA-04 trigger writes the Stamp ("DELETE <who> <when>") and also refuses
  // the delete if a sale line appeared a moment ago. Same as Customers.
  const { data, error } = await supabaseAdmin
    .from('product')
    .update({ is_deleted: true })
    .eq('prodcode', prodcode)
    .eq('is_deleted', false)
    .select('prodcode, description, unit, stamp, is_deleted')
    .maybeSingle();
  if (error) {
    if (error.code === RAISE_EXCEPTION) {
      // The trigger words its own refusal ("Cannot delete product row: 3 active related record(s) still exist."); show it as is.
      const own = /^Cannot delete/i.test(error.message ?? '') ? `${error.message} Nothing was deleted.` : inUseMessage(prodcode);
      throw new ProductError('IN_USE', own);
    }
    throw error;
  }
  if (!data) throw await whyNothingChanged(actor, prodcode);

  return shape(actor, data, await currentPrice(prodcode, today()));
}

/**
 * Restore Product: Admin / Superadmin only (checked here again, not just in the route). The row comes back
 * Active with its old prices and sale links intact; the Stamp is written by the trigger.
 */
export async function restoreProduct(actor: WriteActor, prodcode: string): Promise<ProductRow> {
  const gone = new ProductError('NOT_FOUND', PRODUCT_GONE);
  if (actor.role === 'user') throw gone; // Users never see Inactive rows, so for them there is nothing to restore

  const { data, error } = await supabaseAdmin
    .from('product')
    .update({ is_deleted: false }) // the trigger writes the Stamp ("RESTORE <who> <when>")
    .eq('prodcode', prodcode)
    .eq('is_deleted', true)
    .select('prodcode, description, unit, stamp, is_deleted')
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const check = await supabaseAdmin.from('product').select('prodcode').eq('prodcode', prodcode).maybeSingle();
    if (check.error) throw check.error;
    throw check.data ? new ProductError('NOT_DELETED', 'This product is already Active.') : gone;
  }

  return shape(actor, data, await currentPrice(prodcode, today()));
}

/** A delete UPDATE touched no row: the product vanished, or someone else deleted it first. */
async function whyNothingChanged(actor: Actor, prodcode: string): Promise<ProductError> {
  const { data } = await supabaseAdmin.from('product').select('is_deleted').eq('prodcode', prodcode).maybeSingle();
  if (data?.is_deleted && actor.role !== 'user') {
    return new ProductError('DELETED', 'This product is already Inactive.');
  }
  return new ProductError('NOT_FOUND', PRODUCT_GONE);
}