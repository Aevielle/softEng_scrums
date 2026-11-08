'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './logout.module.css';

export default function LogoutButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const noRef = useRef(null);

  // Focus "No" when the popup opens (the safe choice), and close on Escape
  useEffect(() => {
    if (!open) return;
    noRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape' && !busy) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, busy]);

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

      // Full reload clears cached state; replace() keeps the Back button
      // from returning to the dashboard
      window.location.replace(data.redirect || '/');
    } catch {
      setError('Unable to connect. Please try again.');
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={styles.logoutButton} onClick={() => setOpen(true)}>
        Log out
      </button>

      {open && (
        <div
          className={styles.overlay}
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="logout-title" className={styles.title}>Log out</h2>
            <p className={styles.text}>
              You are logging out in this account. Are you sure?
            </p>

            {error && <p className={styles.error} role="alert">{error}</p>}

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.yes}
                onClick={logout}
                disabled={busy}
              >
                {busy ? 'Logging out...' : 'Yes'}
              </button>
              <button
                type="button"
                className={styles.no}
                onClick={() => setOpen(false)}
                disabled={busy}
                ref={noRef}
              >
                No
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}