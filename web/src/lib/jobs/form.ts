// Rules for the Add / Edit Job form, shared by the form (browser) and the API routes (server),
// so the same value gets the same answer in both places. No server-only imports: bundled into the browser.

// Description length limit. Set it to the real column size of job.jobdesc.
export const JOB_DESC_MAX = 30;

export type JobField = 'jobdesc';
export type JobInput = { jobdesc: string };

export type FieldProblem = {
  title: string; // short heading, shown in bold in the toast
  message: string;
  fields: JobField[]; // inputs to highlight
};

export type Checked = { ok: true; value: JobInput } | { ok: false; error: FieldProblem };

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export function validateJobInput(input: Record<string, unknown>): Checked {
  const jobdesc = text(input.jobdesc);

  if (!jobdesc) {
    return { ok: false, error: { title: 'Check the form', message: 'Description is required.', fields: ['jobdesc'] } };
  }
  if (jobdesc.length > JOB_DESC_MAX) {
    return {
      ok: false,
      error: { title: 'Too long', message: `Description can have at most ${JOB_DESC_MAX} characters.`, fields: ['jobdesc'] },
    };
  }
  return { ok: true, value: { jobdesc } };
}

// Longest code the job.jobcode column holds. The database column is varchar(4), so the codes are J001, J002 ...
// (the figures show J-001, which is 5 characters and does not fit). If the column is ever widened, set this to the
// new size:   5 -> J-001   4 -> J001   3 -> J01
// If a code does not fit, saving says "Too long" and shows the database's own message, which names the column size.
export const JOB_CODE_MAX = 4;
const JOB_CODE_PREFIX = 'J';

/**
 * Next job code from the codes already in the table: J009 -> J010.
 * Any existing code written as J + number (J-001, J001, J01) is counted; other codes (ACCT, CLK1 ...) are ignored.
 * Pass EVERY code, deleted ones included, so a code is never reused.
 * Returns null when the numbers no longer fit in JOB_CODE_MAX characters.
 */
export function nextJobCode(existing: string[]): string | null {
  let max = 0;
  for (const e of existing) {
    const m = /^J-?(\d+)$/i.exec(e.trim());
    if (m) max = Math.max(max, Number(m[1]));
  }

  const digits = String(max + 1);
  const dash = JOB_CODE_MAX >= 5 ? '-' : '';
  const room = JOB_CODE_MAX - JOB_CODE_PREFIX.length - dash.length; // digits that fit after the prefix
  if (room < 1 || digits.length > room) return null;
  return `${JOB_CODE_PREFIX}${dash}${digits.padStart(Math.min(3, room), '0')}`;
}