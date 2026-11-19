const { decide } = require('@/lib/auth/oauthDecision');

const active = { user_id: 1, is_blocked: false, account_status: 'active', must_change_password: false };

test('Unknown email: sign-in creates an account, reset says not found', () => {
  expect(decide('signin', null)).toEqual({ kind: 'create' });
  expect(decide('reset', null)).toEqual({ kind: 'notfound' });
});

test('Blocked accounts are refused for both intents', () => {
  const blocked = { ...active, is_blocked: true };
  expect(decide('signin', blocked)).toEqual({ kind: 'blocked' });
  expect(decide('reset', blocked)).toEqual({ kind: 'blocked' });
});

test('Pending accounts are refused', () => {
  expect(decide('signin', { ...active, account_status: 'pending' })).toEqual({ kind: 'pending' });
});

test('Active sign-in goes to the dashboard', () => {
  expect(decide('signin', active)).toEqual({ kind: 'session', mustChange: false, redirect: '/dashboard' });
});

test('must_change_password sends sign-in to set-password', () => {
  const r = decide('signin', { ...active, must_change_password: true });
  expect(r).toEqual({ kind: 'session', mustChange: true, redirect: '/set-password' });
});

test('Reset always ends at set-password', () => {
  expect(decide('reset', active)).toEqual({ kind: 'session', mustChange: true, redirect: '/set-password' });
});