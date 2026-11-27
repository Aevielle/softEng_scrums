// web/src/test/unit/api/products/products.test.jsx
const { GET, POST } = require('@/app/api/products/route');
const { PATCH } = require('@/app/api/products/[prodcode]/route');
const { authorizeApi } = require('@/lib/auth/guard');
const { listProducts, createProduct, updateProduct, ProductError } = require('@/lib/products/service');
const { filterProducts } = require('@/lib/products/filter');
const { rightsFor } = require('@/lib/auth/rights');
const { NextResponse } = require('next/server');

jest.mock('@/lib/auth/guard');
jest.mock('@/lib/auth/rights');
jest.mock('@/lib/products/filter');
jest.mock('@/lib/products/service', () => {
  const actual = jest.requireActual('@/lib/products/service');
  return {
    ...jest.createMockFromModule('@/lib/products/service'),
    ProductError: actual.ProductError,
  };
});

const rows = [
  { prodcode: 'P-001', description: 'Widget A', unit: 'pcs', price: 10, status: 'Active' },
  { prodcode: 'P-002', description: 'Widget B', unit: 'meter', price: 20, status: 'Inactive' },
];

const callGet = (qs = '') => GET(new Request(`http://localhost/api/products${qs}`));
const callPost = (body, headers = { 'content-type': 'application/json' }) =>
  POST(
    new Request('http://localhost/api/products', {
      method: 'POST',
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    })
  );
const callPatch = (prodcode, body, headers = { 'content-type': 'application/json' }) =>
  PATCH(
    new Request(`http://localhost/api/products/${prodcode}`, {
      method: 'PATCH',
      headers,
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
    { params: Promise.resolve({ prodcode }) }
  );

beforeEach(() => {
  jest.resetAllMocks();
  authorizeApi.mockResolvedValue({
    ok: true,
    user: { id: 1, role: 'admin', email: 'admin@hope.com' },
  });
  rightsFor.mockResolvedValue(new Set(['Add Product', 'Edit Product', 'Delete Product']));
  listProducts.mockResolvedValue(rows);
  filterProducts.mockReturnValue(rows);
});

describe('GET /api/products', () => {
  it('returns guard response when unauthorized', async () => {
    const denied = NextResponse.json({ code: 'FORBIDDEN' }, { status: 403 });
    authorizeApi.mockResolvedValueOnce({ ok: false, response: denied });

    const res = await callGet();
    expect(res.status).toBe(403);
    expect(authorizeApi).toHaveBeenCalledWith('products');
    expect(listProducts).not.toHaveBeenCalled();
  });

  it('returns filtered products as JSON for Admin', async () => {
    const res = await callGet('?q=widget');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ products: rows });
    expect(filterProducts).toHaveBeenCalledWith(rows, { q: 'widget', status: 'All' });
  });

  it.each(['Active', 'Inactive'])('admin can filter by status=%s', async (s) => {
    await callGet(`?status=${s}`);
    expect(filterProducts).toHaveBeenCalledWith(rows, { q: '', status: s });
  });

  it('admin: invalid status falls back to All', async () => {
    await callGet('?status=Unknown');
    expect(filterProducts).toHaveBeenCalledWith(rows, { q: '', status: 'All' });
  });

  it('user role ignores ?status=Inactive and defaults to All', async () => {
    authorizeApi.mockResolvedValueOnce({
      ok: true,
      user: { id: 2, role: 'user', email: 'u@test.com' },
    });
    await callGet('?status=Inactive');
    expect(filterProducts).toHaveBeenCalledWith(rows, { q: '', status: 'All' });
  });
});

describe('POST /api/products', () => {
  it('creates product with valid input and Add Product right', async () => {
    const created = { prodcode: 'P-003', description: 'Gadget', unit: 'pcs', price: null };
    createProduct.mockResolvedValueOnce(created);

    const res = await callPost({ description: 'Gadget', unit: 'pcs' });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ product: created });
  });

  it('rejects without Add Product right (403)', async () => {
    rightsFor.mockResolvedValueOnce(new Set([]));
    const res = await callPost({ description: 'Gadget', unit: 'pcs' });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('FORBIDDEN');
    expect(createProduct).not.toHaveBeenCalled();
  });

  it('rejects non-JSON content type (415)', async () => {
    const res = await callPost('raw text', { 'content-type': 'text/plain' });
    expect(res.status).toBe(415);
    expect((await res.json()).code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects empty description or invalid unit (400 VALIDATION)', async () => {
    const res = await callPost({ description: '', unit: 'invalid_unit' });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('VALIDATION');
    expect(body.errors.description).toBeDefined();
    expect(body.errors.unit).toBeDefined();
    expect(createProduct).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/products/[prodcode]', () => {
  it('updates product with valid input and Edit Product right', async () => {
    const updated = { prodcode: 'P-001', description: 'Updated Gadget', unit: 'can', price: 10 };
    updateProduct.mockResolvedValueOnce(updated);

    const res = await callPatch('P-001', { description: 'Updated Gadget', unit: 'can' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ product: updated });
  });

  it('rejects without Edit Product right (403)', async () => {
    rightsFor.mockResolvedValueOnce(new Set([]));
    const res = await callPatch('P-001', { description: 'Updated', unit: 'can' });
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe('FORBIDDEN');
    expect(updateProduct).not.toHaveBeenCalled();
  });

  it('returns 404 when product is not found', async () => {
    updateProduct.mockRejectedValueOnce(new ProductError('NOT_FOUND', 'Product not found'));
    const res = await callPatch('P-999', { description: 'Updated', unit: 'can' });
    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe('NOT_FOUND');
  });

  it('returns 409 when product is deleted', async () => {
    updateProduct.mockRejectedValueOnce(new ProductError('DELETED', 'Product is deleted'));
    const res = await callPatch('P-001', { description: 'Updated', unit: 'can' });
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe('DELETED');
  });
});
