import { supabaseAdmin } from '@/lib/supabase/admin';
import type { CurrentUser } from '@/lib/auth/permissions';
import { hasRight } from '@/lib/auth/rights';
import { makeStamp } from '@/lib/stamp';
import { ServiceError } from '@/lib/users/service';
import { isRealDate, validateHistoryInput, type HistoryField } from './form';
import type { HistoryRow } from './filter';
import { JOBHISTORY_RIGHTS, type JobHistoryRightName } from './rights';

type Actor = { role: string };

// Columns of the jobhistory table: empno, effdate, jobcode, deptcode, salary, stamp, is_deleted (same stamp /
// is_deleted style as the other tables; empno, effdate, jobcode, deptcode and is_deleted are the names Geliz's
// S3-DBA-02 and S3-DBA-04 use). Change SELECT / USER_SELECT if "salary" or "stamp" are named differently.
const SELECT = 'effdate, jobcode, deptcode, salary, stamp, is_deleted';
const USER_SELECT = 'effdate, jobcode, deptcode, salary';

// Name of Geliz's S3-DBA-02 index: "one ACTIVE row per (empno, effdate)". It is how a duplicate date is told apart
// from any other unique key when Postgres says 23505.
const EFFDATE_INDEX = 'uq_jobhistory_active_empno_effdate';

type DbHistory = Omit<HistoryRow, 'status' | 'stamp' | 'salary'> & {
  salary: number | string;
  stamp: string | null;
  is_deleted: boolean;
};

// Turns a Supabase error object into a normal Error, so the overlay shows the real code and message.
const asError = (e: { message?: string; code?: string; details?: string }) =>
  new Error(`[${e.code ?? '?'}] ${e.message ?? 'Database error'}${e.details ? ` (${e.details})` : ''}`);

/** is_deleted is the one true "deleted" flag: false = Active, true = Inactive. It never leaves the server.
 *  Admins get status + stamp, a User never does. A numeric column can arrive as text, so salary is made a number. */
function toRow(r: DbHistory, actor: Actor): HistoryRow {
  const { is_deleted, stamp, salary, ...rest } = r;
  const row = { ...rest, salary: Number(salary) };
  if (actor.role === 'user') return row;
  return { ...row, status: is_deleted ? 'Inactive' : 'Active', stamp };
}

async function requireRight(actor: CurrentUser, rightName: JobHistoryRightName) {
  if (!(await hasRight(actor, rightName))) {
    throw new ServiceError(403, 'FORBIDDEN', `You need the "${rightName}" right to do this.`, 'Not allowed');
  }
}

/** The employee must exist. For a change it must also not be deleted (restore it first). A User never learns that a
 *  deleted employee exists: it is "not found", the same as in the list. */
async function requireEmployee(actor: Actor, empno: string, forChange: boolean) {
  const { data, error } = await supabaseAdmin.from('employee').select('is_deleted').eq('empno', empno).maybeSingle();
  if (error) throw asError(error);
  if (!data || (data.is_deleted && actor.role === 'user')) {
    throw new ServiceError(404, 'NOT_FOUND', 'That employee no longer exists.', 'Not found');
  }
  if (data.is_deleted && forChange) {
    throw new ServiceError(409, 'DELETED', 'This employee is deleted. Restore it before changing job history.', 'Cannot change');
  }
}

/** The job / department chosen must exist and not be deleted (the drop-downs only offer those, but the browser is not trusted). */
async function requireActive(table: 'job' | 'department', column: 'jobcode' | 'deptcode', code: string, field: HistoryField) {
  const { data, error } = await supabaseAdmin.from(table).select(column).eq(column, code).eq('is_deleted', false).maybeSingle();
  if (error) throw asError(error);
  if (!data) {
    const what = table === 'job' ? 'job' : 'department';
    throw new ServiceError(400, 'INVALID', `Choose an active ${what} from the list.`, 'Wrong Value', [field]);
  }
}

const dateTaken = (effdate: string) =>
  new ServiceError(
    409,
    'DUPLICATE_DATE',
    `This employee already has a job history row with effective date ${effdate}. Choose a different date.`,
    'Date already used',
    ['effdate']
  );

/** Is there already an ACTIVE row for this employee on this date? (The S3-DBA-02 index enforces the same rule
 *  inside the database; this check just gives the message before the insert, and still works if the index is missing.) */
async function hasActiveOn(empno: string, effdate: string): Promise<boolean> {
  const { count, error } = await supabaseAdmin
    .from('jobhistory')
    .select('effdate', { count: 'exact', head: true })
    .eq('empno', empno)
    .eq('effdate', effdate)
    .eq('is_deleted', false);
  if (error) throw asError(error);
  return (count ?? 0) > 0;
}

/** Postgres errors the form can explain. 23505 = duplicate key, 23503 = job / department / employee gone,
 *  22003 = number too big, 23514 = CHECK failed, 22007 / 22008 = bad date. */
function dbProblem(e: { code?: string; message?: string }, effdate: string) {
  if (e.code === '23505') {
    if ((e.message ?? '').includes(EFFDATE_INDEX)) return dateTaken(effdate);
    return new ServiceError(
      409,
      'DUPLICATE',
      'A job history row with this effective date and job already exists for this employee (it may be a deleted one). Choose a different date or job.',
      'Already exists',
      ['effdate']
    );
  }
  if (e.code === '23503') return new ServiceError(409, 'GONE', 'The employee, job or department no longer exists. Reload the page.', 'Cannot save');
  if (e.code === '22003') return new ServiceError(400, 'INVALID', 'That salary is too large.', 'Wrong Value', ['salary']);
  if (e.code === '23514') return new ServiceError(400, 'INVALID', 'That value is not allowed. Check the highlighted fields.', 'Wrong Value');
  if (e.code === '22007' || e.code === '22008') return new ServiceError(400, 'INVALID', 'Enter real dates.', 'Wrong Value', ['effdate']);
  return null;
}

