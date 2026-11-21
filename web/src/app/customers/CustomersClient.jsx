'use client';

import { useEffect, useMemo, useState } from 'react';
import { countByStatus, filterCustomers } from '@/lib/customers/filter';
import CustomerForm from './CustomerForm';
import DeleteCustomerDialog from './DeleteCustomerDialog';
import styles from './customers.module.css';

const TABS = ['Active', 'Inactive', 'All'];
const byNo = (a, b) => a.custno.localeCompare(b.custno);

export default function CustomersClient({ initial, isAdmin, perm }) {
  const [all, setAll] = useState(initial); // grows / changes as customers are added or edited
  const [form, setForm] = useState(null); // { mode: 'add' } | { mode: 'edit', row }
  const [confirmDel, setConfirmDel] = useState(null); // the row waiting for "Delete customer?" confirmation
  const [restoring, setRestoring] = useState(''); // custno of the restore in flight
  const [toast, setToast] = useState(null); // { title, message, err }
  const [tab, setTab] = useState('All'); // Figure 9 opens on All; only Admins can change it
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const notify = (title, message, err = false) => setToast({ title, message, err });
  const upsert = (row) => setAll((l) => [...l.filter((x) => x.custno !== row.custno), row].sort(byNo));
  const closeForm = () => setForm(null);
  const remove = (custno) => setAll((l) => l.filter((x) => x.custno !== custno));

  // Delete: Admins keep the row (now Inactive, shaded). A User's list drops it, since Users never see Inactive rows.
  function handleDeleted(row) {
    if (isAdmin) upsert(row);
    else remove(row.custno);
    setConfirmDel(null);
    notify('Deleted', `Customer ${row.custno} moved to Inactive.${isAdmin ? ' You can restore it.' : ' An Admin can restore it.'}`);
  }

  // Restore (Admin / Superadmin): the same row comes back Active with its old links.
  async function restore(row) {
    if (restoring) return;
    setRestoring(row.custno);
    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(row.custno)}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        notify(data.title || 'Could not restore', data.message || 'Please try again.', true);
        return;
      }
      upsert(data.customer);
      notify('Restored', `Customer ${data.customer.custno} is active again.`);
    } catch {
      notify('No connection', 'Check your network and try again.', true);
    } finally {
      setRestoring('');
    }
  }

  const counts = useMemo(() => countByStatus(all), [all]);

  // A User's rows are already Active-only from the server, so the status filter is skipped for them.
  const rows = useMemo(
    () => filterCustomers(all, { q, status: isAdmin ? tab : 'All' }),
    [all, q, tab, isAdmin]
  );

  const showActions = perm.edit || perm.del || isAdmin; // Admins always see Restore on deleted rows
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
            <button type="button" className={`${styles.btn} ${styles.pri}`} onClick={() => setForm({ mode: 'add' })}>
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
                        isAdmin && (
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.sm}`}
                            onClick={() => restore(r)}
                            disabled={restoring === r.custno}
                          >
                            {restoring === r.custno ? 'Restoring...' : 'Restore'}
                          </button>
                        )
                      ) : (
                        <>
                          {perm.edit && (
                            <button type="button" className={`${styles.btn} ${styles.sm}`} onClick={() => setForm({ mode: 'edit', row: r })}>
                              Edit
                            </button>
                          )}
                          {perm.del && (
                            <button type="button" className={`${styles.btn} ${styles.sm} ${styles.danger}`} onClick={() => setConfirmDel(r)}>
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
        Showing {rows.length} of {all.length}
      </p>

      {form && <CustomerForm mode={form.mode} row={form.row} onClose={closeForm} onSaved={upsert} notify={notify} />}

      {confirmDel && (
        <DeleteCustomerDialog
          row={confirmDel}
          isAdmin={isAdmin}
          onClose={() => setConfirmDel(null)}
          onDeleted={handleDeleted}
        />
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
