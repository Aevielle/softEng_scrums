'use client';

import { useEffect, useMemo, useState } from 'react';
import { countByStatus, filterProducts, formatPrice } from '@/lib/products/filter';
import ProductFormDialog from './ProductFormDialog';
import styles from './products.module.css';

const TABS = ['Active', 'Inactive', 'All'];

const byCode = (a, b) => a.prodcode.localeCompare(b.prodcode, 'en', { numeric: true });

export default function ProductsClient({ initial, isAdmin, perm }) {
  const [tab, setTab] = useState('All'); // Figure 11 opens on All; only Admins can change it
  const [q, setQ] = useState('');

  // The list lives in state so a saved product appears at once, without reloading the page.
  const [items, setItems] = useState(initial);
  useEffect(() => setItems(initial), [initial]);

  const [dialog, setDialog] = useState(null); // null | { mode: 'add' } | { mode: 'edit', product }
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const counts = useMemo(() => countByStatus(items), [items]);

  // A User's rows are already Active-only from the server, so the status filter is skipped for them.
  const rows = useMemo(
    () => filterProducts(items, { q, status: isAdmin ? tab : 'All' }),
    [items, q, tab, isAdmin]
  );

  // Every row has a Prices button, so the Actions column is always there.
  const cols = 5 + (isAdmin ? 2 : 0);

  // The server answers with the saved row (new Stamp, current price), so we just put it in the list.
  function handleSaved(product, mode) {
    setItems((prev) => {
      const exists = prev.some((r) => r.prodcode === product.prodcode);
      const next = exists ? prev.map((r) => (r.prodcode === product.prodcode ? product : r)) : [...prev, product];
      return next.sort(byCode);
    });
    setDialog(null);
    setNotice(`Product ${product.prodcode} ${mode === 'edit' ? 'updated' : 'added'}.`);
  }

  return (
    <>
      <div className={styles.bar}>
        <h2 className={styles.heading}>Product Management</h2>

        <div className={styles.tools}>
          {isAdmin && (
            <div className={styles.tabs} role="tablist" aria-label="Filter by status">
              {TABS.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={tab === t}
                  className={tab === t ? styles.on : ''}
                  onClick={() => setTab(t)}
                >
                  {t} ({counts[t]})
                </button>
              ))}
            </div>
          )}

          <input
            type="search"
            className={styles.search}
            placeholder="Search products..."
            aria-label="Search products"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          {perm.add && (
            <button
              type="button"
              className={`${styles.btn} ${styles.pri}`}
              onClick={() => setDialog({ mode: 'add' })}
            >
              + Add Product
            </button>
          )}
        </div>
      </div>

      <div className={styles.tw}>
        <table>
          <thead>
            <tr>
              <th>Prod Code</th>
              <th>Description</th>
              <th>Unit</th>
              <th>Current Price</th>
              {isAdmin && <th>Status</th>}
              {isAdmin && <th>Stamp</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const deleted = isAdmin && r.status === 'Inactive';
              return (
                <tr key={r.prodcode} className={deleted ? styles.deleted : ''}>
                  <td><b>{r.prodcode}</b></td>
                  <td>{r.description || '—'}</td>
                  <td>{r.unit || '—'}</td>
                  <td>{formatPrice(r.price)}</td>
                  {isAdmin && (
                    <td>
                      <span className={`${styles.pill} ${deleted ? styles.x : ''}`}>{r.status}</span>
                    </td>
                  )}
                  {isAdmin && <td className={styles.stamp}>{r.stamp || '—'}</td>}
                  <td className={styles.ac}>
                    {deleted ? (
                      perm.del && (
                        <button type="button" className={`${styles.btn} ${styles.sm}`} disabled title="Coming in a later ticket">
                          Restore
                        </button>
                      )
                    ) : (
                      <>
                        {/* S2-DEV-07: build the price dialog, then remove `disabled` and open it from here. */}
                        <button type="button" className={`${styles.btn} ${styles.sm}`} disabled title="The price dialog is built in S2-DEV-07">
                          Prices
                        </button>
                        {perm.edit && (
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.sm}`}
                            onClick={() => setDialog({ mode: 'edit', product: r })}
                          >
                            Edit
                          </button>
                        )}
                        {perm.del && (
                          <button type="button" className={`${styles.btn} ${styles.sm}`} disabled title="Coming in a later ticket">
                            Delete
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols} className={styles.empty}>
                  {q.trim() ? 'No products match your search.' : 'No products yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className={styles.count} role="status" aria-live="polite">
        Showing {rows.length} of {items.length}
      </p>

      {notice && (
        <div className={styles.toast} role="status">
          {notice}
        </div>
      )}

      {dialog && (
        <ProductFormDialog
          // a fresh form every time it opens, so Add never shows the last Edit's text
          key={dialog.mode === 'edit' ? dialog.product.prodcode : 'add'}
          mode={dialog.mode}
          product={dialog.product}
          onClose={() => setDialog(null)}
          onSaved={handleSaved}
        />
      )}
    </>
  );
}
