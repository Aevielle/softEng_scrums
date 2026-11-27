'use client';

import { useEffect, useMemo, useState } from 'react';
import { countByStatus, filterDepartments } from '@/lib/departments/filter';
import { nextDeptCode } from '@/lib/departments/form';
import DepartmentForm from './DepartmentForm';
import styles from './hr.module.css';

const TABS = ['Active', 'Inactive', 'All'];
const byCode = (a, b) => a.deptcode.localeCompare(b.deptcode);

/**
 * Departments list (Figures 19 and 22) with the Add / Edit form, soft Delete and Restore (S3-DEV-01).
 *  - Admin / Superadmin: status tabs, Status and Stamp columns, deleted rows shaded with a Restore button.
 *  - User: the server only sends Active rows with no status / stamp, so those parts are simply not drawn.
 *  - Search filters as you type, in the browser, on the rows already loaded.
 *  - perm = { add, edit, del, restore }: which buttons to show. Only hides buttons; /api/departments checks again.
 */
export default function DepartmentsTab({ initial, isAdmin, perm = { add: false, edit: false, del: false, restore: false } }) {
  const [all, setAll] = useState(initial); // grows / changes as departments are added, edited, deleted or restored
  const [form, setForm] = useState(null); // { mode: 'add' } | { mode: 'edit', row }
  const [toast, setToast] = useState(null); // { title, message, err }
  const [tab, setTab] = useState('All'); // Figure 19 opens on All; only Admins see the tabs
  const [q, setQ] = useState('');
  const [busyCode, setBusyCode] = useState(null); // row whose Delete / Restore is in flight

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = (title, message, err = false) => setToast({ title, message, err });
  const upsert = (row) => setAll((l) => [...l.filter((x) => x.deptcode !== row.deptcode), row].sort(byCode));
  const remove = (code) => setAll((l) => l.filter((x) => x.deptcode !== code));
  const closeForm = () => setForm(null);

  const counts = useMemo(() => countByStatus(all), [all]);
  // A User's rows are already Active-only from the server, so the status filter is skipped for them.
  const rows = useMemo(() => filterDepartments(all, { q, status: isAdmin ? tab : 'All' }), [all, q, tab, isAdmin]);
  // Only an Admin holds every row (deleted ones too), so only an Admin can preview the next code.
  const nextCode = useMemo(() => (isAdmin ? nextDeptCode(all.map((r) => r.deptcode)) : null), [all, isAdmin]);

  async function act(row, kind) {
    const base = `/api/departments/${encodeURIComponent(row.deptcode)}`;
    setBusyCode(row.deptcode);
    try {
      const res =
        kind === 'delete'
          ? await fetch(base, { method: 'DELETE' })
          : await fetch(`${base}/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        notify(data.title || (kind === 'delete' ? 'Could not delete' : 'Could not restore'), data.message || 'Please try again. (HTTP ${res.status})', true);
        return;
      }

      if (kind === 'delete') {
        // An Admin keeps the row (now Inactive, shaded). A User never sees Inactive rows, so it just disappears.
        if (isAdmin) upsert(data.department);
        else remove(row.deptcode);
        notify('Deleted', `Department ${row.deptcode} moved to Inactive. An Admin can restore it.`);
      } else {
        upsert(data.department);
        notify('Restored', `Department ${row.deptcode} is active again.`);
      }
    } catch {
      notify('No connection', 'Check your network and try again.', true);
    } finally {
      setBusyCode(null);
    }
  }

  const cols = 3 + (isAdmin ? 2 : 0);

  return (
    <>
      <div className={styles.bar}>
        <h2 className={styles.heading}>Departments</h2>

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
            placeholder="Search departments..."
            aria-label="Search departments"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          {perm.add && (
            <button type="button" className={`${styles.btn} ${styles.pri}`} onClick={() => setForm({ mode: 'add' })}>
              + Add Department
            </button>
          )}
        </div>
      </div>

      <div className={styles.tw}>
        <table>
          <thead>
            <tr>
              <th>Dept Code</th>
              <th>Department Name</th>
              {isAdmin && <th>Status</th>}
              {isAdmin && <th>Stamp</th>}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const deleted = isAdmin && r.status === 'Inactive';
              const busy = busyCode === r.deptcode;
              return (
                <tr key={r.deptcode} className={deleted ? styles.deleted : ''}>
                  <td><b>{r.deptcode}</b></td>
                  <td>{r.deptname}</td>
                  {isAdmin && (
                    <td>
                      <span className={`${styles.pill} ${deleted ? styles.x : ''}`}>{r.status}</span>
                    </td>
                  )}
                  {isAdmin && <td className={styles.stamp}>{r.stamp || '—'}</td>}
                  <td className={styles.ac}>
                    {/* Figure 19: a deleted row shows Restore only (Admin / Superadmin). Figure 22: a User sees Edit / Delete they hold. */}
                    {deleted ? (
                      perm.restore && (
                        <button type="button" className={`${styles.btn} ${styles.sm}`} disabled={busy} onClick={() => act(r, 'restore')}>
                          Restore
                        </button>
                      )
                    ) : (
                      <>
                        {perm.edit && (
                          <button type="button" className={`${styles.btn} ${styles.sm}`} disabled={busy} onClick={() => setForm({ mode: 'edit', row: r })}>
                            Edit
                          </button>
                        )}
                        {perm.del && (
                          <button type="button" className={`${styles.btn} ${styles.sm}`} disabled={busy} onClick={() => act(r, 'delete')}>
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
                  {q.trim() ? 'No departments match your search.' : 'No departments yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className={styles.count} role="status" aria-live="polite">
        Showing {rows.length} of {all.length}
      </p>

      {form && (
        <DepartmentForm mode={form.mode} row={form.row} nextCode={nextCode} onClose={closeForm} onSaved={upsert} notify={notify} />
      )}

      {toast && (
        <div className={`${styles.toast} ${toast.err ? styles.err : ''}`} role="status">
          <b>{toast.title}</b>
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
}
