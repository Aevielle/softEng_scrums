import { randomUUID } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { normalizeRole, type CurrentUser } from '@/lib/auth/permissions';
import { RIGHTS_LAYOUT } from '@/lib/auth/rights-layout';
import { saveRightsFromApp } from '@/lib/auth/save-rights';
import { ServiceError, getUserRow, setRole } from '@/lib/users/service';
import { normalizeEmail, validateUserInput } from '@/lib/users/validation';
import {
  REASON_MAX,
  canRequestAccess,
  editsProfileDirectly,
  requestableRoles,
  type Person,
  type RequestKind,
  type RequestPayload,
  type RequestRow,
} from './rules';

// ---------------------------------------------------------------------------
// No new table: a request is stored in the existing, append-only audit_log.
//   ADD  row = the request being sent   (record_key = request id, new_values = what was asked)
//   EDIT row = the Superadmin's answer  (new_values.status = 'approved' | 'declined')
// The newest row for a record_key is the request's current state.
// ---------------------------------------------------------------------------
const TABLE = 'change_request';

type Actor = Pick<CurrentUser, 'id' | 'role'>;

function needAccount(actor: CurrentUser) {
  if (actor.id === null) {
    throw new ServiceError(
      403,
      'FORBIDDEN',
      'This demo account has no user record. Sign in with an account listed under User Management.'
    );
  }
  return actor.id;
}

