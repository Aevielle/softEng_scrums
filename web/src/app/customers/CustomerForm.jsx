'use client';

import { useEffect, useState } from 'react';
import { ADDRESS_MAX, NAME_MAX, PAY_TERMS, validateCustomerInput } from '@/lib/customers/form';
import styles from './customers.module.css';

// Add Customer / Edit Customer (Figure 9). The number, Status and Stamp are never typed here:
// the server fills them in, so the number is shown but cannot be edited.
export default function CustomerForm({ mode, row, onClose, onSaved, notify }) {
  const editing = mode === 'edit';
  const [f, setF] = useState({
    custname: row?.custname ?? '',
    address: row?.address ?? '',
    payterm: row?.payterm ?? '',
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
    const v = validateCustomerInput(f);
    if (!v.ok) {
      setBad(v.error.fields);
      return notify(v.error.title, v.error.message, true);
    }

    setBusy(true);
    try {
      const res = await fetch(editing ? `/api/customers/${encodeURIComponent(row.custno)}` : '/api/customers', {
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

      onSaved(data.customer);
      notify('Saved', editing ? `Customer ${data.customer.custno} updated.` : `Customer ${data.customer.custno} added.`);
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
      <div className={styles.md} role="dialog" aria-modal="true" aria-labelledby="cf-title" onClick={(e) => e.stopPropagation()}>
        <h3 id="cf-title">{editing ? 'Edit' : 'Add'} customer</h3>
        <p className={styles.sub}>Customer number, status and stamp are filled in by the system.</p>

        <label htmlFor="cf-no">Customer No.</label>
        <input id="cf-no" disabled value={editing ? row.custno : 'Assigned when you save'} />

        <label htmlFor="cf-name">Name</label>
        <input id="cf-name" className={cls('custname')} value={f.custname} onChange={set('custname')} maxLength={NAME_MAX} autoFocus />

        <label htmlFor="cf-address">Address</label>
        <input id="cf-address" className={cls('address')} value={f.address} onChange={set('address')} maxLength={ADDRESS_MAX} />

        <label htmlFor="cf-terms">Pay terms</label>
        <select id="cf-terms" className={cls('payterm')} value={f.payterm} onChange={set('payterm')}>
          <option value="">Select payment terms</option>
          {PAY_TERMS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <div className={styles.row}>
          <button type="button" className={styles.btn} onClick={onClose} disabled={busy}>Cancel</button>
          <button type="button" className={`${styles.btn} ${styles.pri}`} onClick={save} disabled={busy}>
            {busy ? 'Saving...' : 'Save customer'}
          </button>
        </div>
      </div>
    </div>
  );
}
