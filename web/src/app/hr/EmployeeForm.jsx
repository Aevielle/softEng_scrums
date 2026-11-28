'use client';

import { useEffect, useState } from 'react';
import { FIRST_MAX, GENDERS, LAST_MAX, validateEmployeeInput } from '@/lib/employees/form';
import styles from './hr.module.css';

// Add Employee / Edit Employee. The number, Status and Stamp are never typed here:
// the server fills them in, so the number is shown but cannot be edited.
export default function EmployeeForm({ mode, row, onClose, onSaved, notify }) {
  const editing = mode === 'edit';
  const [f, setF] = useState({
    lastname: row?.lastname ?? '',
    firstname: row?.firstname ?? '',
    gender: row?.gender ?? '',
    birthdate: row?.birthdate ?? '',
    hiredate: row?.hiredate ?? '',
    sepdate: row?.sepdate ?? '',
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
    const v = validateEmployeeInput(f);
    if (!v.ok) {
      setBad(v.error.fields);
      return notify(v.error.title, v.error.message, true);
    }

    setBusy(true);
    try {
      const res = await fetch(editing ? `/api/employees/${encodeURIComponent(row.empno)}` : '/api/employees', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v.value),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.fields) setBad(data.fields);
        notify(data.title || 'Could not save', data.message || 'Please try again.', true);
        return;
      }

      onSaved(data.employee);
      notify('Saved', editing ? `Employee ${data.employee.empno} updated.` : `Employee ${data.employee.empno} added.`);
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
      <div className={styles.md} role="dialog" aria-modal="true" aria-labelledby="ef-title" onClick={(e) => e.stopPropagation()}>
        <h3 id="ef-title">{editing ? 'Edit' : 'Add'} employee</h3>
        <p className={styles.sub}>Employee number, status and stamp are filled in by the system.</p>

        <label htmlFor="ef-no">Employee No.</label>
        <input id="ef-no" disabled value={editing ? row.empno : 'Assigned when you save'} />

        <div className={styles.two}>
          <div>
            <label htmlFor="ef-last">Last name *</label>
            <input id="ef-last" className={cls('lastname')} value={f.lastname} onChange={set('lastname')} maxLength={LAST_MAX} autoFocus />
          </div>
          <div>
            <label htmlFor="ef-first">First name *</label>
            <input id="ef-first" className={cls('firstname')} value={f.firstname} onChange={set('firstname')} maxLength={FIRST_MAX} />
          </div>
        </div>

        <label htmlFor="ef-gender">Gender *</label>
        <select id="ef-gender" className={cls('gender')} value={f.gender} onChange={set('gender')}>
          <option value="">Select gender</option>
          {GENDERS.map((g) => (
            <option key={g} value={g}>{g === 'F' ? 'F — Female' : 'M — Male'}</option>
          ))}
        </select>

        <div className={styles.two}>
          <div>
            <label htmlFor="ef-birth">Birth date *</label>
            <input id="ef-birth" type="date" className={cls('birthdate')} value={f.birthdate} onChange={set('birthdate')} />
          </div>
          <div>
            <label htmlFor="ef-hire">Hire date *</label>
            <input id="ef-hire" type="date" className={cls('hiredate')} value={f.hiredate} onChange={set('hiredate')} />
          </div>
        </div>

        <label htmlFor="ef-sep">Separation date (optional)</label>
        <div className={styles.inline}>
          <input id="ef-sep" type="date" className={cls('sepdate')} value={f.sepdate} onChange={set('sepdate')} min={f.hiredate || undefined} />
          {/* Not every browser draws a clear button inside the date box, so there is always one here. */}
          {f.sepdate && (
            <button type="button" className={`${styles.btn} ${styles.sm}`} onClick={() => setF((s) => ({ ...s, sepdate: '' }))} disabled={busy}>
              Clear
            </button>
          )}
        </div>
        <p className={styles.sub}>The day the person left the company. Setting or clearing it does not change the status.</p>

        <div className={styles.row}>
          <button type="button" className={styles.btn} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={`${styles.btn} ${styles.pri}`} onClick={save} disabled={busy}>
            {busy ? 'Saving...' : 'Save employee'}
          </button>
        </div>
      </div>
    </div>
  );
}