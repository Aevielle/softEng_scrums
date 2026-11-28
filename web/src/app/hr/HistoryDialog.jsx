'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { currentEffdate, filterHistory, isActive, newestFirst } from '@/lib/jobhistory/filter';
import HistoryForm from './HistoryForm';
import styles from './hr.module.css';

const TABS = ['Active', 'Inactive', 'All'];

// $52,000 (no decimals for whole amounts, 2 for the rest), like Figures 16 and 17.
const money = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(n);

/**
 * Job History dialog (Figures 16 and 17), opened by the History button on an employee row (S3-DEV-06).
 *  - Rows come newest effective date first. The ACTIVE row with the latest effective date is the current job.
 *  - Admin / Superadmin: status tabs, Status and Stamp columns. User: the server sends Active rows without Status / Stamp.
 *  - perm = { add, edit, del }: which buttons to show. Only hides buttons; /api/employees/[empno]/history checks again.
 *  - The job and department lists are loaded fresh each time the dialog opens, so a job added a minute ago is offered.
 *  - Delete is a soft delete (Status Inactive, Stamp DELETED). Two active rows with the same effective date for one
 *    employee are refused by the server (and by Geliz's S3-DBA-02 index).
 * `emp` is the employee row; `notify` shows the page's toast (it sits above this dialog).
 */
