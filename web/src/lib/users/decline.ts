import { supabaseAdmin } from '@/lib/supabase/admin';
import type { CurrentUser } from '@/lib/auth/permissions';
import { ServiceError } from '@/lib/users/service';

/**
 * Declines a pending sign-up request: app_user.account_status becomes 'declined'.
 * getCurrentUser() only lets 'active' accounts through, so a declined person can never sign in.
 * Superadmin only (same people who see and use Approve). The change is written to audit_log.
 */
export async function declineUser(actor: CurrentUser, userId: number) {
  if (actor.role !== 'superadmin' || actor.id === null) {
    throw new ServiceError(403, 'FORBIDDEN', 'Only a Superadmin can decline requests.');
  }
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new ServiceError(400, 'INVALID', 'Invalid user.');
  }

  const { data: target, error: findErr } = await supabaseAdmin
    .from('app_user')
    .select('user_id, email, account_status')
    .eq('user_id', userId)
    .maybeSingle();

  if (findErr) {
    console.error('[decline] lookup failed:', findErr.message, findErr.code);
    throw new ServiceError(500, 'SERVER_ERROR', 'Could not load this request.');
  }
  if (!target) throw new ServiceError(404, 'NOT_FOUND', 'User not found.');

  const before = String(target.account_status ?? '');
  if (before.toLowerCase() !== 'pending') {
    throw new ServiceError(409, 'NOT_PENDING', 'Only pending requests can be declined.');
  }

  // Newest audit row for app_user, so we can tell afterwards whether a database trigger already logged this.
  const baseline = await supabaseAdmin
    .from('audit_log')
    .select('audit_id')
    .eq('table_name', 'app_user')
    .order('audit_id', { ascending: false })
    .limit(1);
  const baselineId = Number(baseline.data?.[0]?.audit_id ?? 0);

  // The extra .eq() makes sure it is still Pending (two people clicking at once).
  const { data: updated, error: updErr } = await supabaseAdmin
    .from('app_user')
    .update({ account_status: 'declined' })
    .eq('user_id', userId)
    .eq('account_status', before)
    .select('user_id');

  if (updErr) {
    console.error('[decline] update failed:', updErr.message, updErr.code);
    // 23514 = CHECK constraint, 22P02 = enum value not allowed: 'declined' is not a valid status yet.
    if (updErr.code === '23514' || updErr.code === '22P02') {
      throw new ServiceError(
        500,
        'STATUS_NOT_ALLOWED',
        "The database does not accept the status 'declined' yet. Ask DevSecOps to allow it on app_user.account_status."
      );
    }
    throw new ServiceError(500, 'SERVER_ERROR', 'Could not decline this request.');
  }
  if (!updated || updated.length === 0) {
    throw new ServiceError(409, 'NOT_PENDING', 'This request was already handled. Refresh the page.');
  }

  const trigger = await supabaseAdmin
    .from('audit_log')
    .select('audit_id', { count: 'exact', head: true })
    .eq('table_name', 'app_user')
    .gt('audit_id', baselineId);
  const loggedByTrigger = !trigger.error && (trigger.count ?? 0) > 0;

  if (!loggedByTrigger) {
    const { error: auditErr } = await supabaseAdmin.from('audit_log').insert({
      table_name: 'app_user',
      action: 'EDIT',
      record_key: String(userId),
      old_values: { user_id: userId, email: target.email, account_status: before },
      new_values: { user_id: userId, email: target.email, account_status: 'declined' },
      action_by: 'app',
      user_id: actor.id,
    });
    if (auditErr) console.error('[decline] audit_log insert failed:', auditErr.message, auditErr.code);
  }

  return { ok: true, id: userId, status: 'Declined' };
}
