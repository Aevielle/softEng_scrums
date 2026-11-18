// Pure helpers shared by the page (client) and the API route, so search and tabs behave the same everywhere.
// No server-only imports here: this file is bundled into the browser.

export type StatusTab = 'Active' | 'Inactive' | 'All';

export type CustomerRow = {
  custno: string;
  custname: string;
  address: string | null;
  payterm: string | null;
  /** Only present for Admin / Superadmin. A User never receives these two fields. */
  status?: 'Active' | 'Inactive';
  stamp?: string | null;
};

export function countByStatus(rows: CustomerRow[]) {
  const active = rows.filter((r) => r.status === 'Active').length;
  return { Active: active, Inactive: rows.length - active, All: rows.length };
}

export function filterCustomers(rows: CustomerRow[], opts: { q?: string; status?: StatusTab }): CustomerRow[] {
  const q = (opts.q ?? '').trim().toLowerCase();
  const status = opts.status ?? 'All';

  return rows.filter((r) => {
    if (status !== 'All' && r.status !== status) return false;
    if (!q) return true;
    return [r.custno, r.custname, r.address, r.payterm].some((v) => (v ?? '').toLowerCase().includes(q));
  });
}
