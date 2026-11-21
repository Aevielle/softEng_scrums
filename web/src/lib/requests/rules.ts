// Change requests (Profile module). Pure helpers with no server imports, so the Profile page, the
// User Management page and the API all read a request the same way.

export type Role = 'superadmin' | 'admin' | 'user';
export type RequestKind = 'profile' | 'role' | 'access';
export type RequestStatus = 'pending' | 'approved' | 'declined';

export type Person = { firstName: string; lastName: string; email: string };

export type RequestPayload = {
  role?: 'admin' | 'superadmin'; // kind = role
  scope?: 'module' | 'right'; // kind = access
  moduleId?: number;
  rightId?: number;
  label?: string;
  from?: Person; // kind = profile
  to?: Person;
};

export type RequestRow = {
  id: string;
  kind: RequestKind;
  status: RequestStatus;
  reason: string;
  userId: number;
  userName: string;
  userEmail: string;
  userRole: Role;
  createdAt: string; // ISO
  decidedAt: string | null;
  decidedByName: string | null;
  payload: RequestPayload;
};

export const REASON_MAX = 500;

/** Roles a person may ask for: only higher ones. A Superadmin has nothing higher to ask for. */
export function requestableRoles(role: Role): ('admin' | 'superadmin')[] {
  if (role === 'user') return ['admin', 'superadmin'];
  if (role === 'admin') return ['superadmin'];
  return [];
}

/** Admins already hold every business module, so only plain Users ask for access. */
export const canRequestAccess = (role: Role) => role === 'user';

/** A Superadmin saves their own name and email directly; everyone else sends a request. */
export const editsProfileDirectly = (role: Role) => role === 'superadmin';

export function requestTitle(r: Pick<RequestRow, 'kind' | 'payload'>): string {
  if (r.kind === 'role') return `Role change: ${r.payload.role ?? ''}`;
  if (r.kind === 'access') return `Access: ${r.payload.label ?? ''}`;
  return 'Profile change';
}

/** For profile requests: one "Field: old → new" line per changed field. */
export function requestDetails(r: Pick<RequestRow, 'kind' | 'payload'>): string[] {
  if (r.kind !== 'profile' || !r.payload.from || !r.payload.to) return [];
  const { from, to } = r.payload;
  const out: string[] = [];
  if (from.firstName !== to.firstName) out.push(`First name: ${from.firstName || '—'} → ${to.firstName}`);
  if (from.lastName !== to.lastName) out.push(`Last name: ${from.lastName || '—'} → ${to.lastName}`);
  if (from.email !== to.email) out.push(`Email: ${from.email} → ${to.email}`);
  return out;
}

export const STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  declined: 'Declined',
};