function fullName(p: { firstName?: string | null; lastName?: string | null }) {
  return `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim();
}

async function loadAll(): Promise<RequestRow[]> {
  const { data, error } = await supabaseAdmin
    .from('audit_log')
    .select('record_key, action, new_values, action_at')
    .eq('table_name', TABLE)
    .order('audit_id', { ascending: true })
    .limit(5000);
  if (error) {
    console.error('[requests] load failed:', error.message, error.code);
    throw new ServiceError(500, 'SERVER_ERROR', 'Could not load the requests.');
  }

  const map = new Map<string, RequestRow>();
  for (const r of data ?? []) {
    const v = (r.new_values ?? {}) as Record<string, any>;
    const key = String(r.record_key);
    if (r.action === 'ADD') {
      map.set(key, {
        id: key,
        kind: v.kind as RequestKind,
        status: 'pending',
        reason: String(v.reason ?? ''),
        userId: Number(v.user_id),
        userName: String(v.user_name ?? ''),
        userEmail: String(v.user_email ?? ''),
        userRole: normalizeRole(v.user_role),
        createdAt: String(r.action_at),
        decidedAt: null,
        decidedByName: null,
        payload: (v.payload ?? {}) as RequestPayload,
      });
    } else {
      const cur = map.get(key);
      if (cur && (v.status === 'approved' || v.status === 'declined')) {
        cur.status = v.status;
        cur.decidedAt = String(r.action_at);
        cur.decidedByName = v.decided_by_name ? String(v.decided_by_name) : null;
      }
    }
  }
  return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** The requests this person sent, newest first. */
export async function listMine(userId: number | null): Promise<RequestRow[]> {
  if (userId === null) return [];
  return (await loadAll()).filter((r) => r.userId === userId);
}

/** Superadmin only: everything still waiting for an answer. */
export async function listPending(actor: Actor): Promise<RequestRow[]> {
  if (actor.role !== 'superadmin') return [];
  return (await loadAll()).filter((r) => r.status === 'pending');
}

export async function getOwnProfile(userId: number): Promise<Person> {
  const { data, error } = await supabaseAdmin
    .from('app_user')
    .select('first_name, last_name, email')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) {
    console.error('[requests] profile lookup failed:', error?.message, error?.code);
    throw new ServiceError(500, 'SERVER_ERROR', 'Could not load your profile.');
  }
  return { firstName: data.first_name ?? '', lastName: data.last_name ?? '', email: data.email ?? '' };
}

async function emailTaken(email: string, exceptId: number) {
  const { data, error } = await supabaseAdmin.from('app_user').select('user_id').eq('email', email).neq('user_id', exceptId).limit(1);
  if (error) {
    console.error('[requests] email check failed:', error.message, error.code);
    throw new ServiceError(500, 'SERVER_ERROR', 'Could not check the email.');
  }
  return (data?.length ?? 0) > 0;
}

const EMAIL_USED = () =>
  new ServiceError(409, 'EMAIL_USED', 'That email is already registered.', 'Email already used', ['email']);

// ---------------------------------------------------------------------------
// Rights the person could still ask for (Request access dropdown)
// ---------------------------------------------------------------------------
export type AccessOption = {
  moduleId: number;
  title: string;
  wholeAvailable: boolean;
  rights: { rightId: number; name: string }[];
};

async function loadCatalogue() {
  const { data, error } = await supabaseAdmin.from('rights_catalogue').select('right_id, module_id, right_name');
  if (error) {
    console.error('[requests] catalogue failed:', error.message, error.code);
    throw new ServiceError(500, 'SERVER_ERROR', 'Could not load the rights.');
  }
  return (data ?? []).map((r) => ({ rightId: Number(r.right_id), moduleId: Number(r.module_id), name: String(r.right_name) }));
}

async function grantedIds(userId: number): Promise<Set<number>> {
  const { data, error } = await supabaseAdmin.from('user_permission').select('right_id').eq('user_id', userId).eq('is_deleted', false);
  if (error) {
    console.error('[requests] granted lookup failed:', error.message, error.code);
    throw new ServiceError(500, 'SERVER_ERROR', 'Could not load your rights.');
  }
  return new Set((data ?? []).map((r) => Number(r.right_id)));
}

export async function accessOptionsFor(userId: number | null): Promise<AccessOption[]> {
  if (userId === null) return [];
  const [catalogue, granted] = await Promise.all([loadCatalogue(), grantedIds(userId)]);
  return RIGHTS_LAYOUT.map((layout) => {
    const inModule = catalogue.filter((r) => r.moduleId === layout.moduleId);
    const rank = (id: number) => (layout.order.includes(id) ? layout.order.indexOf(id) : 999);
    const open = inModule.filter((r) => !granted.has(r.rightId)).sort((a, b) => rank(a.rightId) - rank(b.rightId));
    return {
      moduleId: layout.moduleId,
      title: layout.title,
      wholeAvailable: open.length > 0,
      rights: open.map((r) => ({ rightId: r.rightId, name: r.name })),
    };
  }).filter((m) => m.wholeAvailable);
}

// ---------------------------------------------------------------------------
// Sending a request
// ---------------------------------------------------------------------------
function cleanReason(raw: unknown): string {
  const reason = typeof raw === 'string' ? raw.trim() : '';
  if (!reason) throw new ServiceError(400, 'INVALID', 'Please fill in the Reason.', 'Empty Field', ['reason']);
  if (reason.length > REASON_MAX) {
    throw new ServiceError(400, 'INVALID', `Keep the reason under ${REASON_MAX} characters.`, 'Too long', ['reason']);
  }
  return reason;
}

export async function createRequest(actor: CurrentUser, input: Record<string, unknown>) {
  const userId = needAccount(actor);
  const kind = input.kind;
  if (kind !== 'profile' && kind !== 'role' && kind !== 'access') {
    throw new ServiceError(400, 'INVALID', 'Unknown request type.');
  }
  const reason = cleanReason(input.reason);
  const existing = (await loadAll()).filter((r) => r.userId === userId && r.status === 'pending');
  let payload: RequestPayload = {};

  if (kind === 'profile') {
    if (editsProfileDirectly(actor.role)) {
      throw new ServiceError(403, 'FORBIDDEN', 'A Superadmin saves profile changes directly.');
    }
    const v = validateUserInput(input);
    if (!v.ok) throw new ServiceError(400, 'INVALID', v.error.message, v.error.title, v.error.fields);
    const from = await getOwnProfile(userId);
    const to: Person = { ...v.value };
    if (from.firstName === to.firstName && from.lastName === to.lastName && normalizeEmail(from.email) === to.email) {
      throw new ServiceError(400, 'INVALID', 'Change your name or email first.', 'Nothing to change');
    }
    if (to.email !== normalizeEmail(from.email) && (await emailTaken(to.email, userId))) throw EMAIL_USED();
    if (existing.some((r) => r.kind === 'profile')) {
      throw new ServiceError(409, 'DUPLICATE', 'You already have a profile change waiting for a Superadmin.', 'Already requested');
    }
    payload = { from, to };
  }

  if (kind === 'role') {
    const role = String(input.role ?? '').toLowerCase();
    if (!(requestableRoles(actor.role) as string[]).includes(role)) {
      throw new ServiceError(400, 'INVALID', 'Choose a role you can ask for.', 'Wrong Role', ['role']);
    }
    if (existing.some((r) => r.kind === 'role')) {
      throw new ServiceError(409, 'DUPLICATE', 'You already have a role change waiting for a Superadmin.', 'Already requested');
    }
    payload = { role: role as 'admin' | 'superadmin' };
  }

  if (kind === 'access') {
    if (!canRequestAccess(actor.role)) {
      throw new ServiceError(403, 'FORBIDDEN', 'Only Users need to ask for access.');
    }
    const m = /^([mr]):(\d+)$/.exec(String(input.access ?? ''));
    if (!m) throw new ServiceError(400, 'INVALID', 'Choose what you need access to.', 'Choose access', ['access']);
    const id = Number(m[2]);
    const options = await accessOptionsFor(userId);
    if (m[1] === 'm') {
      const mod = options.find((o) => o.moduleId === id);
      if (!mod) throw new ServiceError(400, 'INVALID', 'You already have everything in that module.', 'Nothing to request', ['access']);
      payload = { scope: 'module', moduleId: id, label: `${mod.title} (whole module)` };
    } else {
      const mod = options.find((o) => o.rights.some((r) => r.rightId === id));
      const right = mod?.rights.find((r) => r.rightId === id);
      if (!mod || !right) throw new ServiceError(400, 'INVALID', 'You already have that right.', 'Nothing to request', ['access']);
      payload = { scope: 'right', moduleId: mod.moduleId, rightId: id, label: `${right.name} (${mod.title})` };
    }
    if (existing.some((r) => r.kind === 'access' && r.payload.scope === payload.scope && r.payload.moduleId === payload.moduleId && r.payload.rightId === payload.rightId)) {
      throw new ServiceError(409, 'DUPLICATE', 'You already asked for this. A Superadmin has not answered yet.', 'Already requested');
    }
  }

  const me = await getOwnProfile(userId);
  const id = randomUUID();
  const { data, error } = await supabaseAdmin
    .from('audit_log')
    .insert({
      table_name: TABLE,
      action: 'ADD',
      record_key: id,
      old_values: null,
      new_values: {
        kind,
        user_id: userId,
        user_name: fullName(me) || me.email,
        user_email: me.email,
        user_role: actor.role,
        reason,
        payload,
      },
      action_by: 'app',
      user_id: userId,
    })
    .select('action_at')
    .single();
  if (error) {
    console.error('[requests] insert failed:', error.message, error.code);
    throw new ServiceError(500, 'SERVER_ERROR', 'Could not send the request. Please try again.');
  }

  const request: RequestRow = {
    id,
    kind,
    status: 'pending',
    reason,
    userId,
    userName: fullName(me) || me.email,
    userEmail: me.email,
    userRole: actor.role,
    createdAt: String(data.action_at),
    decidedAt: null,
    decidedByName: null,
    payload,
  };
  return { request };
}

// ---------------------------------------------------------------------------
// Answering a request (Superadmin, User Management)
// ---------------------------------------------------------------------------
async function applyProfile(req: RequestRow) {
  const to = req.payload.to;
  if (!to) throw new ServiceError(500, 'SERVER_ERROR', 'This request has no changes in it.');
  if (await emailTaken(to.email, req.userId)) throw EMAIL_USED();
  const { error } = await supabaseAdmin
    .from('app_user')
    .update({ first_name: to.firstName, last_name: to.lastName, email: to.email })
    .eq('user_id', req.userId);
  if (error) {
    if (error.code === '23505') throw EMAIL_USED();
    console.error('[requests] profile apply failed:', error.message, error.code);
    throw new ServiceError(500, 'SERVER_ERROR', 'Could not apply the change.');
  }
}

async function applyAccess(actor: Actor, req: RequestRow) {
  const target = await getUserRow(req.userId);
  if (target.role !== 'user') {
    throw new ServiceError(409, 'NOT_A_USER', `${target.firstName || target.email} is now an ${target.role}, who already has every business module. Decline this request.`, 'Not needed');
  }
  const catalogue = await loadCatalogue();
  const asked =
    req.payload.scope === 'module'
      ? catalogue.filter((r) => r.moduleId === req.payload.moduleId).map((r) => r.rightId)
      : catalogue.filter((r) => r.rightId === req.payload.rightId).map((r) => r.rightId);
  if (asked.length === 0) throw new ServiceError(409, 'GONE', 'That right no longer exists.', 'Not found');
  const have = await grantedIds(req.userId);
  await saveRightsFromApp(actor.id as number, req.userId, [...new Set([...have, ...asked])]);
}

export async function decideRequest(actor: CurrentUser, id: string, decision: unknown) {
  if (actor.role !== 'superadmin') {
    throw new ServiceError(403, 'FORBIDDEN', 'Only a Superadmin can answer requests.');
  }
  const actorId = needAccount(actor);
  if (decision !== 'approve' && decision !== 'decline') {
    throw new ServiceError(400, 'INVALID', 'Choose Approve or Decline.');
  }

  const req = (await loadAll()).find((r) => r.id === id);
  if (!req) throw new ServiceError(404, 'NOT_FOUND', 'Request not found.');
  if (req.status !== 'pending') {
    throw new ServiceError(409, 'ALREADY_ANSWERED', `This request was already ${req.status}.`, 'Already answered');
  }

  if (decision === 'approve') {
    if (req.kind === 'profile') await applyProfile(req);
    else if (req.kind === 'role') await setRole(actor, req.userId, req.payload.role);
    else await applyAccess(actor, req);
  }

  const me = await getOwnProfile(actorId);
  const status = decision === 'approve' ? 'approved' : 'declined';
  const { data, error } = await supabaseAdmin
    .from('audit_log')
    .insert({
      table_name: TABLE,
      action: 'EDIT',
      record_key: req.id,
      old_values: { status: 'pending' },
      new_values: { status, decided_by: actorId, decided_by_name: fullName(me) || me.email },
      action_by: 'app',
      user_id: actorId,
    })
    .select('action_at')
    .single();
  if (error) {
    console.error('[requests] answer failed:', error.message, error.code);
    throw new ServiceError(500, 'SERVER_ERROR', 'The change was made, but the answer could not be recorded. Try Approve again.');
  }

  const request: RequestRow = { ...req, status, decidedAt: String(data.action_at), decidedByName: fullName(me) || me.email };
  // The Users table on screen needs the new name / email / role after an approval.
  const user = decision === 'approve' && req.kind !== 'access' ? await getUserRow(req.userId) : null;
  return { request, user };
}

// ---------------------------------------------------------------------------
// Superadmin: save own name and email directly (no request needed)
// ---------------------------------------------------------------------------
export async function updateOwnProfile(actor: CurrentUser, input: Record<string, unknown>) {
  const userId = needAccount(actor);
  if (!editsProfileDirectly(actor.role)) {
    throw new ServiceError(403, 'FORBIDDEN', 'Send a change request instead. A Superadmin will review it.');
  }
  const v = validateUserInput(input);
  if (!v.ok) throw new ServiceError(400, 'INVALID', v.error.message, v.error.title, v.error.fields);
  if (await emailTaken(v.value.email, userId)) throw EMAIL_USED();
  const { error } = await supabaseAdmin
    .from('app_user')
    .update({ first_name: v.value.firstName, last_name: v.value.lastName, email: v.value.email })
    .eq('user_id', userId);
  if (error) {
    if (error.code === '23505') throw EMAIL_USED();
    console.error('[profile] save failed:', error.message, error.code);
    throw new ServiceError(500, 'SERVER_ERROR', 'Could not save your profile.');
  }
  return { profile: v.value as Person };
}
