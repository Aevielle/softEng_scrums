'use client';

import { useMemo, useState } from 'react';
import { countByStatus, filterEmployees } from '@/lib/employees/filter';
import styles from './hr.module.css';

const TABS = ['Active', 'Inactive', 'All'];

/**
 * S3-DEV-03: Employees list (Figures 15 and 20).
 *  - Admin / Superadmin: status tabs, Status and Stamp columns, deleted rows shaded.
 *  - User: the server only sends Active rows with no status / stamp, so those parts are simply not drawn.
 *  - Search filters as you type, in the browser, on the rows already loaded.
 * `onHistory(row)` is the hook for S3-DEV-06 (job history); until it is passed, the button does nothing.
 */
export default function EmployeesTab({ initial, isAdmin, onHistory }) {
  const [tab, setTab] = useState('All'); // Figure 15 opens on All; only Admins see the tabs
  const [q, setQ] = useState('');

  const counts = useMemo(() => countByStatus(initial), [initial]);
  // A User's rows are already Active-only from the server, so the status filter is skipped for them.
  const rows = useMemo(
    () => filterEmployees(initial, { q, status: isAdmin ? tab : 'All' }),
    [initial, q, tab, isAdmin]
  );

  const cols = 8 + (isAdmin ? 2 : 0);

  return (
    <>
      <div className={styles.bar}>
        <h2 className={styles.heading}>Employees</h2>

        <div className={styles.filters}>
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
            placeholder="Search employees..."
            aria-label="Search employees"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.tw}>
        <table>
          <thead>
            <tr>
              <th>Emp No</th>
              <th>Last Name</th>
              <th>First Name</th>
              <th>Gender</th>
              <th>Birth Date</th>
              <th>Hire Date</th>
              <th>Sep Date</th>
              {isAdmin && <th>Status</th>}
              {isAdmin && <th>Stamp</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const deleted = isAdmin && r.status === 'Inactive';
              return (
                <tr key={r.empno} className={deleted ? styles.deleted : ''}>
                  <td><b>{r.empno}</b></td>
                  <td>{r.lastname}</td>
                  <td>{r.firstname}</td>
                  <td>{r.gender || '—'}</td>
                  <td className={styles.date}>{r.birthdate || '—'}</td>
                  <td className={styles.date}>{r.hiredate || '—'}</td>
                  <td className={styles.date}>{r.sepdate || '—'}</td>
                  {isAdmin && (
                    <td>
                      <span className={`${styles.pill} ${deleted ? styles.x : ''}`}>{r.status}</span>
                    </td>
                  )}
                  {isAdmin && <td className={styles.stamp}>{r.stamp || '—'}</td>}
                  <td className={styles.ac}>
                    {/* Figure 15: a deleted row shows Restore only (a later ticket), so no History here. */}
                    {!deleted && (
                      <button type="button" className={`${styles.btn} ${styles.sm}`} onClick={() => onHistory?.(r)}>
                        History
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={cols} className={styles.empty}>
                  {q.trim() ? 'No employees match your search.' : 'No employees yet.'}
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