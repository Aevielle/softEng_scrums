// web/src/test/unit/api/products/products.filter.test.jsx
const { filterProducts, countByStatus, formatPrice } = require('@/lib/products/filter');

const rows = [
  { prodcode: 'P-001', description: 'Steel bracket', unit: 'pcs', price: 13.75, status: 'Active' },
  { prodcode: 'P-002', description: 'Aluminum wire', unit: 'meter', price: null, status: 'Inactive' },
  { prodcode: 'P-003', description: 'Copper pipe', unit: 'can', price: 25.5, status: 'Active' },
];
const codes = (r) => r.map((x) => x.prodcode);

describe('filterProducts', () => {
  it('ignores case and trims search query', () => {
    expect(codes(filterProducts(rows, { q: '  STEEL ' }))).toEqual(['P-001']);
    expect(codes(filterProducts(rows, { q: 'steel' }))).toEqual(['P-001']);
  });

  it.each([
    ['P-003', ['P-003']],
    ['Copper', ['P-003']],
    ['meter', ['P-002']],
  ])('matches field value %s', (q, expected) => {
    expect(codes(filterProducts(rows, { q }))).toEqual(expected);
  });

  it('blank or whitespace search returns all rows', () => {
    expect(filterProducts(rows, { q: '   ' })).toHaveLength(3);
    expect(filterProducts(rows, {})).toHaveLength(3);
  });

  it('no match returns an empty list', () => {
    expect(filterProducts(rows, { q: 'nonexistent-item' })).toEqual([]);
  });

  it('null description or unit does not throw', () => {
    const nullableRows = [
      { prodcode: 'P-004', description: null, unit: null, price: 10, status: 'Active' },
    ];
    expect(() => filterProducts(nullableRows, { q: 'bracket' })).not.toThrow();
  });

  it('search and status work together for Admin', () => {
    expect(codes(filterProducts(rows, { q: 'wire', status: 'Inactive' }))).toEqual(['P-002']);
    expect(codes(filterProducts(rows, { q: 'wire', status: 'Active' }))).toEqual([]);
  });

  it('does not empty User rows when a status tab is passed', () => {
    const userRows = rows.map(({ status, stamp, ...r }) => r);
    expect(filterProducts(userRows, { status: 'Active' })).toHaveLength(3);
    expect(filterProducts(userRows, { status: 'All' })).toHaveLength(3);
  });
});

describe('countByStatus', () => {
  it('counts active, inactive, and all rows', () => {
    expect(countByStatus(rows)).toEqual({ Active: 2, Inactive: 1, All: 3 });
  });

  it('handles empty rows array', () => {
    expect(countByStatus([])).toEqual({ Active: 0, Inactive: 0, All: 0 });
  });
});

describe('formatPrice', () => {
  it('formats positive numbers as USD currency', () => {
    expect(formatPrice(13.75)).toBe('$13.75');
    expect(formatPrice(25)).toBe('$25.00');
  });

  it('returns a dash when price is null or undefined', () => {
    expect(formatPrice(null)).toBe('—');
    expect(formatPrice(undefined)).toBe('—');
  });
});
