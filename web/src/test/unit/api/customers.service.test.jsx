// web/src/test/unit/customers-service.test.js
// Do NOT mock '@/lib/users/service' here: the real ServiceError is needed.
jest.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: { from: jest.fn() } }));
jest.mock('@/lib/auth/rights');

const { supabaseAdmin } = require('@/lib/supabase/admin');
const { hasRight } = require('@/lib/auth/rights');
const { listCustomers, countCustomers, createCustomer, updateCustomer } = require('@/lib/customers/service');

const VALID_PAYTERM = 'COD'; // TODO: a value allowed by your validation / pay_ck
const input = { custname: 'Acme', address: '1 Test St', payterm: VALID_PAYTERM };
const admin = { role: 'admin', email: 'a@test.com' };
const user = { role: 'user', email: 'u@test.com' };
const dbRow = { custno: 'C001', custname: 'Acme', address: '1 Test St', payterm: VALID_PAYTERM, stamp: 'CREATED a@test.com now', is_deleted: false };

// A chainable, awaitable stand-in for a Supabase query.
function chain(result) {
  const c = {};
  ['select', 'eq', 'order', 'limit', 'insert', 'update', 'single', 'maybeSingle'].forEach((m) => (c[m] = jest.fn(() => c)));
  c.then = (resolve) => resolve(result);
  return c;
}

beforeEach(() => {
  jest.resetAllMocks();
  hasRight.mockResolvedValue(true);
});

describe('listCustomers', () => {
  it('admin gets Status and Stamp, never is_deleted (CUS-03)', async () => {
    supabaseAdmin.from.mockReturnValue(chain({ data: [dbRow, { ...dbRow, custno: 'C002', is_deleted: true }], error: null }));
    const res = await listCustomers(admin);
    expect(res.map((r) => r.status)).toEqual(['Active', 'Inactive']);
    expect(res[0].stamp).toBeTruthy();
    expect(res[0]).not.toHaveProperty('is_deleted');
  });

  it('user list hides Status/Stamp and filters deleted rows (CUS-26, CUS-27)', async () => {
    const q = chain({ data: [{ custno: 'C001', custname: 'A', address: 'x', payterm: VALID_PAYTERM }], error: null });
    supabaseAdmin.from.mockReturnValue(q);
    const res = await listCustomers(user);
    expect(q.eq).toHaveBeenCalledWith('is_deleted', false);
    expect(q.select).toHaveBeenCalledWith('custno, custname, address, payterm');
    expect(res[0]).not.toHaveProperty('stamp');
    expect(res[0]).not.toHaveProperty('status');
  });
});

describe('countCustomers (CUS-29)', () => {
  it('user: total equals active, inactive is 0', async () => {
    supabaseAdmin.from.mockReturnValueOnce(chain({ count: 3, error: null }));
    expect(await countCustomers(user)).toEqual({ total: 3, active: 3, inactive: 0 });
  });
  it('admin: counts deleted rows as inactive', async () => {
    supabaseAdmin.from
      .mockReturnValueOnce(chain({ count: 3, error: null }))
      .mockReturnValueOnce(chain({ count: 5, error: null }));
    expect(await countCustomers(admin)).toEqual({ total: 5, active: 3, inactive: 2 });
  });
  it('returns null when the lookup fails', async () => {
    supabaseAdmin.from.mockReturnValueOnce(chain({ count: null, error: { message: 'x' } }));
    expect(await countCustomers(admin)).toBeNull();
  });
});

describe('createCustomer', () => {
  it.each([
    ['empty fields (CUS-14)', { custname: '', address: '', payterm: '' }],
    ['wrong payment terms (CUS-15)', { ...input, payterm: 'Banana' }],
  ])('rejects %s', async (_, bad) => {
    await expect(createCustomer(admin, bad)).rejects.toMatchObject({ status: 400, code: 'INVALID' });
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it('refuses without the Add Customer right, before validating (CUS-16)', async () => {
    hasRight.mockResolvedValue(false);
    await expect(createCustomer(user, {})).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it('writes the server number, stamp and is_deleted=false, ignoring browser values (CUS-13, CUS-17)', async () => {
    const insertChain = chain({ data: dbRow, error: null });
    supabaseAdmin.from
      .mockReturnValueOnce(chain({ data: [{ custno: 'C001' }], error: null }))
      .mockReturnValueOnce(insertChain);

    await createCustomer(admin, { ...input, custno: 'ZZZ99', status: 'Inactive', stamp: 'HACKED', is_deleted: true });

    const written = insertChain.insert.mock.calls[0][0];
    expect(written.custno).not.toBe('ZZZ99');
    expect(written.stamp).toMatch(/CREATED/);
    expect(written.stamp).not.toBe('HACKED');
    expect(written.is_deleted).toBe(false);
    expect(written).not.toHaveProperty('status');
  });

  it('a User with the right gets a row without Status or Stamp (CUS-28)', async () => {
    supabaseAdmin.from
      .mockReturnValueOnce(chain({ data: [{ custno: 'C001' }], error: null }))
      .mockReturnValueOnce(chain({ data: dbRow, error: null }));
    const { customer } = await createCustomer(user, input);
    expect(customer).not.toHaveProperty('status');
    expect(customer).not.toHaveProperty('stamp');
  });
});

describe('updateCustomer', () => {
  it('refuses without the Edit Customer right (CUS-22)', async () => {
    hasRight.mockResolvedValue(false);
    await expect(updateCustomer(user, 'C001', input)).rejects.toMatchObject({ status: 403 });
  });

  it('rejects empty fields (CUS-20) and wrong payment terms (CUS-21)', async () => {
    await expect(updateCustomer(admin, 'C001', { ...input, custname: '' })).rejects.toMatchObject({ status: 400 });
    await expect(updateCustomer(admin, 'C001', { ...input, payterm: 'Banana' })).rejects.toMatchObject({ status: 400 });
    expect(supabaseAdmin.from).not.toHaveBeenCalled();
  });

  it('writes an EDITED stamp (CUS-19)', async () => {
    const q = chain({ data: [{ ...dbRow, stamp: 'EDITED a@test.com now' }], error: null });
    supabaseAdmin.from.mockReturnValueOnce(q);
    const { customer } = await updateCustomer(admin, 'C001', input);
    expect(q.update.mock.calls[0][0].stamp).toMatch(/EDITED/);
    expect(customer.stamp).toMatch(/EDITED/);
  });

  it('returns 404 when the customer does not exist (CUS-23)', async () => {
    supabaseAdmin.from
      .mockReturnValueOnce(chain({ data: [], error: null }))
      .mockReturnValueOnce(chain({ data: null, error: null }));
    await expect(updateCustomer(admin, 'NOPE', input)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('returns 409 when the customer is deleted (CUS-24)', async () => {
    supabaseAdmin.from
      .mockReturnValueOnce(chain({ data: [], error: null }))
      .mockReturnValueOnce(chain({ data: { custno: 'C001' }, error: null }));
    await expect(updateCustomer(admin, 'C001', input)).rejects.toMatchObject({ status: 409, code: 'DELETED' });
  });
});
