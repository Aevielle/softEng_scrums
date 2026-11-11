export type Intent = 'signin' | 'reset';

export type AppUserRow = {
  user_id: number;
  is_blocked: boolean;
  account_status: string;
  must_change_password?: boolean | null;
} | null;

export type Outcome =
  | { kind: 'create' }
  | { kind: 'notfound' }
  | { kind: 'blocked' }
  | { kind: 'pending' }
  | { kind: 'session'; mustChange: boolean; redirect: string };

export function decide(intent: Intent, user: AppUserRow): Outcome {
  if (!user) return intent === 'signin' ? { kind: 'create' } : { kind: 'notfound' };
  if (user.is_blocked) return { kind: 'blocked' };
  if (user.account_status !== 'active') return { kind: 'pending' };

  // A reset always ends at the set-password page
  const mustChange = intent === 'reset' || !!user.must_change_password;
  return { kind: 'session', mustChange, redirect: mustChange ? '/set-password' : '/dashboard' };
}