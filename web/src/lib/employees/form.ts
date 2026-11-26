// Rules for the Add / Edit Employee form, shared by the form (browser) and the API routes (server),
// so the same value gets the same answer in both places. No server-only imports: bundled into the browser.

export const GENDERS = ['F', 'M'] as const;

// Name length limits. Set them to the real column sizes of employee.lastname / employee.firstname.
export const LAST_MAX = 30;
export const FIRST_MAX = 30;

export type EmployeeField = 'lastname' | 'firstname' | 'gender' | 'birthdate' | 'hiredate' | 'sepdate';
export type EmployeeInput = {
  lastname: string;
  firstname: string;
  gender: string;
  birthdate: string;
  hiredate: string;
  sepdate: string | null; // optional: null while the person is still employed
};

export type FieldProblem = {
  title: string; // short heading, shown in bold in the toast
  message: string;
  fields: EmployeeField[]; // inputs to highlight
};

export type Checked = { ok: true; value: EmployeeInput } | { ok: false; error: FieldProblem };

const LABEL: Record<EmployeeField, string> = {
  lastname: 'Last name',
  firstname: 'First name',
  gender: 'Gender',
  birthdate: 'Birth date',
  hiredate: 'Hire date',
  sepdate: 'Separation date',
};

/** "2026-02-30" is not a date, even though it looks like one. */
function isRealDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function validateEmployeeInput(input: Record<string, unknown>): Checked {
  const lastname = text(input.lastname);
  const firstname = text(input.firstname);
  const gender = text(input.gender);
  const birthdate = text(input.birthdate);
  const hiredate = text(input.hiredate);
  const sepdate = text(input.sepdate); // may stay empty

  // 1) Empty required fields (the separation date is the only optional one)
  const empty = (
    [['lastname', lastname], ['firstname', firstname], ['gender', gender], ['birthdate', birthdate], ['hiredate', hiredate]] as const
  )
    .filter(([, v]) => !v)
    .map(([k]) => k as EmployeeField);
  if (empty.length) {
    return {
      ok: false,
      error: { title: 'Empty Field', message: `Please fill in: ${empty.map((k) => LABEL[k]).join(', ')}.`, fields: empty },
    };
  }

  // 2) Wrong values
  if (!(GENDERS as readonly string[]).includes(gender)) {
    return { ok: false, error: { title: 'Wrong Value', message: 'Choose the gender from the list.', fields: ['gender'] } };
  }
  const badDates = (
    [['birthdate', birthdate], ['hiredate', hiredate], ['sepdate', sepdate]] as const
  )
    .filter(([, v]) => v && !isRealDate(v))
    .map(([k]) => k as EmployeeField);
  if (badDates.length) {
    return {
      ok: false,
      error: { title: 'Wrong Value', message: `Enter a real date for: ${badDates.map((k) => LABEL[k]).join(', ')}.`, fields: badDates },
    };
  }
  const tooLong: EmployeeField[] = [];
  if (lastname.length > LAST_MAX) tooLong.push('lastname');
  if (firstname.length > FIRST_MAX) tooLong.push('firstname');
  if (tooLong.length) {
    return {
      ok: false,
      error: {
        title: 'Too long',
        message: tooLong.map((k) => `${LABEL[k]} can have at most ${k === 'lastname' ? LAST_MAX : FIRST_MAX} characters.`).join(' '),
        fields: tooLong,
      },
    };
  }

  // 3) Dates against each other (YYYY-MM-DD text sorts the same as the dates themselves)
  if (hiredate < birthdate) {
    return {
      ok: false,
      error: { title: 'Wrong Dates', message: 'Hire date cannot be before the birth date.', fields: ['hiredate'] },
    };
  }
  if (sepdate && sepdate < hiredate) {
    return {
      ok: false,
      error: { title: 'Wrong Dates', message: 'Separation date cannot be before the hire date.', fields: ['sepdate'] },
    };
  }

  return { ok: true, value: { lastname, firstname, gender, birthdate, hiredate, sepdate: sepdate || null } };
}

/**
 * Next employee number from the numbers already in the table: E-009 -> E-010.
 * It keeps the style of the highest existing number (with or without the dash, same number of digits),
 * and starts at E-001 on an empty table.
 */
export function nextEmpNo(existing: string[]): string {
  let max = 0;
  let dash = '-';
  let width = 3;
  for (const e of existing) {
    const m = /^E(-?)(\d+)$/i.exec(e.trim());
    if (!m) continue;
    const n = Number(m[2]);
    if (n >= max) {
      max = n;
      dash = m[1];
      width = Math.max(3, m[2].length);
    }
  }
  return `E${dash}${String(max + 1).padStart(width, '0')}`;
}