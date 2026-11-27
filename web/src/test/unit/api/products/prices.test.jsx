// web/src/test/unit/api/products/prices.test.jsx
const { GET, POST } = require('@/app/api/products/[prodcode]/prices/route');
const { PATCH, DELETE } = require('@/app/api/products/[prodcode]/prices/[effdate]/route');
const { authorizeApi } = require('@/lib/auth/guard');
const { rightsFor } = require('@/lib/auth/rights');
const {
  listPrices,
  addPrice,
  updatePrice,
  deletePrice,
  PriceError,
} = require('@/lib/products/prices-service');
const { NextResponse } = require('next/server');

jest.mock('@/lib/auth/guard');
jest.mock('@/lib/auth/rights');
jest.mock('@/lib/products/prices-service', () => {
  const actual = jest.requireActual('@/lib/products/prices-service');
  return {
    ...jest.createMockFromModule('@/lib/products/prices-service'),
    PriceError: actual.PriceError,
  };
});

const callGet = (prodcode) =>
  GET(new Request(`http://localhost/api/products/${prodcode}/prices`), {
    params: Promise.resolve({ prodcode }),
  });

const callPost = (prodcode, body, headers = { 'content-type': 'application/json' }) =>
  POST(
    new Request(`http://localhost/api/products/${prodcode}/prices`, {
      method: 'POST',
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ prodcode }) }
  );

const callPatch = (prodcode, effdate, body, headers = { 'content-type': 'application/json' }) =>
  PATCH(
    new Request(`http://localhost/api/products/${prodcode}/prices/${effdate}`, {
      method: 'PATCH',
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ prodcode, effdate }) }
  );

const callDelete = (prodcode, effdate) =>
  DELETE(new Request(`http://localhost/api/products/${prodcode}/prices/${effdate}`, { method: 'DELETE' }), {
    params: Promise.resolve({ prodcode, effdate }),
  });

beforeEach(() => {
  jest.resetAllMocks();
  authorizeApi.mockResolvedValue({
    ok: true,
    user: { id: 1, role: 'admin', email: 'admin@hope.com' },
  });
  rightsFor.mockResolvedValue(new Set(['Add Price', 'Edit Price', 'Delete Price']));
});

describe('GET /api/products/[prodcode]/prices', () => {
  it('returns prices and currentPrice as JSON', async () => {
    const data = {
      product: { prodcode: 'P-001', description: 'Widget', unit: 'pcs' },
      prices: [{ effdate: '2026-03-01', unitprice: 25.0, status: 'Active' }],
      currentPrice: 25.0,
    };
    listPrices.mockResolvedValueOnce(data);

    const res = await callGet('P-001');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(data);
  });

  it('returns 404 when product is not found', async () => {
    listPrices.mockRejectedValueOnce(new PriceError('NOT_FOUND', 'Product not found'));
    const res = await callGet('P-999');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/products/[prodcode]/prices', () => {
  it('creates a new price (201)', async () => {
    const created = {
      price: { effdate: '2026-04-01', unitprice: 30.0, status: 'Active' },
      currentPrice: 30.0,
    };
    addPrice.mockResolvedValueOnce(created);

    const res = await callPost('P-001', { effdate: '2026-04-01', unitprice: 30.0 });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual(created);
  });

  it('rejects without Add Price right (403)', async () => {
    rightsFor.mockResolvedValueOnce(new Set([]));
    const res = await callPost('P-001', { effdate: '2026-04-01', unitprice: 30.0 });
    expect(res.status).toBe(403);
  });

  it('rejects invalid validation format (400)', async () => {
    const res = await callPost('P-001', { effdate: 'bad-date', unitprice: -5 });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION');
  });

  it('rejects duplicate effective date (409 DUPLICATE_DATE)', async () => {
    addPrice.mockRejectedValueOnce(
      new PriceError('DUPLICATE_DATE', 'This product already has a price for that effective date.')
    );
    const res = await callPost('P-001', { effdate: '2026-04-01', unitprice: 30.0 });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('DUPLICATE_DATE');
  });
});

describe('PATCH /api/products/[prodcode]/prices/[effdate]', () => {
  it('updates price (200)', async () => {
    const updated = {
      price: { effdate: '2026-03-01', unitprice: 35.0, status: 'Active' },
      currentPrice: 35.0,
    };
    updatePrice.mockResolvedValueOnce(updated);

    const res = await callPatch('P-001', '2026-03-01', { effdate: '2026-03-01', unitprice: 35.0 });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(updated);
  });

  it('rejects invalid date parameter in URL (404)', async () => {
    const res = await callPatch('P-001', 'not-a-date', { effdate: '2026-03-01', unitprice: 35.0 });
    expect(res.status).toBe(404);
  });

  it('rejects duplicate effective date collision on update (409 DUPLICATE_DATE)', async () => {
    updatePrice.mockRejectedValueOnce(
      new PriceError('DUPLICATE_DATE', 'This product already has a price for that effective date.')
    );
    const res = await callPatch('P-001', '2026-03-01', { effdate: '2026-05-01', unitprice: 35.0 });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('DUPLICATE_DATE');
  });
});

describe('DELETE /api/products/[prodcode]/prices/[effdate]', () => {
  it('deletes price (200)', async () => {
    const deleted = {
      price: { effdate: '2026-03-01', unitprice: 25.0, status: 'Inactive' },
      currentPrice: null,
    };
    deletePrice.mockResolvedValueOnce(deleted);

    const res = await callDelete('P-001', '2026-03-01');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(deleted);
  });

  it('rejects without Delete Price right (403)', async () => {
    rightsFor.mockResolvedValueOnce(new Set([]));
    const res = await callDelete('P-001', '2026-03-01');
    expect(res.status).toBe(403);
  });

  it('returns 409 when price is already inactive', async () => {
    deletePrice.mockRejectedValueOnce(new PriceError('PRICE_DELETED', 'This price is already Inactive.'));
    const res = await callDelete('P-001', '2026-03-01');
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('PRICE_DELETED');
  });
});
