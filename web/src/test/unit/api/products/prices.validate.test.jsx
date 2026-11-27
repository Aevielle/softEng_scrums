// web/src/test/unit/api/products/prices.validate.test.jsx
const {
  isValidDate,
  validatePriceInput,
  countPrices,
  filterPrices,
  pickCurrentPrice,
  byEffdateDesc,
} = require('@/lib/products/prices');

describe('isValidDate', () => {
  it('accepts valid calendar dates in YYYY-MM-DD format', () => {
    expect(isValidDate('2026-01-15')).toBe(true);
    expect(isValidDate('2026-02-28')).toBe(true);
    expect(isValidDate('2024-02-29')).toBe(true); // leap year
  });

  it('rejects invalid date formats', () => {
    expect(isValidDate('2026/01/15')).toBe(false);
    expect(isValidDate('01-15-2026')).toBe(false);
    expect(isValidDate('banana')).toBe(false);
    expect(isValidDate('')).toBe(false);
  });

  it('rejects impossible calendar dates', () => {
    expect(isValidDate('2026-02-29')).toBe(false); // not a leap year
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2026-04-31')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
  });

  it('rejects years outside 2000-2100', () => {
    expect(isValidDate('1999-12-31')).toBe(false);
    expect(isValidDate('2101-01-01')).toBe(false);
  });
});

describe('validatePriceInput', () => {
  it('accepts clean price input', () => {
    const res = validatePriceInput({ effdate: '2026-03-01', unitprice: 28.5 });
    expect(res).toEqual({ ok: true, values: { effdate: '2026-03-01', unitprice: 28.5 } });
  });

  it('cleans string inputs containing $, spaces, or commas', () => {
    const res = validatePriceInput({ effdate: ' 2026-03-01 ', unitprice: ' $ 1,250.75 ' });
    expect(res).toEqual({ ok: true, values: { effdate: '2026-03-01', unitprice: 1250.75 } });
  });

  it('rejects missing or empty fields', () => {
    const res = validatePriceInput({});
    expect(res.ok).toBe(false);
    expect(res.errors.effdate).toBe('Effective date is required.');
    expect(res.errors.unitprice).toBe('Unit price is required.');
  });

  it('rejects zero or negative prices', () => {
    const zero = validatePriceInput({ effdate: '2026-03-01', unitprice: 0 });
    expect(zero.ok).toBe(false);
    expect(zero.errors.unitprice).toBe('Unit price must be above zero.');

    const neg = validatePriceInput({ effdate: '2026-03-01', unitprice: -15 });
    expect(neg.ok).toBe(false);
    expect(neg.errors.unitprice).toContain('no negatives');
  });

  it('rejects prices with more than 2 decimal places', () => {
    const res = validatePriceInput({ effdate: '2026-03-01', unitprice: '10.999' });
    expect(res.ok).toBe(false);
    expect(res.errors.unitprice).toContain('up to 2 decimals');
  });

  it('rejects excessively large prices above PRICE_MAX', () => {
    const res = validatePriceInput({ effdate: '2026-03-01', unitprice: 100_000_000 });
    expect(res.ok).toBe(false);
    expect(res.errors.unitprice).toBe('Unit price is too large.');
  });
});

describe('pickCurrentPrice', () => {
  const asOf = '2026-05-15';
  const history = [
    { effdate: '2026-01-01', unitprice: 10.0, stamp: 'CREATED admin' },
    { effdate: '2026-03-01', unitprice: 15.5, stamp: 'EDITED admin' },
    { effdate: '2026-05-01', unitprice: 20.0, stamp: 'CREATED admin' },
    { effdate: '2026-06-01', unitprice: 25.0, stamp: 'CREATED admin' }, // future
  ];

  it('picks the latest active price on or before asOf', () => {
    expect(pickCurrentPrice(history, asOf)).toBe(20.0);
  });

  it('ignores future prices where effective date > asOf', () => {
    // As of 2026-05-20, price from 2026-06-01 is ignored
    expect(pickCurrentPrice(history, '2026-05-20')).toBe(20.0);
  });

  it('ignores soft-deleted prices starting with DELETED', () => {
    const withDeleted = [
      { effdate: '2026-01-01', unitprice: 10.0, stamp: 'CREATED admin' },
      { effdate: '2026-05-01', unitprice: 20.0, stamp: 'DELETED admin 2026-05-10' },
    ];
    // Deleted 20.0 price is ignored, so it falls back to 10.0
    expect(pickCurrentPrice(withDeleted, asOf)).toBe(10.0);
  });

  it('returns null when all prices are in the future or deleted', () => {
    const allFuture = [{ effdate: '2026-06-01', unitprice: 25.0, stamp: 'CREATED' }];
    expect(pickCurrentPrice(allFuture, asOf)).toBeNull();

    const allDeleted = [{ effdate: '2026-01-01', unitprice: 10.0, stamp: 'DELETED' }];
    expect(pickCurrentPrice(allDeleted, asOf)).toBeNull();

    expect(pickCurrentPrice([], asOf)).toBeNull();
  });
});

describe('countPrices and filterPrices', () => {
  const prices = [
    { effdate: '2026-05-01', unitprice: 20, status: 'Active' },
    { effdate: '2026-03-01', unitprice: 15, status: 'Active' },
    { effdate: '2026-01-01', unitprice: 10, status: 'Inactive' },
  ];

  it('counts active and inactive prices', () => {
    expect(countPrices(prices)).toEqual({ Active: 2, Inactive: 1, All: 3 });
  });

  it('filters prices by status tab', () => {
    expect(filterPrices(prices, 'Active')).toHaveLength(2);
    expect(filterPrices(prices, 'Inactive')).toHaveLength(1);
    expect(filterPrices(prices, 'All')).toHaveLength(3);
  });

  it('sorts newest effective date first using byEffdateDesc', () => {
    const sorted = [...prices].sort(byEffdateDesc);
    expect(sorted.map((r) => r.effdate)).toEqual(['2026-05-01', '2026-03-01', '2026-01-01']);
  });
});
