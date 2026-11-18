import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSession } from '@/lib/auth/session';
import { MODULE_ID_TO_KEY } from '@/lib/auth/rights-layout';

export type ModuleKey = 'customers' | 'products' | 'hr' | 'sales' | 'reports' | 'users' | 'settings';
export type Role = 'superadmin' | 'admin' | 'user';

export type ModuleDef = {
  key: ModuleKey;
  label: string;      // sidebar label
  action: string;     // Quick Actions label
  href: string;
  section: 'modules' | 'admin';
};

export const MODULES: ModuleDef[] = [
  { key: 'customers', label: 'Customers',        action: 'View Customers',  href: '/customers', section: 'modules' },
  { key: 'products',  label: 'Products',         action: 'Manage Products', href: '/products',  section: 'modules' },
  { key: 'hr',        label: 'Human Resources',  action: 'Human Resources', href: '/hr',        section: 'modules' },
  { key: 'sales',     label: 'Sales',            action: 'Sales Pipeline',  href: '/sales',     section: 'modules' },
  { key: 'reports',   label: 'Reports',          action: 'View Reports',    href: '/reports',   section: 'modules' },
  { key: 'users',     label: 'User Management',  action: 'Manage Users',    href: '/users',     section: 'admin' },
  { key: 'settings',  label: 'System Settings',  action: 'System Settings', href: '/settings',  section: 'admin' },
];

export const ROLE_LABEL: Record<Role, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  user: 'User',
};

export function normalizeRole(value?: string | null): Role {
  const r = String(value ?? '').toLowerCase().replace(/[\s_-]+/g, '');
  return r === 'superadmin' ? 'superadmin' : r === 'admin' ? 'admin' : 'user';
}

/** Pure function: which modules may this role + granted list open? */
export function accessFor(role: Role, granted: ModuleKey[]): Set<ModuleKey> {
  if (role === 'superadmin') return new Set(MODULES.map((m) => m.key));
  if (role === 'admin') {
    return new Set(MODULES.filter((m) => m.key !== 'settings').map((m) => m.key));
  }
  // A plain User can only ever hold business modules, never the admin ones
  return new Set(
    granted.filter((k) => MODULES.find((m) => m.key === k)?.section === 'modules')
  );
}

// ---------------------------------------------------------------------------
// TEMPORARY, for the Nov 9 demo only: until per-user rights are seeded,
// a User with no rights rows gets the modules shown in Figure 8.
// S1-DEV-07: rights now live in user_permission and are set from the Rights dialog,
// so this MUST be false. Left on, un-ticking every right would still show these modules.
const USE_TEMP_DEFAULT_RIGHTS = false;
const TEMP_USER_MODULES: ModuleKey[] = ['customers', 'products', 'sales'];
// ---------------------------------------------------------------------------

const KEY_ALIASES: Record<string, ModuleKey> = {
  customer: 'customers', customers: 'customers',
  product: 'products', products: 'products',
  hr: 'hr', humanresources: 'hr', humanresource: 'hr',
  sales: 'sales',
  report: 'reports', reports: 'reports',
};

/**
 * A module is "on" for a User when they hold at least one active right in it
 * (user_permission -> rights_catalogue.module_id). This is what the Rights dialog writes.
 * Returns module keys the user was granted. On error it returns [] (fail closed).
 */
async function grantedKeysForUser(userId: number): Promise<ModuleKey[]> {
  const { data, error } = await supabaseAdmin
    .from('user_permission')
    .select('right:right_id(module_id)')
    .eq('user_id', userId)
    .eq('is_deleted', false);

  if (error) {
    console.error('[permissions] rights lookup failed:', error.message, error.code);
    return [];
  }

  const keys = new Set<ModuleKey>();
  for (const row of data ?? []) {
    const right = Array.isArray(row.right) ? row.right[0] : row.right;
    const key = MODULE_ID_TO_KEY[right?.module_id as keyof typeof MODULE_ID_TO_KEY];
    if (key) keys.add(key);
  }
  return [...keys];
}

export type CurrentUser = {
  id: number | null;
  firstName: string;
  email: string;
  role: Role;
  roleLabel: string;
  mustChange: boolean;
  allowed: Set<ModuleKey>;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;

  // Demo sessions only work while DEMO_LOGIN=true, so a leftover cookie dies with the flag
  if (session.sub.startsWith('demo-')) {
    if (process.env.DEMO_LOGIN !== 'true') return null;
    const role = normalizeRole(session.role);
    return {
      id: null,
      firstName: ROLE_LABEL[role],
      email: `${role}@hope.com`,
      role,
      roleLabel: ROLE_LABEL[role],
      mustChange: false,
      allowed: accessFor(role, TEMP_USER_MODULES),
    };
  }

  const id = Number(session.sub);
  if (!Number.isInteger(id)) return null;

  // Re-read the user every request: role changes and blocks apply immediately
  const { data, error } = await supabaseAdmin
    .from('app_user')
    .select('first_name, email, is_blocked, account_status, role:role_id(role_name)')
    .eq('user_id', id)
    .maybeSingle();

  if (error) {
    console.error('[permissions] user lookup failed:', error.message, error.code);
    return null;
  }
  if (!data || data.is_blocked || data.account_status !== 'active') return null;

  const roleObj = Array.isArray(data.role) ? data.role[0] : data.role;
  const role = normalizeRole(roleObj?.role_name);

  let granted: ModuleKey[] = [];
  if (role === 'user') {
    granted = await grantedKeysForUser(id);
    if (granted.length === 0 && USE_TEMP_DEFAULT_RIGHTS) granted = TEMP_USER_MODULES;
  }

  return {
    id,
    firstName: data.first_name || ROLE_LABEL[role],
    email: data.email,
    role,
    roleLabel: ROLE_LABEL[role],
    mustChange: session.mustChange,
    allowed: accessFor(role, granted),
  };
}