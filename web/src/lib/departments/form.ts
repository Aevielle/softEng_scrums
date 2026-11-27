// Rules for the Add / Edit Department form, shared by the form (browser) and the API routes (server),
// so the same value gets the same answer in both places. No server-only imports: bundled into the browser.

// Name length limit. Set it to the real column size of department.deptname.
export const DEPT_NAME_MAX = 30;

export type DepartmentField = 'deptname';
export type DepartmentInput = { deptname: string };

export type FieldProblem = {
  title: string; // short heading, shown in bold in the toast
  message: string;
  fields: DepartmentField[]; // inputs to highlight
};

export type Checked = { ok: true; value: DepartmentInput } | { ok: false; error: FieldProblem };

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function validateDepartmentInput(input: Record<string, unknown>): Checked {
  const deptname = text(input.deptname);

  if (!deptname) {
    return { ok: false, error: { title: 'Empty Field', message: 'Please fill in: Name.', fields: ['deptname'] } };
  }
  if (deptname.length > DEPT_NAME_MAX) {
    return {
      ok: false,
      error: { title: 'Too long', message: `Name can have at most ${DEPT_NAME_MAX} characters.`, fields: ['deptname'] },
    };
  }
  return { ok: true, value: { deptname } };
}

/**
 * Next department code from the codes already in the table: D-009 -> D-010.
 * It keeps the style of the highest existing code (with or without the dash, same number of digits),
 * and starts at D-001 on an empty table. Pass EVERY code, deleted ones included, so a code is never reused.
 */
export function nextDeptCode(existing: string[]): string {
  let max = 0;
  let dash = '-';
  let width = 3;
  for (const e of existing) {
    const m = /^D(-?)(\d+)$/i.exec(e.trim());
    if (!m) continue;
    const n = Number(m[2]);
    if (n >= max) {
      max = n;
      dash = m[1];
      width = Math.max(3, m[2].length);
    }
  }
  return `D${dash}${String(max + 1).padStart(width, '0')}`;
}
