// Pure helpers shared by the page (browser) and the API route, so search and tabs behave the same everywhere.
// No server-only imports here: this file is bundled into the browser. (Same idea as lib/customers/filter.ts.)

export type StatusTab = 'Active' | 'Inactive' | 'All';

export type EmployeeRow = {
  empno: string;
  lastname: string;
  firstname: string;
  gender: string | null;
  /** DATE columns arrive as "YYYY-MM-DD" text; they are shown as-is, never run through Date (no time-zone shift). */
  birthdate: string | null;
  hiredate: string | null;
  sepdate: string | null;
  /** Only present for Admin / Superadmin. A User never receives these two fields. */
  status?: 'Active' | 'Inactive';
  stamp?: string | null;
};

export function countByStatus(rows: EmployeeRow[]) {
  const active = rows.filter((r) => r.status === 'Active').length;
  return { Active: active, Inactive: rows.length - active, All: rows.length };
}

/**
 * Search runs on every column the list shows, plus the full name in both orders
 * ("Maria Santos" and "Santos Maria" both find E-001). Case and outer spaces are ignored.
 * Rows without a `status` (a User's rows) are never removed by the status tab.
 */
export function filterEmployees(rows: EmployeeRow[], opts: { q?: string; status?: StatusTab }): EmployeeRow[] {
  const q = (opts.q ?? '').trim().toLowerCase();
  const status = opts.status ?? 'All';

  return rows.filter((r) => {
    if (status !== 'All' && r.status !== undefined && r.status !== status) return false;
    if (!q) return true;
    const first = r.firstname ?? '';
    const last = r.lastname ?? '';
    return [r.empno, last, first, `${first} ${last}`, `${last} ${first}`, r.gender, r.birthdate, r.hiredate, r.sepdate].some((v) =>
      (v ?? '').toLowerCase().includes(q)
    );
  });
}