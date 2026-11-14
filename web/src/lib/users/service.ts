import { randomInt } from 'node:crypto';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import bcrypt from 'bcryptjs';
import { validatePassword } from '@/lib/auth/password';
import { normalizeRole, type CurrentUser } from '@/lib/auth/permissions';
import { assignableRoles, canManage, canSee, sortUsers, type Role } from './rules';
import { validateUserInput } from './validation';

// ---------------------------------------------------------------------------
// Same hashing as the Register route (bcryptjs, 12 rounds, column password_hash).
const BCRYPT_ROUNDS = 12;
// The one column I could not confirm: whichever app_user column feeds `session.mustChange`, so a new
// user is sent to /set-password at first sign-in. Set to null to skip it if you have no such column.
const MUST_CHANGE_COLUMN: string | null = 'must_change_password';
// ---------------------------------------------------------------------------

const SELECT = 'user_id, first_name, last_name, email, is_blocked, account_status, role:role_id(role_name)';

export type UserRow = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  blocked: boolean;
  status: string; // 'Active' | 'Blocked' | other account_status
};

type DbRow = {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  is_blocked: boolean | null;
  account_status: string | null;
  role: { role_name: string } | { role_name: string }[] | null;
};

export class ServiceError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public title?: string,
    public fields?: string[]
  ) {
    super(message);
  }
}

