import { supabaseAdmin } from '@/lib/supabase/admin';
import type { CurrentUser } from '@/lib/auth/permissions';
import { hasRight } from '@/lib/auth/rights';
import { makeStamp } from '@/lib/stamp';
import { ServiceError } from '@/lib/users/service';
import type { CustomerRow } from './filter';
import { nextCustNo, validateCustomerInput } from './form';

type Actor = { role: string };

const SELECT = 'custno, custname, address, payterm, stamp, is_deleted';

// S2-DBA-04: customer.is_deleted is the one true "deleted" flag (the database trigger reads it too).
// Status is worked out from it: false = Active, true = Inactive. The Stamp is still written for the audit trail.

// Turns a Supabase error object into a normal Error, so the overlay shows the real code and message.
const asError = (e: { message?: string; code?: string; details?: string }) =>
  new Error(`[${e.code ?? '?'}] ${e.message ?? 'Database error'}${e.details ? ` (${e.details})` : ''}`);

export async function listCustomers(actor: Actor): Promise<CustomerRow[]> {
  const isAdmin = actor.role !== 'user';

  if (isAdmin) {
    const { data, error } = await supabaseAdmin
      .from('customer')
      .select(SELECT)
      .order('custno', { ascending: true });
    if (error) throw asError(error);
    return (data ?? []).map((r) => toRow(r as DbCustomer, actor)) as CustomerRow[];
  }

  // A User never receives stamp or status. We filter on is_deleted without selecting it.
  const { data, error } = await supabaseAdmin
    .from('customer')
    .select('custno, custname, address, payterm')
    .eq('is_deleted', false)
    .order('custno', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CustomerRow[];
}

// ---------------------------------------------------------------------------
// Add / Edit (S2-DEV-02). Both check the right on the server, validate again, and write the Stamp.
// ---------------------------------------------------------------------------

type DbCustomer = {
  custno: string;
  custname: string;
  address: string | null;
  payterm: string | null;
  stamp: string | null;
  is_deleted: boolean;
};

/** Same shape the list uses: Admins get status + stamp, a User never does. is_deleted itself never leaves the server. */
function toRow(r: DbCustomer, actor: Actor): CustomerRow {
  const base = { custno: r.custno, custname: r.custname, address: r.address, payterm: r.payterm };
  if (actor.role === 'user') return base;
  return { ...base, status: r.is_deleted ? 'Inactive' : 'Active', stamp: r.stamp };
}

async function requireRight(actor: CurrentUser, rightName: 'Add Customer' | 'Edit Customer') {
  if (!(await hasRight(actor, rightName))) {
    throw new ServiceError(403, 'FORBIDDEN', `You need the "${rightName}" right to do this.`, 'Not allowed');
  }
}

function checked(input: unknown) {
  const v = validateCustomerInput((input && typeof input === 'object' ? input : {}) as Record<string, unknown>);
  if (!v.ok) throw new ServiceError(400, 'INVALID', v.error.message, v.error.title, v.error.fields);
  return v.value;
}

// Postgres errors the form can explain: 23514 = CHECK failed (pay_ck), 22001 = text too long.
function dbProblem(e: { code?: string }) {
  if (e.code === '23514') return new ServiceError(400, 'INVALID', 'That value is not allowed. Check the highlighted fields.', 'Wrong Value');
  if (e.code === '22001') return new ServiceError(400, 'INVALID', 'Please shorten the highlighted field.', 'Too long');
  return null;
}

export async function createCustomer(actor: CurrentUser, input: unknown) {
  await requireRight(actor, 'Add Customer');
  const value = checked(input);

  // The number is chosen here, never by the browser. If two people save at the same moment they can pick the
  // same number: the primary key refuses the second one (23505), so we read again and take the next number.
  for (let attempt = 0; attempt < 3; attempt++) {
    const latest = await supabaseAdmin.from('customer').select('custno').order('custno', { ascending: false }).limit(20);
    if (latest.error) throw latest.error;
    const custno = nextCustNo((latest.data ?? []).map((r) => String(r.custno)));
    if (!custno) throw new ServiceError(409, 'FULL', 'No more customer numbers are available.', 'Cannot add customer');

    const { data, error } = await supabaseAdmin
      .from('customer')
      .insert({ custno, ...value, stamp: makeStamp('CREATED', actor.email), is_deleted: false })
      .select(SELECT)
      .single();

    if (!error) return { customer: toRow(data as DbCustomer, actor) };
    if (error.code !== '23505') throw dbProblem(error) ?? error;
  }
  throw new ServiceError(409, 'CONFLICT', 'Someone else added a customer at the same time. Please save again.', 'Try again');
}

export async function updateCustomer(actor: CurrentUser, custno: string, input: unknown) {
  await requireRight(actor, 'Edit Customer');
  const value = checked(input);

  // The .or() makes "not deleted" part of the update itself, so a deleted customer can never be edited,
  // even if it was deleted a second ago.
  const { data, error } = await supabaseAdmin
    .from('customer')
    .update({ ...value, stamp: makeStamp('EDITED', actor.email) })
    .eq('custno', custno)
    .eq('is_deleted', false)
    .select(SELECT);
  if (error) throw dbProblem(error) ?? error;
  if (data?.length) return { customer: toRow(data[0] as DbCustomer, actor) };

  // Nothing updated: it does not exist, or it is deleted.
  const existing = await supabaseAdmin.from('customer').select('custno').eq('custno', custno).maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data) throw new ServiceError(404, 'NOT_FOUND', 'That customer no longer exists.', 'Not found');
  throw new ServiceError(409, 'DELETED', 'This customer is deleted. Restore it before editing.', 'Cannot edit');
}

