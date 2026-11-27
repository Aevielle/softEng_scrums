// Pure helpers shared by the page (client) and the API route, so search and tabs behave the same everywhere.
// No server-only imports here: this file is bundled into the browser.

export type StatusTab = 'Active' | 'Inactive' | 'All';

export type ProductRow = {
  prodcode: string;
  description: string | null;
  unit: string | null;
  /** Current price (latest pricehist row on or before today). null = no price yet, shown as a dash. */
  price: number | null;
  /** Only present for Admin / Superadmin. A User never receives these two fields. */
  status?: 'Active' | 'Inactive';
  stamp?: string | null;
};

export function countByStatus(rows: ProductRow[]) {
  const active = rows.filter((r) => r.status === 'Active').length;
  return { Active: active, Inactive: rows.length - active, All: rows.length };
}

export function filterProducts(rows: ProductRow[], opts: { q?: string; status?: StatusTab }): ProductRow[] {
  const q = (opts.q ?? '').trim().toLowerCase();
  const status = opts.status ?? 'All';

  return rows.filter((r) => {
    if (status !== 'All' && r.status !== undefined && r.status !== status) return false;
    if (!q) return true;
    return [r.prodcode, r.description, r.unit].some((v) => (v ?? '').toLowerCase().includes(q));
  });
}

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** "$13.75", or a dash when the product has no price yet. */
export const formatPrice = (price: number | null | undefined) => (price == null ? '—' : usd.format(price));