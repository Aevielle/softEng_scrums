'use client';

import { useEffect, useMemo, useState } from 'react';
import { countByStatus, filterEmployees } from '@/lib/employees/filter';
import EmployeeForm from './EmployeeForm';
import styles from './hr.module.css';

const TABS = ['Active', 'Inactive', 'All'];
const byNo = (a, b) => a.empno.localeCompare(b.empno);

/**
 * Employees list (Figures 15 and 20) with the Add / Edit form (S3-DEV-04).
 *  - Admin / Superadmin: status tabs, Status and Stamp columns, deleted rows shaded.
 *  - User: the server only sends Active rows with no status / stamp, so those parts are simply not drawn.
 *  - Search filters as you type, in the browser, on the rows already loaded.
 *  - Delete / Restore (S3-DEV-05): Delete makes the record Inactive (Stamp DELETED); Restore (Admin / Superadmin) brings it back.
 *    Status is about the RECORD. The Sep Date column is about the PERSON leaving the company, so a row can be
 *    Inactive and still show a Sep Date (E-004 in Figure 15), and an Active row can have one too.
 *  - perm = { add, edit, del, restore }: which buttons to show. Only hides buttons; /api/employees checks the rights again.
 * `onHistory(row)` is the hook for S3-DEV-06 (job history); until it is passed, the button does nothing.
 */
export default function EmployeesTab({ initial, isAdmin, perm = { add: false, edit: false, del: false, restore: false }, onHistory }) {
  const [all, setAll] = useState(initial); // grows / changes as employees are added, edited, deleted or restored
  const [form, setForm] = useState(null); // { mode: 'add' } | { mode: 'edit', row }
  const [toast, setToast] = useState(null); // { title, message, err }
  const [tab, setTab] = useState('All'); // Figure 15 opens on All; only Admins see the tabs
  const [q, setQ] = useState('');
  const [busyNo, setBusyNo] = useState(null); // row whose Delete / Restore is in flight

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = (title, message, err = false) => setToast({ title, message, err });
  const upsert = (row) => setAll((l) => [...l.filter((x) => x.empno !== row.empno), row].sort(byNo));
  const remove = (empno) => setAll((l) => l.filter((x) => x.empno !== empno));
  const closeForm = () => setForm(null);

  async function act(row, kind) {
    const base = `/api/employees/${encodeURIComponent(row.empno)}`;
    setBusyNo(row.empno);
    try {
      const res =
        kind === 'delete'
          ? await fetch(base, { method: 'DELETE' })
          : await fetch(`${base}/restore`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // e.g. "Cannot delete employee (E-001): 2 active sales record(s) still reference this employee."
        notify(data.title || (kind === 'delete' ? 'Could not delete' : 'Could not restore'), data.message || 'Please try again.', true);
        return;
      }

      if (kind === 'delete') {
        // An Admin keeps the row (now Inactive, shaded). A User never sees Inactive rows, so it just disappears.
        if (isAdmin) upsert(data.employee);
        else remove(row.empno);
        notify('Deleted', `Employee ${row.empno} moved to Inactive. An Admin can restore it.`);
      } else {
        upsert(data.employee);
        notify('Restored', `Employee ${row.empno} is active again.`);
      }
    } catch {
      notify('No connection', 'Check your network and try again.', true);
    } finally {
      setBusyNo(null);
    }
  }

  const counts = useMemo(() => countByStatus(all), [all]);
  // A User's rows are already Active-only from the server, so the status filter is skipped for them.
  const rows = useMemo(() => filterEmployees(all, { q, status: isAdmin ? tab : 'All' }), [all, q, tab, isAdmin]);

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

          {perm.add && (
            <button type="button" className={`${styles.btn} ${styles.pri}`} onClick={() => setForm({ mode: 'add' })}>
              + Add Employee
            </button>
          )}
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
              const deleted = isAdmin && r.status === 'Inactive'; // the record is deleted; says nothing about r.sepdate
              const busy = busyNo === r.empno;
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
                    {/* Figure 15: a deleted row shows Restore only (Admin / Superadmin), so no History / Edit / Delete there. */}
                    {deleted ? (
                      perm.restore && (
                        <button type="button" className={`${styles.btn} ${styles.sm}`} disabled={busy} onClick={() => act(r, 'restore')}>
                          Restore
                        </button>
                      )
                    ) : (
                      <>
                        <button type="button" className={`${styles.btn} ${styles.sm}`} disabled={busy} onClick={() => onHistory?.(r)}>
                          History
                        </button>
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
                  {q.trim() ? 'No employees match your search.' : 'No employees yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className={styles.count} role="status" aria-live="polite">
        Showing {rows.length} of {all.length}
      </p>

      {form && <EmployeeForm mode={form.mode} row={form.row} onClose={closeForm} onSaved={upsert} notify={notify} />}

      {toast && (
        <div className={`${styles.toast} ${toast.err ? styles.err : ''}`} role="status">
          <b>{toast.title}</b>
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
}