// ---------------------------------------------------------------------------
// Delete / Restore (S2-DEV-03). Soft delete, guide section 2.3: the row is never removed, so the sales that
// point to it keep working. "Deleted" = is_deleted = true; the Stamp is written alongside for the audit trail.
// S2-DBA-04 also guards this in the database: its trigger refuses is_deleted = true while the customer has
// active sales (error P0001), so even a request that slips past the check below cannot orphan a sale.
// ---------------------------------------------------------------------------

const DB_BLOCKED = 'P0001'; // raise_exception from the S2-DBA-04 trigger

async function loadCustomer(custno: string) {
  const { data, error } = await supabaseAdmin.from('customer').select('custno, is_deleted').eq('custno', custno).maybeSingle();
  if (error) throw error;
  if (!data) throw new ServiceError(404, 'NOT_FOUND', 'That customer no longer exists. Refresh the page.', 'Not found');
  return data;
}

/**
 * Sales of this customer that are not deleted themselves (sales.is_deleted = false, as in the S2-DBA-04 script).
 * If the lookup fails we throw, so a failed check can never turn into a delete.
 */
async function activeSalesCount(custno: string): Promise<number> {
  const { count, error } = await supabaseAdmin
    .from('sales')
    .select('*', { count: 'exact', head: true })
    .eq('custno', custno)
    .eq('is_deleted', false);
  if (error) throw error;
  return count ?? 0;
}

function hasSales(custno: string, n: number) {
  const some = n > 0 ? `${n} active sale${n === 1 ? '' : 's'}` : 'active sales';
  return new ServiceError(
    409,
    'HAS_ACTIVE_SALES',
    `Customer ${custno} still has ${some}. Delete ${n === 1 ? 'that sale' : 'those sales'} first, then delete the customer.`,
    'Cannot delete customer'
  );
}

/** Delete Customer: needs the "Delete Customer" right. Refused while the customer still has active sales. */
export async function deleteCustomer(actor: CurrentUser, custno: string) {
  if (!(await hasRight(actor, 'Delete Customer'))) {
    throw new ServiceError(403, 'FORBIDDEN', 'You need the "Delete Customer" right to do this.', 'Not allowed');
  }

  const existing = await loadCustomer(custno);
  if (existing.is_deleted) {
    throw new ServiceError(409, 'DELETED', `Customer ${custno} is already deleted.`, 'Already deleted');
  }

  const sales = await activeSalesCount(custno);
  if (sales > 0) throw hasSales(custno, sales);

  // "Not deleted" is part of the UPDATE itself, so two people deleting at once cannot overwrite each other's Stamp.
  const { data, error } = await supabaseAdmin
    .from('customer')
    .update({ stamp: makeStamp('DELETED', actor.email), is_deleted: true })
    .eq('custno', custno)
    .eq('is_deleted', false)
    .select(SELECT);
  if (error) {
    // A sale was added after the check above: the database trigger refused. Give the same clear message.
    if (error.code === DB_BLOCKED) throw hasSales(custno, await activeSalesCount(custno));
    throw error;
  }
  if (!data?.length) throw new ServiceError(409, 'DELETED', `Customer ${custno} is already deleted.`, 'Already deleted');
  return { customer: toRow(data[0] as DbCustomer, actor) };
}

/** Restore: Admin and Superadmin only (a User is refused whatever rights they hold). The row keeps its old links. */
export async function restoreCustomer(actor: CurrentUser, custno: string) {
  if (actor.role === 'user') {
    throw new ServiceError(403, 'FORBIDDEN', 'Only an Admin or Superadmin can restore a customer.', 'Not allowed');
  }

  const existing = await loadCustomer(custno);
  if (!existing.is_deleted) {
    throw new ServiceError(409, 'ACTIVE', `Customer ${custno} is already active.`, 'Already active');
  }

  // Same shape as the mockup: the Stamp after a restore reads EDITED <who> <when>.
  const { data, error } = await supabaseAdmin
    .from('customer')
    .update({ stamp: makeStamp('EDITED', actor.email), is_deleted: false })
    .eq('custno', custno)
    .eq('is_deleted', true)
    .select(SELECT);
  if (error) throw error;
  if (!data?.length) throw new ServiceError(409, 'ACTIVE', `Customer ${custno} is already active.`, 'Already active');
  return { customer: toRow(data[0] as DbCustomer, actor) };
}
