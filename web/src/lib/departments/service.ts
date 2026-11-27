import { supabaseAdmin } from '@/lib/supabase/admin';
import type { CurrentUser } from '@/lib/auth/permissions';
import { hasRight } from '@/lib/auth/rights';
import { makeStamp } from '@/lib/stamp';
import { ServiceError } from '@/lib/users/service';
import type { DepartmentRow } from './filter';
import { nextDeptCode, validateDepartmentInput } from './form';
import { DEPARTMENT_RIGHTS, type DepartmentRightName } from './rights';

type Actor = { role: string };

// Columns of the department table: deptcode, deptname, stamp, is_deleted (same stamp / is_deleted style as employee).
// Change SELECT / USER_SELECT if they are named differently.
const SELECT = 'deptcode, deptname, stamp, is_deleted';
const USER_SELECT = 'deptcode, deptname';

type DbDepartment = Omit<DepartmentRow, 'status' | 'stamp'> & { stamp: string | null; is_deleted: boolean };

// Turns a Supabase error object into a normal Error, so the overlay shows the real code and message.
const asError = (e: { message?: string; code?: string; details?: string }) =>
  new Error(`[${e.code ?? '?'}] ${e.message ?? 'Database error'}${e.details ? ` (${e.details})` : ''}`);

/** is_deleted is the one true "deleted" flag: false = Active, true = Inactive. It never leaves the server.
 *  Same shape the list uses: Admins get status + stamp, a User never does. */
function toRow(r: DbDepartment, actor: Actor): DepartmentRow {
  const { is_deleted, stamp, ...rest } = r;
  if (actor.role === 'user') return rest;
  return { ...rest, status: is_deleted ? 'Inactive' : 'Active', stamp };
}

/**
 * What each role receives:
 *  - Admin / Superadmin: every department, with Status and Stamp (deleted rows included, so the page can shade them).
 *  - User: Active departments only, and the Status / Stamp fields are not even selected.
 */
export async function listDepartments(actor: Actor): Promise<DepartmentRow[]> {
  if (actor.role !== 'user') {
    const { data, error } = await supabaseAdmin.from('department').select(SELECT).order('deptcode', { ascending: true });
    if (error) throw asError(error);
    return ((data ?? []) as DbDepartment[]).map((r) => toRow(r, actor));
  }

  const { data, error } = await supabaseAdmin
    .from('department')
    .select(USER_SELECT)
    .eq('is_deleted', false)
    .order('deptcode', { ascending: true });
  if (error) throw asError(error);
  return (data ?? []) as DepartmentRow[];
}

// ---------------------------------------------------------------------------
// Add / Edit / Delete / Restore. Each one checks who is allowed on the server, validates again, and writes the Stamp.
// ---------------------------------------------------------------------------

async function requireRight(actor: CurrentUser, rightName: DepartmentRightName) {
  if (!(await hasRight(actor, rightName))) {
    throw new ServiceError(403, 'FORBIDDEN', `You need the "${rightName}" right to do this.`, 'Not allowed');
  }
}

function requireAdmin(actor: CurrentUser) {
  if (actor.role === 'user') {
    throw new ServiceError(403, 'FORBIDDEN', 'Only an Admin or Superadmin can restore a department.', 'Not allowed');
  }
}

function checked(input: unknown) {
  const v = validateDepartmentInput((input && typeof input === 'object' ? input : {}) as Record<string, unknown>);
  if (!v.ok) throw new ServiceError(400, 'INVALID', v.error.message, v.error.title, v.error.fields);
  return v.value;
}

// Postgres errors the form can explain: 23514 = CHECK failed, 22001 = text too long.
function dbProblem(e: { code?: string }) {
  if (e.code === '23514') return new ServiceError(400, 'INVALID', 'That value is not allowed. Check the highlighted fields.', 'Wrong Value');
  if (e.code === '22001') return new ServiceError(400, 'INVALID', 'Please shorten the highlighted field.', 'Too long');
  return null;
}

// Same wording as the S3-DBA-04 trigger (trg_check_children), so the message is the same whichever one catches it.
const inUse = (deptcode: string, n: number) =>
  new ServiceError(
    409,
    'IN_USE',
    `Cannot delete department (${deptcode}): ${n} active job history record(s) still use this department.`,
    'Cannot delete'
  );