export default function HistoryDialog({ emp, isAdmin, perm = { add: false, edit: false, del: false }, onClose, notify }) {
  const [rows, setRows] = useState(null); // null while loading
  const [jobs, setJobs] = useState([]);
  const [depts, setDepts] = useState([]);
  const [failed, setFailed] = useState(null); // message when the first load fails
  const [tab, setTab] = useState('Active');
  const [form, setForm] = useState(null); // { mode: 'add' } | { mode: 'edit', row }
  const [busyDate, setBusyDate] = useState(null); // effdate of the row whose Delete is in flight

  // Load history + the job / department lists together.
  useEffect(() => {
    let alive = true;
    const base = `/api/employees/${encodeURIComponent(emp.empno)}/history`;
    Promise.all([fetch(base), fetch('/api/jobs'), fetch('/api/departments')])
      .then(async ([h, j, d]) => {
        const hist = await h.json().catch(() => ({}));
        if (!h.ok) throw new Error(hist.message || 'Could not load the job history.');
        const jl = await j.json().catch(() => ({}));
        const dl = await d.json().catch(() => ({}));
        if (!alive) return;
        setRows(newestFirst(hist.history ?? []));
        setJobs(jl.jobs ?? []);
        setDepts(dl.departments ?? []);
      })
      .catch((e) => alive && setFailed(e.message || 'Check your network and try again.'));
    return () => {
      alive = false;
    };
  }, [emp.empno]);

  // Esc closes the dialog, unless the Add / Edit form is open on top (it closes itself first).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !form) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [form, onClose]);

  const closeForm = useCallback(() => setForm(null), []);

  // Only active jobs / departments can be chosen (an Admin's lists also hold deleted ones).
  const jobOptions = useMemo(() => jobs.filter((j) => j.status !== 'Inactive'), [jobs]);
  const deptOptions = useMemo(() => depts.filter((d) => d.status !== 'Inactive'), [depts]);
  const jobLabel = (code) => {
    const j = jobs.find((x) => x.jobcode === code);
    return j ? `${code} — ${j.jobdesc}` : code;
  };
  const deptLabel = (code) => {
    const d = depts.find((x) => x.deptcode === code);
    return d ? `${code} — ${d.deptname}` : code;
  };

  // A row is named by its date among the ACTIVE rows (one active row per date), so that is what a change replaces.
  const replaceActive = (effdate, entry) =>
    setRows((l) => newestFirst([...l.filter((x) => !(isActive(x) && x.effdate === effdate)), ...(entry ? [entry] : [])]));

  // oldEffdate is set after an Edit (the date may have changed) and null after an Add.
  const onSaved = (entry, oldEffdate) => replaceActive(oldEffdate ?? entry.effdate, entry);

  async function remove(row) {
    setBusyDate(row.effdate);
    try {
      const res = await fetch(`/api/employees/${encodeURIComponent(emp.empno)}/history/${encodeURIComponent(row.effdate)}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        notify(data.title || 'Could not delete', data.message || 'Please try again.', true);
        return;
      }
      // An Admin keeps the row (now Inactive). A User never sees Inactive rows, so it just disappears.
      replaceActive(row.effdate, isAdmin ? data.entry : null);
      notify('Deleted', 'Job history moved to Inactive.');
    } catch {
      notify('No connection', 'Check your network and try again.', true);
    } finally {
      setBusyDate(null);
    }
  }

  const shown = useMemo(() => (rows ? filterHistory(rows, isAdmin ? tab : 'All') : []), [rows, tab, isAdmin]);
  const current = useMemo(() => (rows ? currentEffdate(rows) : null), [rows]);
  const cols = 4 + (isAdmin ? 2 : 0) + 1;
  const name = [emp.firstname, emp.lastname].filter(Boolean).join(' ');

  return (
    <>
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.md} ${styles.wide}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hd-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.hdr}>
          <div>
            <h3 id="hd-title">Job History — {emp.empno}</h3>
            {name && <p className={styles.sub} style={{ margin: 0 }}>{name}</p>}
          </div>
          <button type="button" className={`${styles.btn} ${styles.sm}`} onClick={onClose} aria-label="Close job history">
            ×
          </button>
        </div>

        <div className={`${styles.bar} ${styles.hbar}`}>
          {isAdmin ? (
            <div className={styles.tabs} role="tablist" aria-label="Filter by status">
              {TABS.map((t) => (
                <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? styles.on : ''} onClick={() => setTab(t)}>
                  {t}
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}
          {perm.add && (
            <button type="button" className={`${styles.btn} ${styles.pri}`} disabled={!rows} onClick={() => setForm({ mode: 'add' })}>
              + Add History
            </button>
          )}
        </div>

        <div className={styles.tw}>
          <table>
            <thead>
              <tr>
                <th>Eff Date</th>
                <th>Job</th>
                <th>Department</th>
                <th>Salary</th>
                {isAdmin && <th>Status</th>}
                {isAdmin && <th>Stamp</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => {
                const deleted = !isActive(r);
                const busy = busyDate === r.effdate;
                return (
                  <tr key={`${r.effdate}|${r.jobcode}|${r.deptcode}|${r.status ?? ''}|${i}`} className={deleted ? styles.deleted : ''}>
                    <td className={styles.date}>
                      {r.effdate}
                      {r.effdate === current && !deleted && <span className={`${styles.pill} ${styles.cur}`}>Current</span>}
                    </td>
                    <td>{jobLabel(r.jobcode)}</td>
                    <td>{deptLabel(r.deptcode)}</td>
                    <td><b>{money(r.salary)}</b></td>
                    {isAdmin && (
                      <td>
                        <span className={`${styles.pill} ${deleted ? styles.x : ''}`}>{r.status}</span>
                      </td>
                    )}
                    {isAdmin && <td className={styles.stamp}>{r.stamp || '—'}</td>}
                    <td className={styles.ac}>
                      {/* Figure 16: a deleted row has no actions. */}
                      {!deleted && (
                        <>
                          {perm.edit && (
                            <button type="button" className={`${styles.btn} ${styles.sm}`} disabled={busy} onClick={() => setForm({ mode: 'edit', row: r })}>
                              Edit
                            </button>
                          )}
                          {perm.del && (
                            <button type="button" className={`${styles.btn} ${styles.sm}`} disabled={busy} onClick={() => remove(r)}>
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(failed || !rows || shown.length === 0) && (
                <tr>
                  <td colSpan={cols} className={styles.empty}>
                    {failed ?? (!rows ? 'Loading…' : 'No job history yet.')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {/* Next to the dialog, not inside it, so the dialog's scroll area can never clip it. It paints on top (later in the page). */}
    {form && (
      <HistoryForm
        mode={form.mode}
        empno={emp.empno}
        row={form.row}
        jobs={jobOptions}
        departments={deptOptions}
        onClose={closeForm}
        onSaved={onSaved}
        notify={notify}
      />
    )}
    </>
  );
}
