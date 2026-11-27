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

// Department codes are short in the database (ACT, BR1, IT, PAY ...), so "D-001" does not fit.
// Set DEPT_CODE_MAX to the real column size of department.deptcode (3 = D01 ... D99; 5 = D0001 ... D9999).
export const DEPT_CODE_MAX = 3;
export const DEPT_CODE_PREFIX = 'D';

/**
 * Next department code from the codes already in the table: D09 -> D10.
 * Only codes in this style are counted (ACT, BR1 ... are ignored). Pass EVERY code, deleted ones included,
 * so a code is never reused. Returns null when the style has no numbers left (D99 with 3 characters).
 */
export function nextDeptCode(existing: string[]): string | null {
  const width = DEPT_CODE_MAX - DEPT_CODE_PREFIX.length;
  if (width < 1) return null;
  const style = new RegExp(`^${DEPT_CODE_PREFIX}(\\d{${width}})$`, 'i');

  let max = 0;
  for (const e of existing) {
    const m = style.exec(e.trim());
    if (m) max = Math.max(max, Number(m[1]));
  }
  const next = max + 1;
  if (next >= 10 ** width) return null;
  return `${DEPT_CODE_PREFIX}${String(next).padStart(width, '0')}`;
}