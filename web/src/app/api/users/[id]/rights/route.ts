import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { authorizeApi } from '@/lib/auth/guard';
import { normalizeRole } from '@/lib/auth/permissions';
import { RIGHTS_LAYOUT } from '@/lib/auth/rights-layout';
import { RightsError, saveRightsFromApp } from '@/lib/auth/save-rights';

type Ctx = { params: Promise<{ id: string }> | { id: string } };

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ code, message }, { status });
}

/** Loads the user whose rights are being edited. Only plain Users have per-action rights. */
async function loadTarget(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return { error: fail(400, 'BAD_ID', 'Invalid user.') };
  }

  const { data, error } = await supabaseAdmin
    .from('app_user')
    .select('user_id, first_name, email, role:role_id(role_name)')
    .eq('user_id', id)
    .maybeSingle();

  if (error) {
    console.error('[rights] user lookup failed:', error.message, error.code);
    return { error: fail(500, 'SERVER_ERROR', 'Could not load this user.') };
  }
  if (!data) return { error: fail(404, 'NOT_FOUND', 'User not found.') };

  const roleObj = Array.isArray(data.role) ? data.role[0] : data.role;
  if (normalizeRole(roleObj?.role_name) !== 'user') {
    return { error: fail(400, 'NOT_A_USER', 'Rights can only be set for User accounts.') };
  }

  return {
    target: { id, firstName: String(data.first_name ?? ''), email: String(data.email ?? '') },
  };
}

/** Dialog data: every right grouped by module, plus what the user has now. */
export async function GET(_req: Request, ctx: Ctx) {
  // 'users' = User Management; Admin and Superadmin have it, a plain User does not.
  const auth = await authorizeApi('users');
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const loaded = await loadTarget(id);
  if (loaded.error) return loaded.error;
  const { target } = loaded;

  const [catalogue, granted] = await Promise.all([
    supabaseAdmin.from('rights_catalogue').select('right_id, module_id, right_name, description'),
    supabaseAdmin.from('user_permission').select('right_id').eq('user_id', target.id).eq('is_deleted', false),
  ]);

  if (catalogue.error || granted.error) {
    const e = catalogue.error ?? granted.error;
    console.error('[rights] load failed:', e?.message, e?.code);
    return fail(500, 'SERVER_ERROR', 'Could not load rights.');
  }

  const byId = new Map((catalogue.data ?? []).map((r) => [Number(r.right_id), r]));

  const modules = RIGHTS_LAYOUT.map((layout) => {
    const listed = layout.order.filter((rid) => byId.has(rid));
    const extras = (catalogue.data ?? [])
      .filter((r) => Number(r.module_id) === layout.moduleId && !layout.order.includes(Number(r.right_id)))
      .map((r) => Number(r.right_id))
      .sort((a, b) => b - a);

    return {
      moduleId: layout.moduleId,
      title: layout.title,
      rights: [...listed, ...extras].map((rid) => {
        const r = byId.get(rid)!;
        return { rightId: rid, name: String(r.right_name), description: String(r.description ?? '') };
      }),
    };
  });

  return NextResponse.json({
    user: target,
    modules,
    granted: (granted.data ?? []).map((r) => Number(r.right_id)),
  });
}

/** Save Rights: body { rights: number[] } = the COMPLETE list that should be active afterwards. */
export async function PUT(req: Request, ctx: Ctx) {
  const auth = await authorizeApi('users');
  if (!auth.ok) return auth.response;

  // Every change is logged against the person who made it, so a real account is required.
  if (auth.user.id === null) {
    return fail(403, 'NO_ACTOR', 'Demo sessions cannot change rights.');
  }
  if (auth.user.role !== 'admin' && auth.user.role !== 'superadmin') {
    return fail(403, 'FORBIDDEN', 'Only an Admin or Superadmin can change rights.');
  }

  const { id } = await ctx.params;
  const loaded = await loadTarget(id);
  if (loaded.error) return loaded.error;
  const { target } = loaded;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'BAD_JSON', 'Invalid request.');
  }

  const raw = (body as { rights?: unknown } | null)?.rights;
  if (!Array.isArray(raw) || !raw.every((n) => Number.isInteger(n) && n > 0)) {
    return fail(400, 'BAD_RIGHTS', 'Invalid rights list.');
  }
  const rights = [...new Set(raw as number[])];

  // Preferred: one database call = rights change + audit_log rows in a single transaction.
  // That needs migration 007, which only DevSecOps can run. Until it is installed
  // (PostgREST says the function is not found), save from the app instead.
  let data: unknown;
  const rpc = await supabaseAdmin.rpc('save_user_rights', {
    p_actor_id: auth.user.id,
    p_target_id: target.id,
    p_right_ids: rights,
  });

  if (!rpc.error) {
    data = rpc.data;
  } else if (rpc.error.code === 'PGRST202' || rpc.error.code === '42883') {
    try {
      data = await saveRightsFromApp(auth.user.id, target.id, rights);
    } catch (e) {
      if (e instanceof RightsError) {
        return fail(e.code === 'BAD_RIGHTS' ? 400 : 500, e.code, e.message);
      }
      console.error('[rights] save failed:', (e as Error).message);
      return fail(500, 'SERVER_ERROR', 'Could not save rights. Reopen the dialog to see what was saved.');
    }
  } else {
    console.error('[rights] save failed:', rpc.error.message, rpc.error.code);
    if (rpc.error.code === '42501') return fail(403, 'FORBIDDEN', 'Only an Admin or Superadmin can change rights.');
    if (rpc.error.code === '22023') return fail(400, 'BAD_RIGHTS', 'Invalid rights list.');
    return fail(500, 'SERVER_ERROR', 'Could not save rights. Nothing was changed.');
  }

  const name = target.firstName || target.email;
  return NextResponse.json({
    ok: true,
    title: 'Rights saved',
    detail: `${name} will see the change on next sign-in.`,
    changes: data,
  });
}