export async function createDepartment(actor: CurrentUser, input: unknown) {
  await requireRight(actor, DEPARTMENT_RIGHTS.add);
  const value = checked(input);

  // The code is chosen here, never by the browser. It is worked out from EVERY code in the table (deleted ones too),
  // so a code is never reused. If two people save at the same moment they can pick the same code: the primary key
  // refuses the second one (23505), so we read again and take the next code.
  for (let attempt = 0; attempt < 3; attempt++) {
    const codes = await supabaseAdmin.from('department').select('deptcode');
    if (codes.error) throw asError(codes.error);
    const deptcode = nextDeptCode((codes.data ?? []).map((r) => String(r.deptcode)));

    const { data, error } = await supabaseAdmin
      .from('department')
      .insert({ deptcode, ...value, stamp: makeStamp('CREATED', actor.email), is_deleted: false })
      .select(SELECT)
      .single();

    if (!error) return { department: toRow(data as DbDepartment, actor) };
    if (error.code !== '23505') throw dbProblem(error) ?? asError(error);
  }
  throw new ServiceError(409, 'CONFLICT', 'Someone else added a department at the same time. Please save again.', 'Try again');
}

/** Nothing was updated: tell "does not exist" apart from "is in the wrong state" (409). */
async function explainNoChange(deptcode: string, conflict: ServiceError): Promise<never> {
  const existing = await supabaseAdmin.from('department').select('deptcode').eq('deptcode', deptcode).maybeSingle();
  if (existing.error) throw asError(existing.error);
  if (!existing.data) throw new ServiceError(404, 'NOT_FOUND', 'That department no longer exists.', 'Not found');
  throw conflict;
}

export async function updateDepartment(actor: CurrentUser, deptcode: string, input: unknown) {
  await requireRight(actor, DEPARTMENT_RIGHTS.edit);
  const value = checked(input); // the department code is never taken from the body

  // The .eq('is_deleted', false) makes "not deleted" part of the update itself, so a deleted department can
  // never be edited, even if it was deleted a second ago.
  const { data, error } = await supabaseAdmin
    .from('department')
    .update({ ...value, stamp: makeStamp('EDITED', actor.email) })
    .eq('deptcode', deptcode)
    .eq('is_deleted', false)
    .select(SELECT);
  if (error) throw dbProblem(error) ?? asError(error);
  if (data?.length) return { department: toRow(data[0] as DbDepartment, actor) };

  return explainNoChange(deptcode, new ServiceError(409, 'DELETED', 'This department is deleted. Restore it before editing.', 'Cannot edit'));
}

export async function deleteDepartment(actor: CurrentUser, deptcode: string) {
  await requireRight(actor, DEPARTMENT_RIGHTS.delete);

  // Refused while any ACTIVE job history row still uses this department (S3-DBA-04 rule).
  const used = await supabaseAdmin
    .from('jobhistory')
    .select('deptcode', { count: 'exact', head: true })
    .eq('deptcode', deptcode)
    .eq('is_deleted', false);
  if (used.error) throw asError(used.error);
  if ((used.count ?? 0) > 0) throw inUse(deptcode, used.count ?? 0);

  // Soft delete: the row stays, is_deleted = true (shown as Inactive). The S3-DBA-04 trigger checks the same rule
  // inside the database, which also catches a job history row added between the check above and this update.
  const { data, error } = await supabaseAdmin
    .from('department')
    .update({ is_deleted: true, stamp: makeStamp('DELETED', actor.email) })
    .eq('deptcode', deptcode)
    .eq('is_deleted', false)
    .select(SELECT);
  if (error) {
    if (error.code === 'P0001') throw inUse(deptcode, 1); // raised by trg_check_children
    throw dbProblem(error) ?? asError(error);
  }
  if (data?.length) return { department: toRow(data[0] as DbDepartment, actor) };

  return explainNoChange(deptcode, new ServiceError(409, 'DELETED', 'This department is already deleted.', 'Already deleted'));
}

export async function restoreDepartment(actor: CurrentUser, deptcode: string) {
  requireAdmin(actor);

  const { data, error } = await supabaseAdmin
    .from('department')
    .update({ is_deleted: false, stamp: makeStamp('EDITED', actor.email) })
    .eq('deptcode', deptcode)
    .eq('is_deleted', true)
    .select(SELECT);
  if (error) throw dbProblem(error) ?? asError(error);
  if (data?.length) return { department: toRow(data[0] as DbDepartment, actor) };

  return explainNoChange(deptcode, new ServiceError(409, 'NOT_DELETED', 'This department is already active.', 'Already active'));
}
