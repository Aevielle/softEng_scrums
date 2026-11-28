'use client';

import { useEffect, useState } from 'react';
import { validateHistoryInput } from '@/lib/jobhistory/form';
import styles from './hr.module.css';

// Add / Edit Job History (S3-DEV-06): job and department drop-downs, effective date and salary.
// The employee, Status and Stamp are never typed here: the server fills them in.
// `jobs` / `departments` are the lists the dialog loaded; only Active ones are offered.
export default function HistoryForm({ mode, empno, row, jobs, departments, onClose, onSaved, notify }) {
  const editing = mode === 'edit';
  const [f, setF] = useState({
    effdate: row?.effdate ?? '',
    jobcode: row?.jobcode ?? '',
    deptcode: row?.deptcode ?? '',
    salary: row ? String(row.salary) : '',
  });
  const [bad, setBad] = useState([]); // field names to highlight
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const set = (k) => (e) => {
    setF((s) => ({ ...s, [k]: e.target.value }));
    setBad((b) => b.filter((x) => x !== k));
  };

  async function save() {
    // Same checks as the server, so most mistakes are caught before we call it. Nothing is saved on an error.
    const v = validateHistoryInput(f);
    if (!v.ok) {
      setBad(v.error.fields);
      return notify(v.error.title, v.error.message, true);
    }

    const base = `/api/employees/${encodeURIComponent(empno)}/history`;
    setBusy(true);
    try {
      const res = await fetch(editing ? `${base}/${encodeURIComponent(row.effdate)}` : base, {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v.value),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        // e.g. "This employee already has a job history row with effective date 2023-01-01. Choose a different date."
        if (data.fields) setBad(data.fields);
        notify(data.title || 'Could not save', data.message || 'Please try again.', true);
        return;
      }

      onSaved(data.entry, editing ? row.effdate : null);
      notify('Saved', editing ? 'Job history updated.' : 'Job history added.');
      onClose();
    } catch {
      notify('No connection', 'Check your network and try again.', true);
    } finally {
      setBusy(false);
    }
  }

  const cls = (k) => (bad.includes(k) ? styles.bad : '');

  return (
    <div className={styles.overlay} onClick={() => !busy && onClose()}>
      <div className={styles.md} role="dialog" aria-modal="true" aria-labelledby="hf-title" onClick={(e) => e.stopPropagation()}>
        <h3 id="hf-title">{editing ? 'Edit' : 'Add'} job history</h3>
        <p className={styles.sub}>Employee {empno}. Status and stamp are filled in by the system.</p>

        <label htmlFor="hf-date">Effective date *</label>
        <input id="hf-date" type="date" className={cls('effdate')} value={f.effdate} onChange={set('effdate')} autoFocus />

        <label htmlFor="hf-job">Job *</label>
        <select id="hf-job" className={cls('jobcode')} value={f.jobcode} onChange={set('jobcode')}>
          <option value="">Select job</option>
          {jobs.map((j) => (
            <option key={j.jobcode} value={j.jobcode}>{j.jobcode} — {j.jobdesc}</option>
          ))}
        </select>

        <label htmlFor="hf-dept">Department *</label>
        <select id="hf-dept" className={cls('deptcode')} value={f.deptcode} onChange={set('deptcode')}>
          <option value="">Select department</option>
          {departments.map((d) => (
            <option key={d.deptcode} value={d.deptcode}>{d.deptcode} — {d.deptname}</option>
          ))}
        </select>

        <label htmlFor="hf-salary">Salary *</label>
        <input
          id="hf-salary"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          className={cls('salary')}
          value={f.salary}
          onChange={set('salary')}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !busy) save();
          }}
        />

        <div className={styles.row}>
          <button type="button" className={styles.btn} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={`${styles.btn} ${styles.pri}`} onClick={save} disabled={busy}>
            {busy ? 'Saving...' : 'Save history'}
          </button>
        </div>
      </div>
    </div>
  );
}
