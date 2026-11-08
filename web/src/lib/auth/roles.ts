export type Role = 'user' | 'admin' | 'superadmin';

const ADMIN_ROLES: Role[] = ['admin', 'superadmin'];

/** Normalises whatever the session stores ("Admin", "ADMIN", "superadmin") to a Role, or null. */
export function normalizeRole(role: unknown): Role | null {
  if (typeof role !== 'string') return null;
  const r = role.trim().toLowerCase().replace(/[\s_-]/g, '');
  return r === 'user' || r === 'admin' || r === 'superadmin' ? r : null;
}

export function hasRole(role: unknown, allowed: Role[]): boolean {
  const r = normalizeRole(role);
  return r !== null && allowed.includes(r);
}

export function isAdmin(role: unknown): boolean {
  return hasRole(role, ADMIN_ROLES);
}