// web/src/test/unit/api/products/products.service.test.jsx
jest.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: jest.fn() } }));
jest.mock('@/lib/products/prices-service', () => ({
  currentPrice: jest.fn(),
  currentPrices: jest.fn(),
}));

const { supabaseAdmin } = require('@/lib/supabase/admin');
const { currentPrice, currentPrices } = require('@/lib/products/prices-service');
const {
  listProducts,
  countProducts,
  createProduct,
  updateProduct,
  formatCode,
} = require('@/lib/products/service');

const admin = { role: 'admin', email: 'admin@hope.com' };
const user = { role: 'user', email: 'user@hope.com' };
const productRow = {
  prodcode: 'P-001',
  description: 'Steel bracket',
  unit: 'pcs',
  stamp: 'CREATED admin@hope.com now',
  is_deleted: false,
};

function chain(result) {
  const c = {};
  [
    'select',
    'eq',
    'order',
    'limit',
    'insert',
    'update',
    'single',
    'maybeSingle',
    'range',
    'or',
    'lte',
  ].forEach((m) => (c[m] = jest.fn(() => c)));
  c.then = (resolve) => resolve(result);
  return c;
}

beforeEach(() => {
  jest.resetAllMocks();
  currentPrice.mockResolvedValue(15.5);
  currentPrices.mockResolvedValue(new Map([['P-001', 15.5]]));
});

describe('formatCode', () => {
  it('formats number into P-XXX representation', () => {
    expect(formatCode(1)).toBe('P-001');
    expect(formatCode(42)).toBe('P-042');
    expect(formatCode(105)).toBe('P-105');
  });
});

describe('listProducts', () => {
  it('Admin gets Status, Stamp, price, and never is_deleted', async () => {
    supabaseAdmin.from.mockReturnValue(
      chain({
        data: [productRow, { ...productRow, prodcode: 'P-002', is_deleted: true }],
        error: null,
      })
    );
    const res = await listProducts(admin);
    expect(res.map((r) => r.status)).toEqual(['Active', 'Inactive']);
    expect(res[0].stamp).toBeTruthy();
    expect(res[0].price).toBe(15.5);
    expect(res[0]).not.toHaveProperty('is_deleted');
  });

  it('User list hides Status/Stamp and filters deleted rows', async () => {
    const q = chain({
      data: [{ prodcode: 'P-001', description: 'Steel bracket', unit: 'pcs' }],
      error: null,
    });
    supabaseAdmin.from.mockReturnValue(q);
    const res = await listProducts(user);
    expect(q.eq).toHaveBeenCalledWith('is_deleted', false);
    expect(q.select).toHaveBeenCalledWith('prodcode, description, unit');
    expect(res[0]).not.toHaveProperty('stamp');
    expect(res[0]).not.toHaveProperty('status');
    expect(res[0].price).toBe(15.5);
  });
});

describe('countProducts', () => {
  it('User: total equals active, inactive is 0', async () => {
    supabaseAdmin.from.mockReturnValueOnce(chain({ count: 5, error: null }));
    expect(await countProducts(user)).toEqual({ total: 5, active: 5, inactive: 0 });
  });

  it('Admin: counts deleted rows as inactive', async () => {
    supabaseAdmin.from
      .mockReturnValueOnce(chain({ count: 5, error: null }))
      .mockReturnValueOnce(chain({ count: 8, error: null }));
    expect(await countProducts(admin)).toEqual({ total: 8, active: 5, inactive: 3 });
  });

  it('returns null when the count lookup fails', async () => {
    supabaseAdmin.from.mockReturnValueOnce(chain({ count: null, error: { message: 'db error' } }));
    expect(await countProducts(admin)).toBeNull();
  });
});

describe('createProduct', () => {
  it('creates product with next serial number, CREATED stamp, and null price', async () => {
    const highestChain = chain({ data: [{ prodcode: 'P-002' }], error: null });
    const insertChain = chain({
      data: {
        prodcode: 'P-003',
        description: 'New widget',
        unit: 'pcs',
        stamp: 'CREATED admin@hope.com now',
        is_deleted: false,
      },
      error: null,
    });

    supabaseAdmin.from
      .mockReturnValueOnce(highestChain)
      .mockReturnValueOnce(insertChain);

    const product = await createProduct(admin, { description: 'New widget', unit: 'pcs' });

    expect(insertChain.insert).toHaveBeenCalledWith({
      prodcode: 'P-003',
      description: 'New widget',
      unit: 'pcs',
      stamp: expect.stringMatching(/^CREATED admin\b/),
    });
    expect(product.prodcode).toBe('P-003');
    expect(product.price).toBeNull();
    expect(product.status).toBe('Active');
  });

  it('retries with next serial if primary key collision (23505) occurs', async () => {
    const highestChain = chain({ data: [{ prodcode: 'P-001' }], error: null });
    const collides = chain({ data: null, error: { code: '23505' } });
    const succeeds = chain({
      data: {
        prodcode: 'P-003',
        description: 'Widget',
        unit: 'pcs',
        stamp: 'CREATED admin@hope.com now',
        is_deleted: false,
      },
      error: null,
    });

    supabaseAdmin.from
      .mockReturnValueOnce(highestChain)
      .mockReturnValueOnce(collides)
      .mockReturnValueOnce(succeeds);

    const product = await createProduct(admin, { description: 'Widget', unit: 'pcs' });
    expect(product.prodcode).toBe('P-003');
  });
});

describe('updateProduct', () => {
  it('updates description and unit with EDITED stamp and attaches current price', async () => {
    const lookup = chain({ data: { prodcode: 'P-001', is_deleted: false }, error: null });
    const update = chain({
      data: {
        prodcode: 'P-001',
        description: 'Updated widget',
        unit: 'can',
        stamp: 'EDITED admin@hope.com now',
        is_deleted: false,
      },
      error: null,
    });

    supabaseAdmin.from.mockReturnValueOnce(lookup).mockReturnValueOnce(update);

    const updated = await updateProduct(admin, 'P-001', { description: 'Updated widget', unit: 'can' });
    expect(update.update).toHaveBeenCalledWith({
      description: 'Updated widget',
      unit: 'can',
      stamp: expect.stringMatching(/^EDITED admin\b/),
    });
    expect(updated.description).toBe('Updated widget');
    expect(updated.unit).toBe('can');
    expect(updated.price).toBe(15.5);
  });

  it('throws 404 NOT_FOUND when product does not exist', async () => {
    supabaseAdmin.from.mockReturnValueOnce(chain({ data: null, error: null }));
    await expect(updateProduct(admin, 'P-999', { description: 'X', unit: 'pcs' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws 409 DELETED when product is soft-deleted for Admin', async () => {
    supabaseAdmin.from.mockReturnValueOnce(chain({ data: { prodcode: 'P-001', is_deleted: true }, error: null }));
    await expect(updateProduct(admin, 'P-001', { description: 'X', unit: 'pcs' })).rejects.toMatchObject({
      code: 'DELETED',
    });
  });

  it('throws 404 NOT_FOUND when product is soft-deleted for User', async () => {
    supabaseAdmin.from.mockReturnValueOnce(chain({ data: { prodcode: 'P-001', is_deleted: true }, error: null }));
    await expect(updateProduct(user, 'P-001', { description: 'X', unit: 'pcs' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
