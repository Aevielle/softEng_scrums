import { authorizeCustomerWrite } from '@/lib/customers/http';
import { authorizeProductWrite, authorizeProductRestore } from '@/lib/products/http';
import { CUSTOMER_RIGHTS } from '@/lib/customers/rights';
import { PRODUCT_RIGHTS, PRICE_RIGHTS } from '@/lib/products/rights';
import { authorizeApi } from '@/lib/auth/guard';
import { rightsFor } from '@/lib/auth/rights';

jest.mock('@/lib/auth/guard', () => ({
  authorizeApi: jest.fn(),
}));

jest.mock('@/lib/auth/rights', () => ({
  rightsFor: jest.fn(),
}));

function makeRequest({
  method = 'POST',
  contentType = 'application/json',
  body = {},
} = {}) {
  return new Request('http://localhost:3000/api/test', {
    method,
    headers: { 'content-type': contentType },
    body: method !== 'GET' && method !== 'DELETE' ? JSON.stringify(body) : undefined,
  });
}

function makeUser({ role = 'user', id = 1, allowed = ['customers', 'products'] } = {}) {
  return {
    id,
    role,
    email: `${role}@hope.erp.com`,
    mustChange: false,
    allowed: new Set(allowed),
  };
}

describe('Sprint 2 Per-Right Server Authorization (Customer & Product)', () => {
  beforeEach(() => jest.clearAllMocks());

  // Unified matrix of all Sprint 2 rights
  const rightsMatrix = [
    // Customer rights
    { module: 'Customer', name: 'Add Customer', constant: CUSTOMER_RIGHTS.add, requiresBody: true, gateFn: authorizeCustomerWrite },
    { module: 'Customer', name: 'Edit Customer', constant: CUSTOMER_RIGHTS.edit, requiresBody: true, gateFn: authorizeCustomerWrite },
    { module: 'Customer', name: 'Delete Customer', constant: CUSTOMER_RIGHTS.del, requiresBody: false, gateFn: authorizeCustomerWrite },
    // Product rights
    { module: 'Product', name: 'Add Product', constant: PRODUCT_RIGHTS.add, requiresBody: true, gateFn: authorizeProductWrite },
    { module: 'Product', name: 'Edit Product', constant: PRODUCT_RIGHTS.edit, requiresBody: true, gateFn: authorizeProductWrite },
    { module: 'Product', name: 'Delete Product', constant: PRODUCT_RIGHTS.del, requiresBody: false, gateFn: authorizeProductWrite },
    // Price rights
    { module: 'Price', name: 'Add Price', constant: PRICE_RIGHTS.add, requiresBody: true, gateFn: authorizeProductWrite },
    { module: 'Price', name: 'Edit Price', constant: PRICE_RIGHTS.edit, requiresBody: true, gateFn: authorizeProductWrite },
    { module: 'Price', name: 'Delete Price', constant: PRICE_RIGHTS.del, requiresBody: false, gateFn: authorizeProductWrite },
  ];

  describe.each(rightsMatrix)('$module: "$name"', ({ constant, requiresBody, gateFn }) => {
    test.each(['superadmin', 'admin'])('%s is allowed unconditionally', async (role) => {
      const actor = makeUser({ role });
      authorizeApi.mockResolvedValue({ ok: true, user: actor });
      rightsFor.mockResolvedValue({ has: () => true });

      const req = makeRequest({ method: requiresBody ? 'POST' : 'DELETE', body: { test: true } });
      const gate = await gateFn(req, constant, { body: requiresBody });

      expect(gate.ok).toBe(true);
      if (gate.ok) expect(gate.user.role).toBe(role);
    });

    test('User is allowed when right is granted', async () => {
      const user = makeUser({ role: 'user' });
      authorizeApi.mockResolvedValue({ ok: true, user });
      rightsFor.mockResolvedValue({ has: (r) => r === constant });

      const req = makeRequest({ method: requiresBody ? 'POST' : 'DELETE', body: { test: true } });
      const gate = await gateFn(req, constant, { body: requiresBody });

      expect(gate.ok).toBe(true);
      if (gate.ok) expect(gate.user.id).toBe(1);
    });

    test('User is refused with 403 FORBIDDEN when right is missing', async () => {
      const user = makeUser({ role: 'user' });
      authorizeApi.mockResolvedValue({ ok: true, user });
      rightsFor.mockResolvedValue({ has: (r) => r !== constant });

      const req = makeRequest({ method: requiresBody ? 'POST' : 'DELETE', body: { test: true } });
      const gate = await gateFn(req, constant, { body: requiresBody });

      expect(gate.ok).toBe(false);
      if (!gate.ok) {
        expect(gate.response.status).toBe(403);
        const data = await gate.response.json();
        expect(data.code).toBe('FORBIDDEN');
        expect(data.message).toContain(constant);
      }
    });
  });

  describe('Common Gate Guards (Auth & Content-Type)', () => {
    it('refuses unauthenticated callers with 401', async () => {
      const unauth = new Response(JSON.stringify({ code: 'UNAUTHENTICATED' }), { status: 401 });
      authorizeApi.mockResolvedValue({ ok: false, response: unauth });

      const req = makeRequest({ method: 'POST', body: {} });
      const gate = await authorizeCustomerWrite(req, CUSTOMER_RIGHTS.add);
      expect(gate.ok).toBe(false);
      if (!gate.ok) expect(gate.response.status).toBe(401);
    });

    it('refuses non-JSON content types for write requests with 415', async () => {
      const admin = makeUser({ role: 'admin' });
      authorizeApi.mockResolvedValue({ ok: true, user: admin });
      rightsFor.mockResolvedValue({ has: () => true });

      const req = makeRequest({ contentType: 'text/plain', body: {} });
      const gateCust = await authorizeCustomerWrite(req, CUSTOMER_RIGHTS.add);
      const gateProd = await authorizeProductWrite(req, PRODUCT_RIGHTS.add);

      expect(gateCust.ok).toBe(false);
      expect(gateProd.ok).toBe(false);
      if (!gateCust.ok) expect(gateCust.response.status).toBe(415);
      if (!gateProd.ok) expect(gateProd.response.status).toBe(415);
    });
  });

  describe('Product restore authorization (authorizeProductRestore)', () => {
    test.each(['admin', 'superadmin'])('allows %s to restore', async (role) => {
      const actor = makeUser({ role });
      authorizeApi.mockResolvedValue({ ok: true, user: actor });
      const req = makeRequest({ method: 'POST', body: {} });
      const gate = await authorizeProductRestore(req);
      expect(gate.ok).toBe(true);
    });

    it('refuses regular User with 403 FORBIDDEN', async () => {
      const user = makeUser({ role: 'user' });
      authorizeApi.mockResolvedValue({ ok: true, user });
      const req = makeRequest({ method: 'POST', body: {} });
      const gate = await authorizeProductRestore(req);

      expect(gate.ok).toBe(false);
      if (!gate.ok) {
        expect(gate.response.status).toBe(403);
        const data = await gate.response.json();
        expect(data.code).toBe('FORBIDDEN');
      }
    });

    it('rejects non-JSON restore request with 415', async () => {
      const admin = makeUser({ role: 'admin' });
      authorizeApi.mockResolvedValue({ ok: true, user: admin });
      const req = makeRequest({ contentType: 'text/plain', body: {} });
      const gate = await authorizeProductRestore(req);

      expect(gate.ok).toBe(false);
      if (!gate.ok) expect(gate.response.status).toBe(415);
    });
  });
});
