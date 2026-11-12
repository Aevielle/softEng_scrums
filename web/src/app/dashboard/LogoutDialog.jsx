'use client';

import { useState, useEffect, useRef } from 'react';
import { markSignedOut } from '../FlashToast';
import styles from './logout.module.css';

// Same confirm popup as before (logout.module.css is unchanged), now opened from the profile menu.
export default function LogoutDialog({ open, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const noRef = useRef(null);

  // Focus "No" when the popup opens (the safe choice), and close on Escape
  useEffect(() => {
    if (!open) return;
    setError('');
    noRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy, onClose]);

  async function logout() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.message || 'Could not log out. Please try again.');
        setBusy(false);
        return;
      }

      // The landing page shows a "Signed out" toast, then we leave immediately.
      // replace() keeps the Back button from returning to the dashboard.
      markSignedOut();
      window.location.replace(data.redirect || '/');
    } catch {
      setError('Unable to connect. Please try again.');
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={() => !busy && onClose()}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="logout-title" className={styles.title}>Log out</h2>
        <p className={styles.text}>You are logging out in this account. Are you sure?</p>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <div className={styles.actions}>
          <button type="button" className={styles.yes} onClick={logout} disabled={busy}>
            {busy ? 'Logging out...' : 'Yes'}
          </button>
          <button type="button" className={styles.no} onClick={onClose} disabled={busy} ref={noRef}>
            No
          </button>
        </div>
      </div>
    </div>
  );
}