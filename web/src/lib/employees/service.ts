import { supabaseAdmin } from '@/lib/supabase/admin';
import type { EmployeeRow } from './filter';

type Actor = { role: string };

// Column names follow Geliz's v_employee_current_job (empno, lastname, firstname); gender, birthdate, hiredate,
// sepdate, stamp and is_deleted are assumed to be named the same way. Change SELECT / USER_SELECT if they differ.
const SELECT = 'empno, lastname, firstname, gender, birthdate, hiredate, sepdate, stamp, is_deleted';
const USER_SELECT = 'empno, lastname, firstname, gender, birthdate, hiredate, sepdate';

type DbEmployee = Omit<EmployeeRow, 'status' | 'stamp'> & { stamp: string | null; is_deleted: boolean };

// Turns a Supabase error object into a normal Error, so the overlay shows the real code and message.
const asError = (e: { message?: string; code?: string; details?: string }) =>
  new Error(`[${e.code ?? '?'}] ${e.message ?? 'Database error'}${e.details ? ` (${e.details})` : ''}`);

/** is_deleted is the one true "deleted" flag: false = Active, true = Inactive. It never leaves the server. */
function toRow(r: DbEmployee): EmployeeRow {
  const { is_deleted, stamp, ...rest } = r;
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
    return ((data ?? []) as DbEmployee[]).map(toRow);
  }

  const { data, error } = await supabaseAdmin
    .from('employee')
    .select(USER_SELECT)
    .eq('is_deleted', false)
    .order('empno', { ascending: true });
  if (error) throw asError(error);
  return (data ?? []) as EmployeeRow[];
}