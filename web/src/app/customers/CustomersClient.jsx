'use client';

import { useMemo, useState } from 'react';
import { countByStatus, filterCustomers } from '@/lib/customers/filter';
import styles from './customers.module.css';

const TABS = ['Active', 'Inactive', 'All'];

export default function CustomersClient({ initial, isAdmin, perm }) {
  const [tab, setTab] = useState('All'); // Figure 9 opens on All; only Admins can change it
  const [q, setQ] = useState('');

  const counts = useMemo(() => countByStatus(initial), [initial]);

  // A User's rows are already Active-only from the server, so the status filter is skipped for them.
  const rows = useMemo(
    () => filterCustomers(initial, { q, status: isAdmin ? tab : 'All' }),
    [initial, q, tab, isAdmin]
  );

  const showActions = perm.edit || perm.del;
  const cols = 4 + (isAdmin ? 2 : 0) + (showActions ? 1 : 0);

  return (
    <>
      <div className={styles.bar}>
        <h2 className={styles.heading}>Customer Management</h2>

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
            placeholder="Search customers..."
            aria-label="Search customers"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          {perm.add && (
            <button type="button" className={`${styles.btn} ${styles.pri}`} disabled title="Coming in a later ticket">
              + Add Customer
            </button>
          )}
        </div>
      </div>

      <div className={styles.tw}>
        <table>
          <thead>
            <tr>
              <th>Cust No</th>
              <th>Customer Name</th>
              <th>Address</th>
              <th>Pay Terms</th>
              {isAdmin && <th>Status</th>}
              {isAdmin && <th>Stamp</th>}
              {showActions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const deleted = isAdmin && r.status === 'Inactive';
              return (
                <tr key={r.custno} className={deleted ? styles.deleted : ''}>
                  <td><b>{r.custno}</b></td>
                  <td>{r.custname}</td>
                  <td>{r.address || '—'}</td>
                  <td>{r.payterm || '—'}</td>
                  {isAdmin && (
                    <td>
                      <span className={`${styles.pill} ${deleted ? styles.x : ''}`}>{r.status}</span>
                    </td>
                  )}
                  {isAdmin && <td className={styles.stamp}>{r.stamp || '—'}</td>}
                  {showActions && (
                    <td className={styles.ac}>
                      {deleted ? (
                        perm.del && (
                          <button type="button" className={`${styles.btn} ${styles.sm}`} disabled title="Coming in a later ticket">
                            Restore
                          </button>
                        )
                      ) : (
                        <>
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
                  )}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols} className={styles.empty}>
                  {q.trim() ? 'No customers match your search.' : 'No customers yet.'}
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
