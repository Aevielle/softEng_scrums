import { supabaseAdmin } from '@/lib/supabase/admin';
import type { CurrentUser } from '@/lib/auth/permissions';
import { hasRight } from '@/lib/auth/rights';
import { makeStamp } from '@/lib/stamp';
import { ServiceError } from '@/lib/users/service';
import type { EmployeeRow } from './filter';
import { nextEmpNo, validateEmployeeInput } from './form';
import { EMPLOYEE_RIGHTS, type EmployeeRightName } from './rights';

type Actor = { role: string };

// Column names follow Geliz's v_employee_current_job (empno, lastname, firstname); gender, birthdate, hiredate,
// sepdate, stamp and is_deleted are assumed to be named the same way. Change SELECT / USER_SELECT if they differ.
const SELECT = 'empno, lastname, firstname, gender, birthdate, hiredate, sepdate, stamp, is_deleted';
const USER_SELECT = 'empno, lastname, firstname, gender, birthdate, hiredate, sepdate';

type DbEmployee = Omit<EmployeeRow, 'status' | 'stamp'> & { stamp: string | null; is_deleted: boolean };

// Turns a Supabase error object into a normal Error, so the overlay shows the real code and message.
const asError = (e: { message?: string; code?: string; details?: string }) =>
  new Error(`[${e.code ?? '?'}] ${e.message ?? 'Database error'}${e.details ? ` (${e.details})` : ''}`);

/** is_deleted is the one true "deleted" flag: false = Active, true = Inactive. It never leaves the server.
 *  Same shape the list uses: Admins get status + stamp, a User never does. */
function toRow(r: DbEmployee, actor: Actor): EmployeeRow {
  const { is_deleted, stamp, ...rest } = r;
  if (actor.role === 'user') return rest;
  return { ...rest, status: is_deleted ? 'Inactive' : 'Active', stamp };
}

/**
 * What each role receives:
 *  - Admin / Superadmin: every employee, with Status and Stamp (deleted rows included, so the page can shade them).
 *  - User: Active employees only, and the Status / Stamp fields are not even selected.
 */
export async function listEmployees(actor: Actor): Promise<EmployeeRow[]> {
  if (actor.role !== 'user') {
    const { data, error } = await supabaseAdmin.from('employee').select(SELECT).order('empno', { ascending: true });
    if (error) throw asError(error);
    return ((data ?? []) as DbEmployee[]).map((r) => toRow(r, actor));
  }

  const { data, error } = await supabaseAdmin
    .from('employee')
    .select(USER_SELECT)
    .eq('is_deleted', false)
    .order('empno', { ascending: true });
  if (error) throw asError(error);
  return (data ?? []) as EmployeeRow[];
}

// ---------------------------------------------------------------------------
// Add / Edit (S3-DEV-04). Both check the right on the server, validate again, and write the Stamp.
// ---------------------------------------------------------------------------

async function requireRight(actor: CurrentUser, rightName: EmployeeRightName) {
  if (!(await hasRight(actor, rightName))) {
    throw new ServiceError(403, 'FORBIDDEN', `You need the "${rightName}" right to do this.`, 'Not allowed');
  }
}

function checked(input: unknown) {
  const v = validateEmployeeInput((input && typeof input === 'object' ? input : {}) as Record<string, unknown>);
  if (!v.ok) throw new ServiceError(400, 'INVALID', v.error.message, v.error.title, v.error.fields);
  return v.value;
}

// Postgres errors the form can explain: 23514 = CHECK failed, 22001 = text too long, 22007/22008 = bad date.
function dbProblem(e: { code?: string }) {
  if (e.code === '23514') return new ServiceError(400, 'INVALID', 'That value is not allowed. Check the highlighted fields.', 'Wrong Value');
  if (e.code === '22001') return new ServiceError(400, 'INVALID', 'Please shorten the highlighted field.', 'Too long');
  if (e.code === '22007' || e.code === '22008') return new ServiceError(400, 'INVALID', 'Enter real dates.', 'Wrong Value');
  return null;
}

