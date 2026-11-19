const { GET } = require("@/app/api/customers/route");
const { authorizeApi } = require("@/lib/auth/guard");
const { listCustomers } = require("@/lib/customers/service");
const { filterCustomers } = require("@/lib/customers/filter");
const { fail } = require("@/lib/users/service");
const { NextResponse } = require("next/server");

jest.mock('@/lib/auth/guard');
jest.mock('@/lib/users/service');
jest.mock('@/lib/customers/service');
jest.mock('@/lib/customers/filter');

// jest.mock() automocks these, so they already have .mockResolvedValue etc.
const mockAuth = authorizeApi;
const mockFail = fail;
const mockList = listCustomers;
const mockFilter = filterCustomers;

const rows = [{ id: 1 }, { id: 2 }];
const call = (qs = '') => GET(new Request(`http://localhost/api/customers${qs}`));
const signedIn = (role) =>
  mockAuth.mockResolvedValue({ ok: true, user: { id: 'u1', role } });

beforeEach(() => {
  jest.resetAllMocks();
  mockList.mockResolvedValue(rows);
  mockFilter.mockReturnValue(rows);
});

it('returns the guard response when not authorized', async () => {
  const denied = NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
  mockAuth.mockResolvedValue({ ok: false, response: denied });

  const res = await call();

  expect(res.status).toBe(403);
  expect(mockAuth).toHaveBeenCalledWith('customers');
  expect(mockList).not.toHaveBeenCalled();
});

it('returns filtered customers as JSON', async () => {
  signedIn('admin');
  const res = await call('?q=acme');

  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ customers: rows });
  expect(mockList).toHaveBeenCalledWith({ id: 'u1', role: 'admin' });
  expect(mockFilter).toHaveBeenCalledWith(rows, { q: 'acme', status: 'All' });
});

it.each(['Active', 'Inactive'])('admin can filter by status=%s', async (s) => {
  signedIn('admin');
  await call(`?status=${s}`);
  expect(mockFilter).toHaveBeenCalledWith(rows, { q: '', status: s });
});

it('admin: invalid status falls back to All', async () => {
  signedIn('admin');
  await call('?status=Banana');
  expect(mockFilter).toHaveBeenCalledWith(rows, { q: '', status: 'All' });
});

it('user role ignores ?status=Inactive', async () => {
  signedIn('user');
  await call('?status=Inactive');
  expect(mockFilter).toHaveBeenCalledWith(rows, { q: '', status: 'All' });
});

it('defaults q to empty string', async () => {
  signedIn('admin');
  await call();
  expect(mockFilter).toHaveBeenCalledWith(rows, { q: '', status: 'All' });
});

it('delegates errors to fail()', async () => {
  signedIn('admin');
  const err = new Error('db down');
  const failed = NextResponse.json({ code: 'INTERNAL' }, { status: 500 });
  mockList.mockRejectedValue(err);
  mockFail.mockReturnValue(failed);

  const res = await call();

  expect(mockFail).toHaveBeenCalledWith(err);
  expect(res).toBe(failed);
});

