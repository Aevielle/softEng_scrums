// Rules for the Add / Edit Job History form, shared by the form (browser) and the API routes (server),
// so the same value gets the same answer in both places. No server-only imports: bundled into the browser.

// Largest salary the form accepts. Set it to what the jobhistory.salary column can hold.
export const SALARY_MAX = 9999999.99;

export type HistoryField = 'effdate' | 'jobcode' | 'deptcode' | 'salary';
export type HistoryInput = {
  effdate: string; // YYYY-MM-DD
  jobcode: string;
  deptcode: string;
  salary: number;
};

export type FieldProblem = {
  title: string; // short heading, shown in bold in the toast
  message: string;
  fields: HistoryField[]; // inputs to highlight
};

export type Checked = { ok: true; value: HistoryInput } | { ok: false; error: FieldProblem };

const LABEL: Record<HistoryField, string> = {
  effdate: 'Effective date',
  jobcode: 'Job',
  deptcode: 'Department',
  salary: 'Salary',
};

/** "2026-02-30" is not a date, even though it looks like one. */
export function isRealDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

const text = (v: unknown) => (typeof v === 'number' ? String(v) : typeof v === 'string' ? v.trim() : '');

export function validateHistoryInput(input: Record<string, unknown>): Checked {
  const effdate = text(input.effdate);
  const jobcode = text(input.jobcode);
  const deptcode = text(input.deptcode);
  const salary = text(input.salary);

  // 1) Empty fields (all four are required)
  const empty = (
    [['effdate', effdate], ['jobcode', jobcode], ['deptcode', deptcode], ['salary', salary]] as const
  )
    .filter(([, v]) => !v)
    .map(([k]) => k as HistoryField);
  if (empty.length) {
    return {
      ok: false,
      error: { title: 'Empty Field', message: `Please fill in: ${empty.map((k) => LABEL[k]).join(', ')}.`, fields: empty },
    };
  }

  // 2) Wrong values
  if (!isRealDate(effdate)) {
    return { ok: false, error: { title: 'Wrong Value', message: 'Enter a real date for: Effective date.', fields: ['effdate'] } };
  }
  // digits with at most 2 decimals: "52000", "52000.5", "52000.50". No signs, commas or exponents.
  if (!/^\d+(\.\d{1,2})?$/.test(salary) || !(Number(salary) > 0)) {
    return {
      ok: false,
      error: { title: 'Wrong Value', message: 'Salary must be more than zero, with at most 2 decimals.', fields: ['salary'] },
    };
  }
  if (Number(salary) > SALARY_MAX) {
    return {
      ok: false,
      error: { title: 'Wrong Value', message: `Salary can be at most ${SALARY_MAX.toLocaleString('en-US')}.`, fields: ['salary'] },
    };
  }

  return { ok: true, value: { effdate, jobcode, deptcode, salary: Number(salary) } };
}
