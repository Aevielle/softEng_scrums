// Pure helpers shared by the page (browser) and the API route, so search and tabs behave the same everywhere.
// No server-only imports here: this file is bundled into the browser. (Same idea as lib/employees/filter.ts.)

export type StatusTab = 'Active' | 'Inactive' | 'All';

export type JobRow = {
  jobcode: string;
  jobdesc: string;
  /** Only present for Admin / Superadmin. A User never receives these two fields. */
  status?: 'Active' | 'Inactive';
  stamp?: string | null;
};

export function countByStatus(rows: JobRow[]) {
  const active = rows.filter((r) => r.status === 'Active').length;
  return { Active: active, Inactive: rows.length - active, All: rows.length };
}

/**
 * Search runs on the code, description, status and stamp (like the mockup). Case and outer spaces are ignored.
 * Rows without a `status` (a User's rows) are never removed by the status tab.
 */
export function filterJobs(rows: JobRow[], opts: { q?: string; status?: StatusTab }): JobRow[] {
  const q = (opts.q ?? '').trim().toLowerCase();
  const status = opts.status ?? 'All';

  return rows.filter((r) => {
    if (status !== 'All' && r.status !== undefined && r.status !== status) return false;
    if (!q) return true;
    return [r.jobcode, r.jobdesc, r.status, r.stamp].some((v) => (v ?? '').toLowerCase().includes(q));
  });
}