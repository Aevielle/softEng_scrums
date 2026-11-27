// web/src/test/unit/api/customers/customers.delete-restore.test.jsx
jest.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: jest.fn() } }));
jest.mock('@/lib/auth/rights');
jest.mock('@/lib/auth/guard');

const { supabaseAdmin } = require('@/lib/supabase/admin');
const { hasRight, rightsFor } = require('@/lib/auth/rights');
const { authorizeApi } = require('@/lib/auth/guard');
const { deleteCustomer, restoreCustomer } = require('@/lib/customers/service');
const { DELETE } = require('@/app/api/customers/[custno]/route');
const { POST: restoreRoute } = require('@/app/api/customers/[custno]/restore/route');

const admin = { id: 'u1', role: 'admin', email: 'admin@hope.com' };
const user = { id: 'u2', role: 'user', email: 'user@hope.com' };
const dbCustomer = {
  custno: 'C001',
  custname: 'Acme Corp',
  address: '123 Test St',
  payterm: 'COD',
  stamp: 'CREATED admin 2026-11-20 10:00 AM',
  is_deleted: false,
};

function chain(result) {
  const c = {};
  ['select', 'eq', 'order', 'limit', 'insert', 'update', 'single', 'maybeSingle'].forEach(
    (m) => (c[m] = jest.fn(() => c))
  );
  c.then = (resolve) => resolve(result);
  return c;
}

beforeEach(() => {
  jest.resetAllMocks();
  hasRight.mockResolvedValue(true);
  rightsFor.mockResolvedValue(new Set(['Delete Customer']));
  authorizeApi.mockResolvedValue({ ok: true, user: admin });
});

describe('Customer Delete Service (deleteCustomer)', () => {
  it('refuses deletion when customer has active sales (409 HAS_ACTIVE_SALES)', async () => {
    supabaseAdmin.from
      // loadCustomer: customer exists and is not deleted
      .mockReturnValueOnce(chain({ data: { custno: 'C001', is_deleted: false }, error: null }))
      // activeSalesCount: customer has 2 active sales
      .mockReturnValueOnce(chain({ count: 2, error: null }));

    await expect(deleteCustomer(admin, 'C001')).rejects.toMatchObject({
      status: 409,
      code: 'HAS_ACTIVE_SALES',
      message: expect.stringMatching(/Customer C001 still has 2 active sales/i),
    });
    // Ensure update was not executed
    expect(supabaseAdmin.from).toHaveBeenCalledTimes(2);
  });

  it('soft-deletes customer without active sales and sets DELETED stamp', async () => {
    const updateChain = chain({
      data: [{ ...dbCustomer, stamp: 'DELETED admin 2026-11-27 1:00 PM', is_deleted: true }],
      error: null,
    });

    supabaseAdmin.from
      // loadCustomer: exists and not deleted
      .mockReturnValueOnce(chain({ data: { custno: 'C001', is_deleted: false }, error: null }))
      // activeSalesCount: 0 active sales
      .mockReturnValueOnce(chain({ count: 0, error: null }))
      // update soft delete
      .mockReturnValueOnce(updateChain);

    const res = await deleteCustomer(admin, 'C001');

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_deleted: true,
        stamp: expect.stringMatching(/^DELETED admin\b/),
      })
    );
    expect(res.customer.status).toBe('Inactive');
    expect(res.customer.stamp).toMatch(/^DELETED admin\b/);
  });

  it('refuses delete when customer is already deleted (409 DELETED)', async () => {
    supabaseAdmin.from.mockReturnValueOnce(
      chain({ data: { custno: 'C001', is_deleted: true }, error: null })
    );

    await expect(deleteCustomer(admin, 'C001')).rejects.toMatchObject({
      status: 409,
      code: 'DELETED',
      message: expect.stringMatching(/already deleted/i),
    });
  });

  it('refuses delete when customer does not exist (404 NOT_FOUND)', async () => {
    supabaseAdmin.from.mockReturnValueOnce(chain({ data: null, error: null }));

    await expect(deleteCustomer(admin, 'C999')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('refuses delete without Delete Customer right (403 FORBIDDEN)', async () => {
    hasRight.mockResolvedValueOnce(false);
    await expect(deleteCustomer(user, 'C001')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
    });
  });
});

describe('Customer Restore Service (restoreCustomer)', () => {
  it('restores inactive customer for Admin and sets EDITED stamp', async () => {
    const updateChain = chain({
      data: [{ ...dbCustomer, stamp: 'EDITED admin 2026-11-27 2:00 PM', is_deleted: false }],
      error: null,
    });

    supabaseAdmin.from
      // loadCustomer: customer is currently deleted
      .mockReturnValueOnce(chain({ data: { custno: 'C001', is_deleted: true }, error: null }))
      // update restore
      .mockReturnValueOnce(updateChain);

    const res = await restoreCustomer(admin, 'C001');

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_deleted: false,
        stamp: expect.stringMatching(/^EDITED admin\b/),
      })
    );
    expect(res.customer.status).toBe('Active');
    expect(res.customer.stamp).toMatch(/^EDITED admin\b/);
  });

  it('refuses restore for User role (403 FORBIDDEN)', async () => {
    await expect(restoreCustomer(user, 'C001')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN',
      message: expect.stringMatching(/Only an Admin or Superadmin can restore a customer/i),
    });
  });

  it('refuses restore when customer is already active (409 ACTIVE)', async () => {
    supabaseAdmin.from.mockReturnValueOnce(
      chain({ data: { custno: 'C001', is_deleted: false }, error: null })
    );

    await expect(restoreCustomer(admin, 'C001')).rejects.toMatchObject({
      status: 409,
      code: 'ACTIVE',
      message: expect.stringMatching(/already active/i),
    });
  });
});

describe('Customer Delete and Restore Routes', () => {
  it('DELETE /api/customers/[custno] rejects without Delete Customer right', async () => {
    rightsFor.mockResolvedValueOnce(new Set([])); // no delete right
    const req = new Request('http://localhost/api/customers/C001', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ custno: 'C001' }) });
    expect(res.status).toBe(403);
  });

  it('POST /api/customers/[custno]/restore rejects non-JSON content-type (415)', async () => {
    const req = new Request('http://localhost/api/customers/C001/restore', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'restore',
    });
    const res = await restoreRoute(req, { params: Promise.resolve({ custno: 'C001' }) });
    expect(res.status).toBe(415);
  });
});