export async function createEmployee(actor: CurrentUser, input: unknown) {
  await requireRight(actor, EMPLOYEE_RIGHTS.add);
  const value = checked(input);

  // The number is chosen here, never by the browser. If two people save at the same moment they can pick the
  // same number: the primary key refuses the second one (23505), so we read again and take the next number.
  for (let attempt = 0; attempt < 3; attempt++) {
    const latest = await supabaseAdmin.from('employee').select('empno').order('empno', { ascending: false }).limit(20);
    if (latest.error) throw latest.error;
    const empno = nextEmpNo((latest.data ?? []).map((r) => String(r.empno)));

    const { data, error } = await supabaseAdmin
      .from('employee')
      .insert({ empno, ...value, stamp: makeStamp('CREATED', actor.email), is_deleted: false })
      .select(SELECT)
      .single();

    if (!error) return { employee: toRow(data as DbEmployee, actor) };
    if (error.code !== '23505') throw dbProblem(error) ?? error;
  }
  throw new ServiceError(409, 'CONFLICT', 'Someone else added an employee at the same time. Please save again.', 'Try again');
}

export async function updateEmployee(actor: CurrentUser, empno: string, input: unknown) {
  await requireRight(actor, EMPLOYEE_RIGHTS.edit);
  const value = checked(input); // the employee number is never taken from the body

  // The .eq('is_deleted', false) makes "not deleted" part of the update itself, so a deleted employee can
  // never be edited, even if it was deleted a second ago.
  const { data, error } = await supabaseAdmin
    .from('employee')
    .update({ ...value, stamp: makeStamp('EDITED', actor.email) })
    .eq('empno', empno)
    .eq('is_deleted', false)
    .select(SELECT);
  if (error) throw dbProblem(error) ?? error;
  if (data?.length) return { employee: toRow(data[0] as DbEmployee, actor) };

  // Nothing updated: it does not exist, or it is deleted.
  const existing = await supabaseAdmin.from('employee').select('empno').eq('empno', empno).maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data) throw new ServiceError(404, 'NOT_FOUND', 'That employee no longer exists.', 'Not found');
  throw new ServiceError(409, 'DELETED', 'This employee is deleted. Restore it before editing.', 'Cannot edit');
}

// ---------------------------------------------------------------------------
// Delete / Restore (S3-DEV-05).
// "Deleted" means the RECORD is deleted (is_deleted = true, shown as Inactive). It says nothing about whether the
// person left the company: that is sepdate, which Delete and Restore never read and never change. So E-004 can be
// deleted AND carry a separation date, and restoring it brings back the same sepdate.
// ---------------------------------------------------------------------------

/** Geliz's trigger (S3-DBA-04) raises a plain exception such as "Cannot delete employee (E-001): 2 active sales
 *  record(s) still reference this employee." Postgres reports a RAISE EXCEPTION as code P0001; we show its text as is. */
function deleteRefusal(e: { code?: string; message?: string }) {
  if (e.code === 'P0001' && /^Cannot delete/i.test(e.message ?? '')) {
    return new ServiceError(409, 'HAS_CHILDREN', e.message as string, 'Cannot delete');
  }
  return null;
}

/** After an update touched no row: say whether the employee is gone or was already in the other state. */
async function whyNotChanged(empno: string, already: string) {
  const existing = await supabaseAdmin.from('employee').select('empno').eq('empno', empno).maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data) return new ServiceError(404, 'NOT_FOUND', 'That employee no longer exists.', 'Not found');
  return new ServiceError(409, 'CONFLICT', already, 'Nothing to do');
}

export async function deleteEmployee(actor: CurrentUser, empno: string) {
  await requireRight(actor, EMPLOYEE_RIGHTS.delete);

  // .eq('is_deleted', false) is part of the update itself, so two people pressing Delete at once cannot both "win".
  // Only is_deleted and the Stamp change: sepdate and every other column stay exactly as they were.
  const { data, error } = await supabaseAdmin
    .from('employee')
    .update({ is_deleted: true, stamp: makeStamp('DELETED', actor.email) })
    .eq('empno', empno)
    .eq('is_deleted', false)
    .select(SELECT);
  if (error) throw deleteRefusal(error) ?? error;
  if (data?.length) return { employee: toRow(data[0] as DbEmployee, actor) };

  throw await whyNotChanged(empno, 'This employee is already deleted.');
}

export async function restoreEmployee(actor: CurrentUser, empno: string) {
  // Restore is Admin / Superadmin only and has no right of its own. A User never even receives deleted rows.
  if (actor.role === 'user') {
    throw new ServiceError(403, 'FORBIDDEN', 'Only an Admin can restore an employee.', 'Not allowed');
  }

  const { data, error } = await supabaseAdmin
    .from('employee')
    .update({ is_deleted: false, stamp: makeStamp('EDITED', actor.email) })
    .eq('empno', empno)
    .eq('is_deleted', true)
    .select(SELECT);
  if (error) throw error;
  if (data?.length) return { employee: toRow(data[0] as DbEmployee, actor) };

  throw await whyNotChanged(empno, 'This employee is already active.');
}