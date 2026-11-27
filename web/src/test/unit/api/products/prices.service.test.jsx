// web/src/test/unit/api/products/prices.service.test.jsx
jest.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: jest.fn() } }));

const { supabaseAdmin } = require('@/lib/supabase/admin');
const {
  listPrices,
  addPrice,
  updatePrice,
  deletePrice,
} = require('@/lib/products/prices-service');

const admin = { role: 'admin', email: 'admin@hope.com' };
const user = { role: 'user', email: 'user@hope.com' };
const productRow = { prodcode: 'P-001', description: 'Widget', unit: 'pcs', is_deleted: false };

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
});

describe('listPrices', () => {
  it('Admin gets prices with Status and Stamp', async () => {
    // 1. loadProduct
    supabaseAdmin.from
      .mockReturnValueOnce(chain({ data: productRow, error: null }))
      // 2. price list query
      .mockReturnValueOnce(
        chain({
          data: [
            { effdate: '2026-03-01', unitprice: 25.0, stamp: 'CREATED admin@hope.com now' },
            { effdate: '2026-01-01', unitprice: 20.0, stamp: 'DELETED admin@hope.com now' },
          ],
          error: null,
        })
      )
      // 3. currentPrice query
      .mockReturnValueOnce(
        chain({
          data: [{ effdate: '2026-03-01', unitprice: 25.0, stamp: 'CREATED admin@hope.com now' }],
          error: null,
        })
      );

    const result = await listPrices(admin, 'P-001');
    expect(result.product.prodcode).toBe('P-001');
    expect(result.prices).toHaveLength(2);
    expect(result.prices[0].status).toBe('Active');
    expect(result.prices[1].status).toBe('Inactive');
    expect(result.currentPrice).toBe(25.0);
  });

  it('User list filters deleted prices and hides Status/Stamp', async () => {
    const listChain = chain({
      data: [{ effdate: '2026-03-01', unitprice: 25.0, stamp: null }],
      error: null,
    });

    supabaseAdmin.from
      .mockReturnValueOnce(chain({ data: productRow, error: null }))
      .mockReturnValueOnce(listChain)
      .mockReturnValueOnce(chain({ data: [{ effdate: '2026-03-01', unitprice: 25.0 }], error: null }));

    const result = await listPrices(user, 'P-001');
    expect(listChain.or).toHaveBeenCalled(); // checks NOT_DELETED filter
    expect(result.prices[0]).not.toHaveProperty('stamp');
    expect(result.prices[0]).not.toHaveProperty('status');
  });

  it('throws 404 NOT_FOUND when product does not exist', async () => {
    supabaseAdmin.from.mockReturnValueOnce(chain({ data: null, error: null }));
    await expect(listPrices(admin, 'P-999')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('addPrice', () => {
  it('adds a new price with CREATED stamp', async () => {
    supabaseAdmin.from
      // 1. loadWritableProduct
      .mockReturnValueOnce(chain({ data: productRow, error: null }))
      // 2. assertDateFree
      .mockReturnValueOnce(chain({ data: null, error: null }))
      // 3. insert
      .mockReturnValueOnce(
        chain({
          data: { effdate: '2026-04-01', unitprice: 30.0, stamp: 'CREATED admin@hope.com now' },
          error: null,
        })
      )
      // 4. currentPrice
      .mockReturnValueOnce(
        chain({
          data: [{ effdate: '2026-04-01', unitprice: 30.0, stamp: 'CREATED admin@hope.com now' }],
          error: null,
        })
      );

    const res = await addPrice(admin, 'P-001', { effdate: '2026-04-01', unitprice: 30.0 });
    expect(res.price.effdate).toBe('2026-04-01');
    expect(res.price.unitprice).toBe(30.0);
    expect(res.price.status).toBe('Active');
  });

  it('rejects duplicate effective date for an active price (DUPLICATE_DATE, 409)', async () => {
    supabaseAdmin.from
      .mockReturnValueOnce(chain({ data: productRow, error: null }))
      // assertDateFree finds existing active date
      .mockReturnValueOnce(chain({ data: { effdate: '2026-04-01', stamp: 'CREATED' }, error: null }));

    await expect(addPrice(admin, 'P-001', { effdate: '2026-04-01', unitprice: 30.0 })).rejects.toMatchObject({
      code: 'DUPLICATE_DATE',
      message: expect.stringMatching(/already has a price for that effective date/i),
    });
  });

  it('rejects duplicate effective date for an inactive/deleted price (DUPLICATE_DATE, 409)', async () => {
    supabaseAdmin.from
      .mockReturnValueOnce(chain({ data: productRow, error: null }))
      // assertDateFree finds existing deleted date
      .mockReturnValueOnce(chain({ data: { effdate: '2026-04-01', stamp: 'DELETED' }, error: null }));

    await expect(addPrice(admin, 'P-001', { effdate: '2026-04-01', unitprice: 30.0 })).rejects.toMatchObject({
      code: 'DUPLICATE_DATE',
      message: expect.stringMatching(/Inactive \(deleted\) price already uses this effective date/i),
    });
  });

  it('rejects adding a price to an inactive product (PRODUCT_DELETED, 409)', async () => {
    supabaseAdmin.from.mockReturnValueOnce(
      chain({ data: { ...productRow, is_deleted: true }, error: null })
    );

    await expect(addPrice(admin, 'P-001', { effdate: '2026-04-01', unitprice: 30.0 })).rejects.toMatchObject({
      code: 'PRODUCT_DELETED',
    });
  });
});

describe('updatePrice', () => {
  it('updates price when changing unitprice and keeping the same effective date', async () => {
    supabaseAdmin.from
      // 1. loadWritableProduct
      .mockReturnValueOnce(chain({ data: productRow, error: null }))
      // (assertDateFree is bypassed because oldEffdate === effdate)
      // 2. update
      .mockReturnValueOnce(
        chain({
          data: { effdate: '2026-03-01', unitprice: 35.0, stamp: 'EDITED admin@hope.com now' },
          error: null,
        })
      )
      // 3. currentPrice
      .mockReturnValueOnce(
        chain({
          data: [{ effdate: '2026-03-01', unitprice: 35.0, stamp: 'EDITED' }],
          error: null,
        })
      );

    const res = await updatePrice(admin, 'P-001', '2026-03-01', { effdate: '2026-03-01', unitprice: 35.0 });
    expect(res.price.unitprice).toBe(35.0);
  });

  it('rejects updating to an effective date that collides with another price', async () => {
    supabaseAdmin.from
      .mockReturnValueOnce(chain({ data: productRow, error: null }))
      // assertDateFree finds another price on the target date
      .mockReturnValueOnce(chain({ data: { effdate: '2026-05-01', stamp: 'CREATED' }, error: null }));

    await expect(
      updatePrice(admin, 'P-001', '2026-03-01', { effdate: '2026-05-01', unitprice: 40.0 })
    ).rejects.toMatchObject({
      code: 'DUPLICATE_DATE',
    });
  });

  it('throws PRICE_DELETED or NOT_FOUND if the price is already inactive or gone', async () => {
    supabaseAdmin.from
      .mockReturnValueOnce(chain({ data: productRow, error: null }))
      // update returns no row
      .mockReturnValueOnce(chain({ data: null, error: null }))
      // whyMissing finds price is deleted
      .mockReturnValueOnce(chain({ data: { stamp: 'DELETED' }, error: null }));

    await expect(
      updatePrice(admin, 'P-001', '2026-03-01', { effdate: '2026-03-01', unitprice: 40.0 })
    ).rejects.toMatchObject({
      code: 'PRICE_DELETED',
    });
  });
});

describe('deletePrice', () => {
  it('soft-deletes price by marking with DELETED stamp', async () => {
    supabaseAdmin.from
      // 1. loadWritableProduct
      .mockReturnValueOnce(chain({ data: productRow, error: null }))
      // 2. update with DELETED stamp
      .mockReturnValueOnce(
        chain({
          data: { effdate: '2026-03-01', unitprice: 25.0, stamp: 'DELETED admin@hope.com now' },
          error: null,
        })
      )
      // 3. currentPrice
      .mockReturnValueOnce(chain({ data: [], error: null }));

    const res = await deletePrice(admin, 'P-001', '2026-03-01');
    expect(res.price.status).toBe('Inactive');
    expect(res.price.stamp).toMatch(/^DELETED/);
  });

  it('throws PRICE_DELETED when price is already inactive', async () => {
    supabaseAdmin.from
      .mockReturnValueOnce(chain({ data: productRow, error: null }))
      // update returns no row (already inactive)
      .mockReturnValueOnce(chain({ data: null, error: null }))
      // whyMissing finds price is already DELETED
      .mockReturnValueOnce(chain({ data: { stamp: 'DELETED' }, error: null }));

    await expect(deletePrice(admin, 'P-001', '2026-03-01')).rejects.toMatchObject({
      code: 'PRICE_DELETED',
    });
  });
});