/** Turns anything thrown by the service into the JSON the browser expects. */
export function fail(e: unknown) {
  if (e instanceof ServiceError) {
    return NextResponse.json(
      { code: e.code, title: e.title, message: e.message, fields: e.fields },
      { status: e.status }
    );
  }
  console.error('[users] unexpected error:', e);
  return NextResponse.json({ code: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' }, { status: 500 });
}

function toRow(r: DbRow): UserRow {
  const roleObj = Array.isArray(r.role) ? r.role[0] : r.role;
  const blocked = !!r.is_blocked;
  const status = r.account_status ?? 'active';
  return {
    id: r.user_id,
    firstName: r.first_name ?? '',
    lastName: r.last_name ?? '',
    email: r.email,
    role: normalizeRole(roleObj?.role_name),
    blocked,
    status: blocked ? 'Blocked' : status.charAt(0).toUpperCase() + status.slice(1),
  };
}

type Actor = Pick<CurrentUser, 'id' | 'role'>;

/** Every account this person is allowed to see (Admins never get Superadmin rows). */
export async function listUsers(actor: Actor): Promise<UserRow[]> {
  const { data, error } = await supabaseAdmin.from('app_user').select(SELECT);
  if (error) {
    console.error('[users] list failed:', error.message, error.code);
    throw new ServiceError(500, 'SERVER_ERROR', 'Could not load users.');
  }
  const rows = ((data ?? []) as unknown as DbRow[]).map(toRow);
  return sortUsers(rows.filter((r) => canSee({ id: actor.id, role: actor.role }, r)));
}

/** One account. A Superadmin account looks like it does not exist to an Admin (404, not 403). */
async function getTarget(actor: Actor, id: number): Promise<UserRow> {
  if (!Number.isInteger(id)) throw new ServiceError(404, 'NOT_FOUND', 'User not found.');
  const { data, error } = await supabaseAdmin.from('app_user').select(SELECT).eq('user_id', id).maybeSingle();
  if (error) {
    console.error('[users] lookup failed:', error.message, error.code);
    throw new ServiceError(500, 'SERVER_ERROR', 'Could not load the user.');
  }
  if (!data) throw new ServiceError(404, 'NOT_FOUND', 'User not found.');
  const row = toRow(data as unknown as DbRow);
  if (!canSee({ id: actor.id, role: actor.role }, row)) throw new ServiceError(404, 'NOT_FOUND', 'User not found.');
  return row;
}

async function roleIdFor(role: Role): Promise<number> {
  const { data, error } = await supabaseAdmin.from('role').select('role_id, role_name');
  if (error) {
    console.error('[users] role lookup failed:', error.message, error.code);
    throw new ServiceError(500, 'SERVER_ERROR', 'Could not look up roles.');
  }
  const hit = (data ?? []).find((r) => normalizeRole(r.role_name) === role);
  if (!hit) throw new ServiceError(500, 'SERVER_ERROR', `Role "${role}" does not exist in the role table.`);
  return hit.role_id as number;
}

async function emailTaken(email: string, exceptId?: number): Promise<boolean> {
  let q = supabaseAdmin.from('app_user').select('user_id').eq('email', email).limit(1);
  if (exceptId !== undefined) q = q.neq('user_id', exceptId);
  const { data, error } = await q;
  if (error) {
    console.error('[users] email check failed:', error.message, error.code);
    throw new ServiceError(500, 'SERVER_ERROR', 'Could not check the email.');
  }
  return (data?.length ?? 0) > 0;
}

const EMAIL_USED = () =>
  new ServiceError(409, 'EMAIL_USED', 'That email is already registered.', 'Email already used', ['email']);

function checked(input: Record<string, unknown>) {
  const v = validateUserInput(input);
  if (!v.ok) throw new ServiceError(400, 'INVALID', v.error.message, v.error.title, v.error.fields);
  return v.value;
}

function parseRole(raw: unknown): Role | undefined {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const r = String(raw).toLowerCase();
  if (r !== 'user' && r !== 'admin' && r !== 'superadmin') {
    throw new ServiceError(400, 'INVALID', 'Choose a valid role.', 'Wrong Role', ['role']);
  }
  return r;
}

/**
 * 14 characters with an uppercase letter, a lowercase letter, a number and a special character
 * (the rule the set-password page and the server enforce), no look-alike characters.
 * Checked against validatePassword before it is used.
 */
function temporaryPassword(): string {
  const LOWER = 'abcdefghjkmnpqrstuvwxyz';
  const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const D = '23456789';
  const S = '!@#$%&*?';
  const all = LOWER + UPPER + D + S;
  const pick = (s: string) => s[randomInt(s.length)];
  for (let attempt = 0; attempt < 10; attempt++) {
    const chars = [pick(LOWER), pick(UPPER), pick(D), pick(S)];
    while (chars.length < 14) chars.push(pick(all));
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    const pw = chars.join('');
    if (!validatePassword(pw)) return pw; // validatePassword returns an error message, or nothing when fine
  }
  throw new ServiceError(500, 'SERVER_ERROR', 'Could not generate a temporary password.');
}

export async function createUser(actor: Actor, input: Record<string, unknown>) {
  const value = checked(input);
  const role = parseRole(input.role) ?? 'user';

  // An Admin can only create Users. Checked here, not just by greying out the dropdown.
  if (!assignableRoles({ id: actor.id, role: actor.role }).includes(role)) {
    throw new ServiceError(403, 'FORBIDDEN', 'Only a Superadmin can create Admin or Superadmin accounts.');
  }
  if (await emailTaken(value.email)) throw EMAIL_USED();

  const password = temporaryPassword();
  const { data, error } = await supabaseAdmin
    .from('app_user')
    .insert({
      first_name: value.firstName,
      last_name: value.lastName,
      email: value.email,
      role_id: await roleIdFor(role),
      account_status: 'active',
      is_blocked: false,
      password_hash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      ...(MUST_CHANGE_COLUMN ? { [MUST_CHANGE_COLUMN]: true } : {}),
    })
    .select(SELECT)
    .single();

  if (error) {
    if (error.code === '23505') throw EMAIL_USED(); // unique constraint: someone else just used it
    console.error('[users] insert failed:', error.message, error.code);
    throw new ServiceError(500, 'SERVER_ERROR', 'Could not create the user.');
  }
  return { user: toRow(data as unknown as DbRow), tempPassword: password };
}

export async function updateUser(actor: Actor, id: number, input: Record<string, unknown>) {
  const target = await getTarget(actor, id);
  if (!canManage({ id: actor.id, role: actor.role }, target)) {
    throw new ServiceError(403, 'FORBIDDEN', 'You do not have rights to change this account.');
  }

  const value = checked(input);
  const role = parseRole(input.role);
  if (role && role !== target.role && !assignableRoles({ id: actor.id, role: actor.role }).includes(role)) {
    throw new ServiceError(403, 'FORBIDDEN', 'Only a Superadmin can change roles.');
  }
  if (await emailTaken(value.email, id)) throw EMAIL_USED();

  const patch: Record<string, unknown> = {
    first_name: value.firstName,
    last_name: value.lastName,
    email: value.email,
  };
  if (role && role !== target.role) patch.role_id = await roleIdFor(role);

  const { data, error } = await supabaseAdmin.from('app_user').update(patch).eq('user_id', id).select(SELECT).single();
  if (error) {
    if (error.code === '23505') throw EMAIL_USED();
    console.error('[users] update failed:', error.message, error.code);
    throw new ServiceError(500, 'SERVER_ERROR', 'Could not save the user.');
  }
  return { user: toRow(data as unknown as DbRow) };
}

export async function setBlocked(actor: Actor, id: number, blocked: boolean) {
  const target = await getTarget(actor, id);
  if (!canManage({ id: actor.id, role: actor.role }, target)) {
    throw new ServiceError(403, 'FORBIDDEN', 'You do not have rights to change this account.');
  }
  const { data, error } = await supabaseAdmin
    .from('app_user')
    .update({ is_blocked: blocked })
    .eq('user_id', id)
    .select(SELECT)
    .single();
  if (error) {
    console.error('[users] block failed:', error.message, error.code);
    throw new ServiceError(500, 'SERVER_ERROR', 'Could not change the status.');
  }
  return { user: toRow(data as unknown as DbRow) };
}