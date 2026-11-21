import { supabaseAdmin } from '@/lib/supabase/admin';
import { makeStamp } from '@/lib/stamp';
import { isDeleted, NOT_DELETED, today } from './common';
import type { PriceInput, PriceRow } from './prices';

// S2-DEV-07: the price table (pricehist) holds one row per product per effective date.
// Prices are never overwritten by a newer price, so an old sale keeps the price it was sold at.
// Soft delete follows the same rule as products: stamp starts with "DELETED" = Inactive.
// ASSUMPTION: pricehist has a `stamp` column (Figure 12 shows one). No SQL file is added in this ticket.

type Actor = { role: string };
type WriteActor = { role: string; email: string };

export type PriceErrorCode = 'NOT_FOUND' | 'PRODUCT_DELETED' | 'PRICE_DELETED' | 'DUPLICATE_DATE';

/** Business errors the API routes turn into 404 / 409. Anything else is an unexpected failure. */
export class PriceError extends Error {
  constructor(public code: PriceErrorCode, message: string) {
    super(message);
  }
}

const PRODUCT_GONE = 'This product no longer exists. Refresh the page.';
const PRICE_GONE = 'This price no longer exists. Reopen the dialog.';

type PriceRecord = { effdate: string; unitprice: number | string; stamp: string | null };

/** What the browser receives. A User never gets status or stamp, same rule as the product list. */
function shape(actor: Actor, rec: PriceRecord): PriceRow {
  const base = { effdate: String(rec.effdate), unitprice: Number(rec.unitprice) };
  if (actor.role === 'user') return base;
  return { ...base, status: isDeleted(rec.stamp) ? 'Inactive' : 'Active', stamp: rec.stamp };
}

/**
 * The price in force on `asOf`: the latest Active price whose effective date is on or before it.
 * Soft-deleted prices are skipped. null = no price yet.
 * (get_product_price_as_of from S2-DBA-02 does not skip deleted prices, so the app applies the rule here.)
 */
export async function currentPrice(prodcode: string, asOf: string = today()): Promise<number | null> {
  const { data, error } = await supabaseAdmin
    .from('pricehist')
    .select('unitprice')
    .eq('prodcode', prodcode)
    .lte('effdate', asOf)
    .or(NOT_DELETED)
    .order('effdate', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] ? Number(data[0].unitprice) : null;
}

/** The product must exist. A User is told "not found" for a deleted product, since Users never see those. */
async function loadProduct(actor: Actor, prodcode: string) {
  const { data, error } = await supabaseAdmin
    .from('product')
    .select('prodcode, description, unit, stamp')
    .eq('prodcode', prodcode)
    .maybeSingle();
  if (error) throw error;
  if (!data || (actor.role === 'user' && isDeleted(data.stamp))) throw new PriceError('NOT_FOUND', PRODUCT_GONE);
  return data;
}

/** Same as loadProduct, and an Inactive product can no longer take price changes (an Admin restores it first). */
async function loadWritableProduct(actor: Actor, prodcode: string) {
  const p = await loadProduct(actor, prodcode);
  if (isDeleted(p.stamp)) throw new PriceError('PRODUCT_DELETED', 'This product is Inactive. Restore it before changing its prices.');
  return p;
}

const dupMessage = (actor: Actor, deletedOne: boolean) =>
  actor.role !== 'user' && deletedOne
    ? 'An Inactive (deleted) price already uses this effective date. Choose another date.'
    : 'This product already has a price for that effective date.';

/**
 * One price per product per effective date. Deleted prices count too: the (prodcode, effdate) key in the
 * database still holds that row, so reusing the date would fail anyway. `ignoreEffdate` is the row being edited.
 */
async function assertDateFree(actor: Actor, prodcode: string, effdate: string, ignoreEffdate?: string) {
  if (effdate === ignoreEffdate) return;
  const { data, error } = await supabaseAdmin
    .from('pricehist')
    .select('effdate, stamp')
    .eq('prodcode', prodcode)
    .eq('effdate', effdate)
    .maybeSingle();
  if (error) throw error;
  if (data) throw new PriceError('DUPLICATE_DATE', dupMessage(actor, isDeleted(data.stamp)));
}

const UNIQUE_VIOLATION = '23505';

export type PriceList = {
  product: { prodcode: string; description: string | null; unit: string | null };
  prices: PriceRow[];
  currentPrice: number | null;
};

