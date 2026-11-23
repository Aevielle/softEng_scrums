// web/src/test/unit/auth-guard.test.js
const { authorizeApi, requirePageAccess } = require('@/lib/auth/guard');
const { getCurrentUser } = require('@/lib/auth/permissions');
const { redirect } = require('next/navigation');

jest.mock('@/lib/auth/permissions');
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));

const user = (o = {}) => ({ id: 'u1', role: 'user', mustChange: false, allowed: new Set(['customers']), ...o });

beforeEach(() => jest.resetAllMocks());

// CUS-37, CUS-38, CUS-39
it.each([
  ['no session', null, 401, 'UNAUTHENTICATED'],
  ['must change password', user({ mustChange: true }), 403, 'MUST_CHANGE'],
  ['no right', user({ allowed: new Set() }), 403, 'FORBIDDEN'],
])('authorizeApi blocks: %s', async (_, u, status, code) => {
  getCurrentUser.mockResolvedValue(u);
  const r = await authorizeApi('customers');
  expect(r.ok).toBe(false);
  expect(r.response.status).toBe(status);
  expect((await r.response.json()).code).toBe(code);
});

// CUS-40
it('authorizeApi allows a user with the right', async () => {
  const u = user();
  getCurrentUser.mockResolvedValue(u);
  expect(await authorizeApi('customers')).toEqual({ ok: true, user: u });
});

// CUS-41
it.each([
  [null, '/'],
  [user({ mustChange: true }), '/set-password'],
  [user({ allowed: new Set() }), '/dashboard?denied=customers'],
])('requirePageAccess redirects to the right place (%#)', async (u, target) => {
  getCurrentUser.mockResolvedValue(u);
  await requirePageAccess('customers');
  expect(redirect).toHaveBeenCalledWith(target);
});
