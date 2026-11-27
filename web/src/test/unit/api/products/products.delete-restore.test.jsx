// web/src/test/unit/api/products/products.delete-restore.test.jsx
jest.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: jest.fn() } }));
jest.mock('@/lib/auth/rights');
jest.mock('@/lib/auth/guard');
jest.mock('@/lib/products/prices-service', () => ({
  currentPrice: jest.fn().mockResolvedValue(18.5),
}));

const { supabaseAdmin } = require('@/lib/supabase/admin');
const { rightsFor } = require('@/lib/auth/rights');
const { authorizeApi } = require('@/lib/auth/guard');
const { deleteProduct, restoreProduct } = require('@/lib/products/service');
const { DELETE } = require('@/app/api/products/[prodcode]/route');
const { POST: restoreRoute } = require('@/app/api/products/[prodcode]/restore/route');

const admin = { id: 'u1', role: 'admin', email: 'admin@hope.com' };
const user = { id: 'u2', role: 'user', email: 'user@hope.com' };
const dbProduct = {
  prodcode: 'P-001',
  description: 'Widget',
  unit: 'pcs',
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
  rightsFor.mockResolvedValue(new Set(['Delete Product']));
  authorizeApi.mockResolvedValue({ ok: true, user: admin });
});

describe('Product Delete Service (deleteProduct)', () => {
  it('refuses deletion when product is on active sale lines (409 IN_USE)', async () => {
    supabaseAdmin.from
      // 1. check existing product
      .mockReturnValueOnce(chain({ data: { prodcode: 'P-001', is_deleted: false }, error: null }))
      // 2. activeSaleLines returns 3 active salesdetail lines
      .mockReturnValueOnce(chain({ count: 3, error: null }));

    await expect(deleteProduct(admin, 'P-001')).rejects.toMatchObject({
      code: 'IN_USE',
      message: expect.stringMatching(/Cannot delete P-001: it is on 3 active sale lines/i),
    });
    // Ensure update was not executed
    expect(supabaseAdmin.from).toHaveBeenCalledTimes(2);
  });

  it('soft-deletes product without active sales and sets DELETED stamp', async () => {
    const updateChain = chain({
      data: { ...dbProduct, stamp: 'DELETED admin 2026-11-27 1:00 PM', is_deleted: true },
      error: null,
    });

    supabaseAdmin.from
      // 1. check existing product
      .mockReturnValueOnce(chain({ data: { prodcode: 'P-001', is_deleted: false }, error: null }))
      // 2. activeSaleLines returns 0
      .mockReturnValueOnce(chain({ count: 0, error: null }))
      // 3. update is_deleted and stamp
      .mockReturnValueOnce(updateChain);

    const res = await deleteProduct(admin, 'P-001');

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_deleted: true,
        stamp: expect.stringMatching(/^DELETED admin\b/),
      })
    );
    expect(res.status).toBe('Inactive');
    expect(res.stamp).toMatch(/^DELETED admin\b/);
  });

  it('refuses delete when product is already inactive (409 DELETED)', async () => {
    supabaseAdmin.from.mockReturnValueOnce(
      chain({ data: { prodcode: 'P-001', is_deleted: true }, error: null })
    );

    await expect(deleteProduct(admin, 'P-001')).rejects.toMatchObject({
      code: 'DELETED',
      message: expect.stringMatching(/already Inactive/i),
    });
  });

  it('refuses delete when product does not exist (404 NOT_FOUND)', async () => {
    supabaseAdmin.from.mockReturnValueOnce(chain({ data: null, error: null }));

    await expect(deleteProduct(admin, 'P-999')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});

describe('Product Restore Service (restoreProduct)', () => {
  it('restores inactive product for Admin and sets EDITED stamp', async () => {
    const updateChain = chain({
      data: { ...dbProduct, stamp: 'EDITED admin 2026-11-27 2:00 PM', is_deleted: false },
      error: null,
    });

    supabaseAdmin.from.mockReturnValueOnce(updateChain);

    const res = await restoreProduct(admin, 'P-001');

    expect(updateChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_deleted: false,
        stamp: expect.stringMatching(/^EDITED admin\b/),
      })
    );
    expect(res.status).toBe('Active');
    expect(res.stamp).toMatch(/^EDITED admin\b/);
  });

  it('refuses restore for User role (404 NOT_FOUND)', async () => {
    await expect(restoreProduct(user, 'P-001')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('refuses restore when product is already active (409 NOT_DELETED)', async () => {
    // update touches 0 rows because is_deleted was not true
    const updateChain = chain({ data: null, error: null });
    // check confirms product exists
    const checkChain = chain({ data: { prodcode: 'P-001' }, error: null });

    supabaseAdmin.from.mockReturnValueOnce(updateChain).mockReturnValueOnce(checkChain);

    await expect(restoreProduct(admin, 'P-001')).rejects.toMatchObject({
      code: 'NOT_DELETED',
      message: expect.stringMatching(/already Active/i),
    });
  });
});

describe('Product Delete and Restore Routes', () => {
  it('DELETE /api/products/[prodcode] rejects without Delete Product right (403)', async () => {
    rightsFor.mockResolvedValueOnce(new Set([])); // no delete right
    const req = new Request('http://localhost/api/products/P-001', { method: 'DELETE' });
    const res = await DELETE(req, { params: Promise.resolve({ prodcode: 'P-001' }) });
    expect(res.status).toBe(403);
  });

  it('POST /api/products/[prodcode]/restore rejects User role (403)', async () => {
    authorizeApi.mockResolvedValueOnce({ ok: true, user });
    const req = new Request('http://localhost/api/products/P-001/restore', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    });
    const res = await restoreRoute(req, { params: Promise.resolve({ prodcode: 'P-001' }) });
    expect(res.status).toBe(403);
  });

  it('POST /api/products/[prodcode]/restore rejects non-JSON content-type (415)', async () => {
    const req = new Request('http://localhost/api/products/P-001/restore', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
    });
    const res = await restoreRoute(req, { params: Promise.resolve({ prodcode: 'P-001' }) });
    expect(res.status).toBe(415);
  });
});