/** Everything the dialog needs. A User gets Active rows only, without status or stamp. */
export async function listPrices(actor: Actor, prodcode: string): Promise<PriceList> {
  const product = await loadProduct(actor, prodcode);
  const isAdmin = actor.role !== 'user';

  let q = supabaseAdmin
    .from('pricehist')
    // A User never receives the stamp column at all; the filter below still works without selecting it.
    .select(isAdmin ? 'effdate, unitprice, stamp' : 'effdate, unitprice')
    .eq('prodcode', prodcode)
    .order('effdate', { ascending: false });
  if (!isAdmin) q = q.or(NOT_DELETED);

  const { data, error } = await q;
  if (error) throw error;

  const prices = ((data ?? []) as unknown as PriceRecord[]).map((r) => shape(actor, { ...r, stamp: r.stamp ?? null }));
  return {
    product: { prodcode: product.prodcode, description: product.description, unit: product.unit },
    prices,
    currentPrice: await currentPrice(prodcode),
  };
}

export type PriceResult = { price: PriceRow; currentPrice: number | null };

/** Add Price. The Stamp is made here; `input` must already have passed validatePriceInput. */
export async function addPrice(actor: WriteActor, prodcode: string, input: PriceInput): Promise<PriceResult> {
  await loadWritableProduct(actor, prodcode);
  await assertDateFree(actor, prodcode, input.effdate);

  const { data, error } = await supabaseAdmin
    .from('pricehist')
    .insert({
      prodcode,
      effdate: input.effdate,
      unitprice: input.unitprice,
      stamp: makeStamp('CREATED', actor.email),
    })
    .select('effdate, unitprice, stamp')
    .single();

  if (error) {
    // Two people saving the same date at the same moment: the key rejects the second one.
    if (error.code === UNIQUE_VIOLATION) throw new PriceError('DUPLICATE_DATE', dupMessage(actor, false));
    throw error;
  }
  return { price: shape(actor, data), currentPrice: await currentPrice(prodcode) };
}

/** Edit Price: the effective date and/or the unit price of one Active price. */
export async function updatePrice(
  actor: WriteActor,
  prodcode: string,
  oldEffdate: string,
  input: PriceInput
): Promise<PriceResult> {
  await loadWritableProduct(actor, prodcode);
  await assertDateFree(actor, prodcode, input.effdate, oldEffdate);

  // The not-deleted filter repeats inside the UPDATE itself, so a delete that lands between the check
  // above and this write cannot be overwritten.
  const { data, error } = await supabaseAdmin
    .from('pricehist')
    .update({ effdate: input.effdate, unitprice: input.unitprice, stamp: makeStamp('EDITED', actor.email) })
    .eq('prodcode', prodcode)
    .eq('effdate', oldEffdate)
    .or(NOT_DELETED)
    .select('effdate, unitprice, stamp')
    .maybeSingle();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) throw new PriceError('DUPLICATE_DATE', dupMessage(actor, false));
    throw error;
  }
  if (!data) throw await whyMissing(actor, prodcode, oldEffdate);
  return { price: shape(actor, data), currentPrice: await currentPrice(prodcode) };
}

/** Delete Price (soft): the row stays, its Stamp becomes DELETED <who> <when>, and it shows under Inactive. */
export async function deletePrice(actor: WriteActor, prodcode: string, effdate: string): Promise<PriceResult> {
  await loadWritableProduct(actor, prodcode);

  const { data, error } = await supabaseAdmin
    .from('pricehist')
    .update({ stamp: makeStamp('DELETED', actor.email) })
    .eq('prodcode', prodcode)
    .eq('effdate', effdate)
    .or(NOT_DELETED)
    .select('effdate, unitprice, stamp')
    .maybeSingle();
  if (error) throw error;
  if (!data) throw await whyMissing(actor, prodcode, effdate);
  return { price: shape(actor, data), currentPrice: await currentPrice(prodcode) };
}

/** An UPDATE touched no row: either the price is gone, or it is already Inactive. */
async function whyMissing(actor: Actor, prodcode: string, effdate: string): Promise<PriceError> {
  const { data } = await supabaseAdmin
    .from('pricehist')
    .select('stamp')
    .eq('prodcode', prodcode)
    .eq('effdate', effdate)
    .maybeSingle();
  if (data && isDeleted(data.stamp) && actor.role !== 'user') {
    return new PriceError('PRICE_DELETED', 'This price is already Inactive.');
  }
  return new PriceError('NOT_FOUND', PRICE_GONE);
}
