'use client';

import { useEffect, useState } from 'react';
import styles from './customers.module.css';

// Confirm Delete (S2-DEV-03). Soft delete: the customer is marked Inactive, not removed.
// If the server refuses (for example the customer still has active sales), the reason stays in this dialog
// so it can be read, instead of in a toast that disappears after a few seconds.
export default function DeleteCustomerDialog({ row, isAdmin, onClose, onDeleted }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null); // { title, message }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${encodeURIComponent(row.custno)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({
          title: res.status === 401 ? 'Signed out' : data.title || 'Could not delete',
          message:
            res.status === 401
              ? 'Your session has ended. Sign in again, then retry. Nothing was deleted.'
              : data.message || 'Nothing was deleted. Please try again.',
        });
        return;
      }
      onDeleted(data.customer);
    } catch {
      setError({ title: 'No connection', message: 'Nothing was deleted. Check your network and try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={() => !busy && onClose()}>
      <div className={styles.md} role="alertdialog" aria-modal="true" aria-labelledby="dc-title" aria-describedby="dc-text" onClick={(e) => e.stopPropagation()}>
        <h3 id="dc-title">Delete customer {row.custno}?</h3>
        <p id="dc-text" className={styles.sub}>
          <b>{row.custname}</b> will be marked Inactive, not erased.{' '}
          {isAdmin
            ? 'It will show shaded in the list, and you can restore it later.'
            : 'It will disappear from your list. An Admin can restore it.'}
        </p>

        {error && (
          <p className={styles.banner} role="alert">
            <b>{error.title}.</b> {error.message}
          </p>
        )}

        <div className={styles.row}>
          <button type="button" className={styles.btn} onClick={onClose} disabled={busy}>
            {error ? 'Close' : 'Cancel'}
          </button>
          {!error && (
            <button type="button" className={`${styles.btn} ${styles.pri} ${styles.dangerFill}`} onClick={confirm} disabled={busy} autoFocus>
              {busy ? 'Deleting...' : 'Delete customer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
