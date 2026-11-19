'use client';

import { useMemo, useState } from 'react';
import { countByStatus, filterProducts, formatPrice } from '@/lib/products/filter';
import styles from './products.module.css';

const TABS = ['Active', 'Inactive', 'All'];

export default function ProductsClient({ initial, isAdmin, perm }) {
  const [tab, setTab] = useState('All'); // Figure 11 opens on All; only Admins can change it
  const [q, setQ] = useState('');

  const counts = useMemo(() => countByStatus(initial), [initial]);

  // A User's rows are already Active-only from the server, so the status filter is skipped for them.
  const rows = useMemo(
    () => filterProducts(initial, { q, status: isAdmin ? tab : 'All' }),
    [initial, q, tab, isAdmin]
  );

  // Every row has a Prices button, so the Actions column is always there.
  const cols = 5 + (isAdmin ? 2 : 0);

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
            <button type="button" className={`${styles.btn} ${styles.pri}`} disabled title="Coming in a later ticket">
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
                          <button type="button" className={`${styles.btn} ${styles.sm}`} disabled title="Coming in a later ticket">
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
        Showing {rows.length} of {initial.length}
      </p>
    </>
  );
}