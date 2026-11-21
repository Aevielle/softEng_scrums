// Price History helpers shared by the dialog (browser) and the API / service (server).
// No server-only imports here: this file is bundled into the browser.

export type PriceStatusTab = 'Active' | 'Inactive' | 'All';

export type PriceRow = {
  /** YYYY-MM-DD. Together with the product code it identifies the row: one price per product per date. */
  effdate: string;
  unitprice: number;
  /** Only present for Admin / Superadmin. A User never receives these two fields. */
  status?: 'Active' | 'Inactive';
  stamp?: string | null;
};

export type PriceInput = { effdate: string; unitprice: number };
export type PriceErrors = Partial<Record<'effdate' | 'unitprice', string>>;

export type PriceValidation =
  | { ok: true; values: PriceInput }
  | { ok: false; errors: PriceErrors };

/** pricehist.unitprice is DECIMAL(10,2): 8 digits before the point, 2 after. */
export const PRICE_MAX = 99_999_999.99;
const MIN_YEAR = 2000;
const MAX_YEAR = 2100;

/** True only for a real calendar day written as YYYY-MM-DD ("2026-02-30" is rejected). */
export function isValidDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < MIN_YEAR || y > MAX_YEAR) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Accepts anything (a request body is untrusted) and returns clean values or one message per bad field. */
export function validatePriceInput(raw: unknown): PriceValidation {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const errors: PriceErrors = {};

  const effdate = typeof src.effdate === 'string' ? src.effdate.trim() : '';
  if (!effdate) errors.effdate = 'Effective date is required.';
  else if (!isValidDate(effdate)) errors.effdate = 'Enter a real date (YYYY-MM-DD).';

  // The price may arrive as a number (API) or as typed text (form). "$", spaces and thousands commas are tolerated.
  const text =
    typeof src.unitprice === 'number' && Number.isFinite(src.unitprice)
      ? String(src.unitprice)
      : typeof src.unitprice === 'string'
        ? src.unitprice.replace(/[\s$,]/g, '')
        : '';
  let unitprice = 0;
  if (!text) errors.unitprice = 'Unit price is required.';
  else if (!/^\d+(\.\d{1,2})?$/.test(text)) errors.unitprice = 'Enter a price like 28 or 28.50 (up to 2 decimals, no negatives).';
  else {
    unitprice = Number(text);
    if (unitprice <= 0) errors.unitprice = 'Unit price must be above zero.';
    else if (unitprice > PRICE_MAX) errors.unitprice = 'Unit price is too large.';
  }

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, values: { effdate, unitprice } };
}

export function countPrices(rows: PriceRow[]) {
  const active = rows.filter((r) => r.status !== 'Inactive').length;
  return { Active: active, Inactive: rows.length - active, All: rows.length };
}

export function filterPrices(rows: PriceRow[], status: PriceStatusTab): PriceRow[] {
  if (status === 'All') return rows;
  return rows.filter((r) => (r.status ?? 'Active') === status);
}

/** Newest effective date first. ISO dates sort correctly as plain text. */
export const byEffdateDesc = (a: PriceRow, b: PriceRow) => b.effdate.localeCompare(a.effdate);
