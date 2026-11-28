'use client';

import { useEffect, useState } from 'react';
import { JOB_DESC_MAX, validateJobInput } from '@/lib/jobs/form';
import styles from './hr.module.css';

// Add Job / Edit Job (Screen 06 of the S3-UIX-01 wireframes). The code, Status and Stamp are never typed
// here: the server fills them in, so the code is shown but locked.
// `nextCode` is the code the Add form shows. Only an Admin has every row (deleted ones too), so only an Admin gets a
// preview; for a User it is null and the form says the code is assigned on save (a deleted code is never reused).
export default function JobForm({ mode, row, nextCode, onClose, onSaved, notify }) {
  const editing = mode === 'edit';
  const [name, setName] = useState(row?.jobdesc ?? '');
  const [bad, setBad] = useState(false); // highlight the Description input
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  async function save() {
    // Same check as the server, so a mistake is caught before we call it. Nothing is saved on an error.
    const v = validateJobInput({ jobdesc: name });
    if (!v.ok) {
      setBad(true);
      return notify(v.error.title, v.error.message, true);
    }

    setBusy(true);
    try {
      const res = await fetch(editing ? `/api/jobs/${encodeURIComponent(row.jobcode)}` : '/api/jobs', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v.value),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.fields?.length) setBad(true);
        notify(data.title || 'Could not save', data.message || 'Please try again.', true);
        return;
      }

      onSaved(data.job);
      notify('Saved', editing ? 'Job updated.' : 'Job added.');
      onClose();
    } catch {
      notify('No connection', 'Check your network and try again.', true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={() => !busy && onClose()}>
      <div className={styles.md} role="dialog" aria-modal="true" aria-labelledby="jf-title" onClick={(e) => e.stopPropagation()}>
        <h3 id="jf-title">{editing ? 'Edit' : 'Add'} job</h3>
        <p className={styles.sub}>Code, status and stamp are filled in by the system.</p>

        <label htmlFor="jf-code">{editing ? 'Code (Locked)' : 'Code (Auto-generated, locked)'}</label>
        <input id="jf-code" disabled value={editing ? row.jobcode : nextCode || 'Assigned when you save'} />

        <label htmlFor="jf-name">Description *</label>
        <input
          id="jf-name"
          className={bad ? styles.bad : ''}
          value={name}
          maxLength={JOB_DESC_MAX}
          placeholder="Job description"
          autoFocus
          onChange={(e) => {
            setName(e.target.value);
            setBad(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !busy) save();
          }}
        />

        <div className={styles.row}>
          <button type="button" className={styles.btn} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={`${styles.btn} ${styles.pri}`} onClick={save} disabled={busy}>
            {busy ? 'Saving...' : 'Save Job'}
          </button>
        </div>
      </div>
    </div>
  );
}