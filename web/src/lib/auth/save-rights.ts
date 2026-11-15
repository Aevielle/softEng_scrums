import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * Saves a user's rights from the app, with NO database migration needed.
 * (The optional 007 migration does the same inside one transaction; the route prefers it
 * when DevSecOps has installed it and falls back to this otherwise.)
 *
 * Tick   -> row in user_permission (a previously removed row is restored)  -> audit_log ADD / RESTORE
 * Untick -> row removed from the user's active rights (soft delete)        -> audit_log DELETE
 */

export type PermRow = { id: number; right_id: number; is_deleted: boolean | null };

export type RightsPlan = {
  remove: PermRow[]; // active rows that are no longer wanted
  restore: PermRow[]; // removed rows that are wanted again
  add: number[]; // right_ids with no row at all
};

/** Pure function: compares the wanted right_ids with the user's existing rows. */
export function planRightsChange(rows: PermRow[], wanted: number[]): RightsPlan {
  const want = new Set(wanted);
  const activeIds = new Set(rows.filter((r) => r.is_deleted !== true).map((r) => r.right_id));

  const remove = rows.filter((r) => r.is_deleted !== true && !want.has(r.right_id));

  // If a right was removed and re-added before, keep only its newest removed row.
  const latestRemoved = new Map<number, PermRow>();
  for (const r of rows) {
    if (r.is_deleted === true && (latestRemoved.get(r.right_id)?.id ?? -1) < r.id) latestRemoved.set(r.right_id, r);
  }
  const restore = [...latestRemoved.values()].filter((r) => want.has(r.right_id) && !activeIds.has(r.right_id));

  const known = new Set(rows.map((r) => r.right_id));
  const add = [...want].filter((id) => !known.has(id));

  return { remove, restore, add };
}

export class RightsError extends Error {
  constructor(public code: 'BAD_RIGHTS' | 'SERVER_ERROR', message: string) {
    super(message);
  }
}

export async function saveRightsFromApp(actorId: number, targetId: number, rights: number[]) {
  const wanted = [...new Set(rights)];

  const [catalogue, existing] = await Promise.all([
    supabaseAdmin.from('rights_catalogue').select('right_id, right_name'),
    supabaseAdmin.from('user_permission').select('id, right_id, is_deleted').eq('user_id', targetId),
  ]);
  if (catalogue.error || existing.error) {
    const e = catalogue.error ?? existing.error;
    console.error('[rights] fallback load failed:', e?.message, e?.code);
    throw new RightsError('SERVER_ERROR', 'Could not save rights. Nothing was changed.');
  }

  const names = new Map((catalogue.data ?? []).map((r) => [Number(r.right_id), String(r.right_name)]));
  if (wanted.some((id) => !names.has(id))) throw new RightsError('BAD_RIGHTS', 'Invalid rights list.');

  const plan = planRightsChange(
    (existing.data ?? []).map((r) => ({
      id: Number(r.id),
      right_id: Number(r.right_id),
      is_deleted: r.is_deleted as boolean | null,
    })),
    wanted
  );
  const changed = plan.remove.length + plan.restore.length + plan.add.length;
  if (changed === 0) return { added: 0, restored: 0, removed: 0 };

  // Remember the newest audit row for this table, so we can tell afterwards whether a
  // database trigger (S1-DBA-06) already logged these writes.
  const baseline = await supabaseAdmin
    .from('audit_log')
    .select('audit_id')
    .eq('table_name', 'user_permission')
    .order('audit_id', { ascending: false })
    .limit(1);
  const baselineId = Number(baseline.data?.[0]?.audit_id ?? 0);

  const now = new Date().toISOString();
  const audit: Record<string, unknown>[] = [];
  const fail = (what: string, e: { message: string; code?: string } | null) => {
    console.error(`[rights] ${what} failed:`, e?.message, e?.code);
    throw new RightsError('SERVER_ERROR', 'Could not save rights. Reopen the dialog to see what was saved.');
  };
  const entry = (action: 'ADD' | 'RESTORE' | 'DELETE', row: Record<string, unknown>, old: Record<string, unknown> | null) => ({
    table_name: 'user_permission',
    action,
    record_key: String(row.id),
    old_values: old ? { ...old, right_name: names.get(Number(row.right_id)) } : null,
    new_values: { ...row, right_name: names.get(Number(row.right_id)) },
    action_by: 'app',
    user_id: actorId,
  });

  // 1) Unticked
  if (plan.remove.length) {
    const { data, error } = await supabaseAdmin
      .from('user_permission')
      .update({ is_deleted: true, deleted_at: now })
      .in('id', plan.remove.map((r) => r.id))
      .select();
    if (error) fail('remove', error);
    for (const row of data ?? []) {
      audit.push(entry('DELETE', row, { ...row, is_deleted: false, deleted_at: null }));
    }
  }

  // 2) Ticked again (row existed before)
  if (plan.restore.length) {
    const { data, error } = await supabaseAdmin
      .from('user_permission')
      .update({ is_deleted: false, deleted_at: null, granted_at: now })
      .in('id', plan.restore.map((r) => r.id))
      .select();
    if (error) fail('restore', error);
    for (const row of data ?? []) {
      audit.push(entry('RESTORE', row, { ...row, is_deleted: true }));
    }
  }

  // 3) Ticked for the first time
  if (plan.add.length) {
    const { data, error } = await supabaseAdmin
      .from('user_permission')
      .insert(plan.add.map((right_id) => ({ user_id: targetId, right_id })))
      .select();
    if (error) fail('add', error);
    for (const row of data ?? []) audit.push(entry('ADD', row, null));
  }

  // 4) audit_log. Skip if a trigger on user_permission already wrote rows for these changes.
  const trigger = await supabaseAdmin
    .from('audit_log')
    .select('audit_id', { count: 'exact', head: true })
    .eq('table_name', 'user_permission')
    .gt('audit_id', baselineId);
  const loggedByTrigger = !trigger.error && (trigger.count ?? 0) > 0;

  if (!loggedByTrigger && audit.length) {
    const { error } = await supabaseAdmin.from('audit_log').insert(audit);
    if (error) fail('audit_log insert', error);
  }

  return { added: plan.add.length, restored: plan.restore.length, removed: plan.remove.length };
}
