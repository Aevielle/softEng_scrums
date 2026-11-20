import { supabaseAdmin } from '@/lib/supabase/admin';
import type { CurrentUser } from '@/lib/auth/permissions';
import { hasRight } from '@/lib/auth/rights';
import { makeStamp } from '@/lib/stamp';
import { ServiceError } from '@/lib/users/service';
import type { CustomerRow } from './filter';
import { nextCustNo, validateCustomerInput } from './form';

type Actor = { role: string };

// customer has no status column: a row is soft-deleted when its stamp starts with "DELETED".
const isDeleted = (stamp: string | null | undefined) => /^DELETED/i.test(stamp ?? '');

// Turns a Supabase error object into a normal Error, so the overlay shows the real code and message.
const asError = (e: { message?: string; code?: string; details?: string }) =>
  new Error(`[${e.code ?? '?'}] ${e.message ?? 'Database error'}${e.details ? ` (${e.details})` : ''}`);

export async function listCustomers(actor: Actor): Promise<CustomerRow[]> {
  const isAdmin = actor.role !== 'user';

  if (isAdmin) {
    const { data, error } = await supabaseAdmin
      .from('customer')
      .select('custno, custname, address, payterm, stamp')
      .order('custno', { ascending: true });
    if (error) throw asError(error);
    return (data ?? []).map((r) => ({
      ...r,
      status: isDeleted(r.stamp) ? ('Inactive' as const) : ('Active' as const),
    })) as CustomerRow[];
  }

  // A User never receives stamp or status. We filter on stamp without selecting it.
  // The .or() keeps rows whose stamp is NULL (a plain NOT ILIKE would drop them).
  const { data, error } = await supabaseAdmin
    .from('customer')
    .select('custno, custname, address, payterm')
    .or('stamp.is.null,stamp.not.ilike.DELETED*')
    .order('custno', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CustomerRow[];
}

// ---------------------------------------------------------------------------
// Add / Edit (S2-DEV-02). Both check the right on the server, validate again, and write the Stamp.
// ---------------------------------------------------------------------------

const SELECT = 'custno, custname, address, payterm, stamp';

type DbCustomer = { custno: string; custname: string; address: string | null; payterm: string | null; stamp: string | null };

/** Same shape the list uses: Admins get status + stamp, a User never does. */
function toRow(r: DbCustomer, actor: CurrentUser): CustomerRow {
  if (actor.role === 'user') return { custno: r.custno, custname: r.custname, address: r.address, payterm: r.payterm };
  return { ...r, status: isDeleted(r.stamp) ? 'Inactive' : 'Active' };
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
    .or('stamp.is.null,stamp.not.ilike.DELETED*')
    .select(SELECT);
  if (error) throw dbProblem(error) ?? error;
  if (data?.length) return { customer: toRow(data[0] as DbCustomer, actor) };

  // Nothing updated: it does not exist, or it is deleted.
  const existing = await supabaseAdmin.from('customer').select('custno').eq('custno', custno).maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data) throw new ServiceError(404, 'NOT_FOUND', 'That customer no longer exists.', 'Not found');
  throw new ServiceError(409, 'DELETED', 'This customer is deleted. Restore it before editing.', 'Cannot edit');
}
