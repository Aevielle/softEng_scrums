// web/src/test/unit/customers-filter.test.js
const { filterCustomers, countByStatus } = require('@/lib/customers/filter');

const rows = [
  { custno: 'C001', custname: 'Acme', address: 'Manila', payterm: 'COD', status: 'Active' },
  { custno: 'C002', custname: 'Acme Two', address: null, payterm: null, status: 'Inactive' },
  { custno: 'C003', custname: 'Zeta', address: 'Cebu', payterm: '30D', status: 'Active' },
];
const ids = (r) => r.map((x) => x.custno);

it('ignores case and trims (CUS-30, CUS-32)', () => {
  expect(ids(filterCustomers(rows, { q: '  ACME ' }))).toEqual(['C001', 'C002']);
  expect(ids(filterCustomers(rows, { q: 'acme' }))).toEqual(['C001', 'C002']);
});

it.each([['C003'], ['Zeta'], ['Cebu'], ['30D']])('matches field value %s (CUS-31)', (q) => {
  expect(ids(filterCustomers(rows, { q }))).toEqual(['C003']);
});

it('blank search returns all rows (CUS-32)', () => {
  expect(filterCustomers(rows, { q: '   ' })).toHaveLength(3);
});

it('no match returns an empty list (CUS-33)', () => {
  expect(filterCustomers(rows, { q: 'zzzz' })).toEqual([]);
});

it('null address/payterm do not throw (CUS-34)', () => {
  expect(() => filterCustomers(rows, { q: 'acme two' })).not.toThrow();
});

it('search and status work together (CUS-35)', () => {
  expect(ids(filterCustomers(rows, { q: 'acme', status: 'Inactive' }))).toEqual(['C002']);
});

it('countByStatus counts admin rows', () => {
  expect(countByStatus(rows)).toEqual({ Active: 2, Inactive: 1, All: 3 });
});

// CUS-36: FAILS with the current filter.ts (User rows have no status, so a tab empties the list).
// Passes after changing the check to: if (status !== 'All' && r.status !== undefined && r.status !== status) return false;
it('does not empty User rows when a status tab is passed (CUS-36)', () => {
  const userRows = rows.map(({ status, stamp, ...r }) => r);
  expect(filterCustomers(userRows, { status: 'Active' })).toHaveLength(3);
});
