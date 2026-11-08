jest.mock('@/lib/auth/session', () => ({
  createSession: jest.fn(),
}));

// The mock result is swapped per test
let mockResult;
jest.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => mockResult,
        }),
      }),
    }),
  },
}));

const bcrypt = require('bcryptjs');
const { createSession } = require('@/lib/auth/session');
const { POST } = require('../app/api/auth/login/route');

const req = (body) => ({ json: async () => body });
const INVALID = 'Invalid email or password. Please check and try again.';

let errorSpy;
beforeEach(() => {
  jest.clearAllMocks();
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => errorSpy.mockRestore());

test('Failed lookup returns 500 and logs the error, not 401', async () => {
  mockResult = {
    data: null,
    error: { message: 'column app_user.must_change_password does not exist', code: '42703' },
  };

  const res = await POST(req({ email: 'any.user@hope.com', password: '@ValidPass1' }));
  const body = await res.json();

  expect(res.status).toBe(500);
  expect(body.code).toBe('SERVER');
  expect(body.message).not.toBe(INVALID);
  expect(errorSpy).toHaveBeenCalledWith(
    '[login] app_user query failed:',
    expect.stringContaining('does not exist'),
    '42703'
  );
  expect(createSession).not.toHaveBeenCalled();
});

test('Unknown email still returns the same 401 message', async () => {
  mockResult = { data: null, error: null };

  const res = await POST(req({ email: 'nobody@hope.com', password: '@ValidPass1' }));
  const body = await res.json();

  expect(res.status).toBe(401);
  expect(body.message).toBe(INVALID);
});

test('Wrong password still returns the same 401 message', async () => {
  mockResult = {
    data: {
      user_id: 1,
      first_name: 'Test',
      email: 'real.user@hope.com',
      password_hash: await bcrypt.hash('@RightPass1', 4),
      is_blocked: false,
      account_status: 'active',
      must_change_password: false,
      role: { role_name: 'User' },
    },
    error: null,
  };

  const res = await POST(req({ email: 'real.user@hope.com', password: '@WrongPass1' }));
  const body = await res.json();

  expect(res.status).toBe(401);
  expect(body.message).toBe(INVALID);
  expect(createSession).not.toHaveBeenCalled();
});