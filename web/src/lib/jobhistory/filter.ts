// Pure helpers shared by the dialog (browser) and the service, so order and tabs behave the same everywhere.
// No server-only imports here: this file is bundled into the browser. (Same idea as lib/jobs/filter.ts.)

export type StatusTab = 'Active' | 'Inactive' | 'All';

export type HistoryRow = {
  /** DATE column, "YYYY-MM-DD" text: shown as-is, never run through Date (no time-zone shift). */
  effdate: string;
  jobcode: string;
  deptcode: string;
  salary: number;
  /** Only present for Admin / Superadmin. A User never receives these two fields. */
  status?: 'Active' | 'Inactive';
  stamp?: string | null;
};

/** Newest effective date first (YYYY-MM-DD text sorts the same as the dates themselves). */
export function newestFirst(rows: HistoryRow[]): HistoryRow[] {
  return [...rows].sort((a, b) => b.effdate.localeCompare(a.effdate));
}

/** A deleted row never counts. Rows without a `status` (a User's rows) are always active. */
export const isActive = (r: HistoryRow) => r.status !== 'Inactive';

/**
 * The current job is the ACTIVE row with the latest effective date.
 * Returns that row's effdate, or null when the employee has no active history. (Two active rows can never share an
 * effdate for one employee, so the date alone identifies the row.)
 */
export function currentEffdate(rows: HistoryRow[]): string | null {
  let latest: string | null = null;
  for (const r of rows) if (isActive(r) && (latest === null || r.effdate > latest)) latest = r.effdate;
  return latest;
}

/** Status tab for the Admin view. Rows without a `status` are never removed by a tab. */
export function filterHistory(rows: HistoryRow[], status: StatusTab): HistoryRow[] {
  return rows.filter((r) => status === 'All' || r.status === undefined || r.status === status);
}
