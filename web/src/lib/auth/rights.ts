import { supabaseAdmin } from '@/lib/supabase/admin';
import type { CurrentUser } from '@/lib/auth/permissions';

// Per-action rights ("Add Customer", "Edit Customer", ...). A right is a row in user_permission pointing at
// rights_catalogue.right_name; the Rights dialog writes those rows. Admin and Superadmin hold every right.
// This is the server-side check behind the buttons: hiding a button is never enough on its own.

export type Rights = { has: (rightName: string) => boolean };

/** Everything this person may do. Fails closed: if the lookup fails, a User gets no rights. */
export async function rightsFor(user: CurrentUser): Promise<Rights> {
  if (user.role !== 'user') return { has: () => true };
  if (user.id == null) return { has: () => false }; // demo sessions have no user_permission rows

  const { data, error } = await supabaseAdmin
    .from('user_permission')
    .select('right:right_id(right_name)')
    .eq('user_id', user.id)
    .eq('is_deleted', false);

  if (error) {
    console.error('[rights] lookup failed:', error.message, error.code);
    return { has: () => false };
  }

  const names = new Set<string>();
  for (const row of data ?? []) {
    const right = Array.isArray(row.right) ? row.right[0] : row.right;
    if (right?.right_name) names.add(String(right.right_name));
  }
  return { has: (rightName) => names.has(rightName) };
}

export async function hasRight(user: CurrentUser, rightName: string): Promise<boolean> {
  return (await rightsFor(user)).has(rightName);
}