function checked(input: unknown) {
  const v = validateHistoryInput((input && typeof input === 'object' ? input : {}) as Record<string, unknown>);
  if (!v.ok) throw new ServiceError(400, 'INVALID', v.error.message, v.error.title, v.error.fields);
  return v.value;
}

/**
 * Job history of one employee, NEWEST effective date first. Needs the "View Job History" right.
 *  - Admin / Superadmin: every row, with Status and Stamp (deleted rows too, for the Inactive tab).
 *  - User: Active rows only, and the Status / Stamp fields are not even selected.
 * The current job is the first Active row (the one with the latest effective date); the dialog marks it.
 */
export async function listHistory(actor: CurrentUser, empno: string): Promise<HistoryRow[]> {
  await requireRight(actor, JOBHISTORY_RIGHTS.view);
  await requireEmployee(actor, empno, false);

  if (actor.role !== 'user') {
    const { data, error } = await supabaseAdmin
      .from('jobhistory')
      .select(SELECT)
      .eq('empno', empno)
      .order('effdate', { ascending: false });
    if (error) throw asError(error);
    return ((data ?? []) as unknown as DbHistory[]).map((r) => toRow(r, actor));
  }

  const { data, error } = await supabaseAdmin
    .from('jobhistory')
    .select(USER_SELECT)
    .eq('empno', empno)
    .eq('is_deleted', false)
    .order('effdate', { ascending: false });
  if (error) throw asError(error);
  return ((data ?? []) as unknown as DbHistory[]).map((r) => toRow(r, actor));
}

export async function createHistory(actor: CurrentUser, empno: string, input: unknown) {
  await requireRight(actor, JOBHISTORY_RIGHTS.add);
  const value = checked(input);
  await requireEmployee(actor, empno, true);
  await requireActive('job', 'jobcode', value.jobcode, 'jobcode');
  await requireActive('department', 'deptcode', value.deptcode, 'deptcode');
  if (await hasActiveOn(empno, value.effdate)) throw dateTaken(value.effdate);

  // empno comes from the URL, Status and Stamp are filled in here: anything the browser sends for them is ignored.
  const { data, error } = await supabaseAdmin
    .from('jobhistory')
    .insert({ empno, ...value, stamp: makeStamp('CREATED', actor.email), is_deleted: false })
    .select(SELECT)
    .single();
  if (error) throw dbProblem(error, value.effdate) ?? asError(error);
  return { entry: toRow(data as unknown as DbHistory, actor) };
}

/** Nothing was updated: tell "no such row" (404) apart from "that row is deleted" (409). */
async function explainNoChange(empno: string, effdate: string): Promise<never> {
  const { count, error } = await supabaseAdmin
    .from('jobhistory')
    .select('effdate', { count: 'exact', head: true })
    .eq('empno', empno)
    .eq('effdate', effdate);
  if (error) throw asError(error);
  if (!count) throw new ServiceError(404, 'NOT_FOUND', 'That job history row no longer exists.', 'Not found');
  throw new ServiceError(409, 'DELETED', 'This job history row is already deleted.', 'Already deleted');
}

// A row is identified by its employee and its effective date: for one employee only ONE active row can have a given
// date (S3-DBA-02), so the date in the URL points at exactly one active row.

export async function updateHistory(actor: CurrentUser, empno: string, effdate: string, input: unknown) {
  await requireRight(actor, JOBHISTORY_RIGHTS.edit);
  const value = checked(input); // the employee is never taken from the body
  if (!isRealDate(effdate)) throw new ServiceError(404, 'NOT_FOUND', 'That job history row no longer exists.', 'Not found');
  await requireEmployee(actor, empno, true);
  await requireActive('job', 'jobcode', value.jobcode, 'jobcode');
  await requireActive('department', 'deptcode', value.deptcode, 'deptcode');
  if (value.effdate !== effdate && (await hasActiveOn(empno, value.effdate))) throw dateTaken(value.effdate);

  // .eq('is_deleted', false) makes "not deleted" part of the update itself, so a deleted row can never be edited.
  const { data, error } = await supabaseAdmin
    .from('jobhistory')
    .update({ ...value, stamp: makeStamp('EDITED', actor.email) })
    .eq('empno', empno)
    .eq('effdate', effdate)
    .eq('is_deleted', false)
    .select(SELECT);
  if (error) throw dbProblem(error, value.effdate) ?? asError(error);
  if (data?.length) return { entry: toRow(data[0] as unknown as DbHistory, actor) };

  return explainNoChange(empno, effdate);
}

export async function deleteHistory(actor: CurrentUser, empno: string, effdate: string) {
  await requireRight(actor, JOBHISTORY_RIGHTS.delete);
  if (!isRealDate(effdate)) throw new ServiceError(404, 'NOT_FOUND', 'That job history row no longer exists.', 'Not found');
  await requireEmployee(actor, empno, true);

  // Soft delete: the row stays, is_deleted = true (shown as Inactive) and the Stamp becomes DELETED. If it was the
  // newest row, the next newest active row is now the current job.
  const { data, error } = await supabaseAdmin
    .from('jobhistory')
    .update({ is_deleted: true, stamp: makeStamp('DELETED', actor.email) })
    .eq('empno', empno)
    .eq('effdate', effdate)
    .eq('is_deleted', false)
    .select(SELECT);
  if (error) throw asError(error);
  if (data?.length) return { entry: toRow(data[0] as unknown as DbHistory, actor) };

  return explainNoChange(empno, effdate);
}
