import { supabaseAdmin } from '@/lib/supabase/admin';
import type { CustomerRow } from './filter';

type Actor = { role: string };

// customer has no status column: a row is soft-deleted when its stamp starts with "DELETED".
const isDeleted = (stamp: string | null | undefined) => /^DELETED/i.test(stamp ?? '');

export async function listCustomers(actor: Actor): Promise<CustomerRow[]> {
  const isAdmin = actor.role !== 'user';

  if (isAdmin) {
    const { data, error } = await supabaseAdmin
      .from('customer')
      .select('custno, custname, address, payterm, stamp')
      .order('custno', { ascending: true });
    if (error) throw error;
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
    .or('stamp.is.null,stamp.not.ilike.DELETED%')
    .order('custno', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CustomerRow[];
}