'use client';

import { useEffect, useState } from 'react';
import styles from './flash.module.css';

const FLASH = 'hope-flash'; // one-shot message shown on the next page (e.g. "Signed out")
const WELCOMED = 'hope-welcomed'; // set once the "Signed in" toast was shown for this login

/** Call right after a successful logout, just before redirecting to the landing page. */
export function markSignedOut() {
  try {
    sessionStorage.setItem(FLASH, JSON.stringify({ title: 'Signed out' }));
    sessionStorage.removeItem(WELCOMED);
  } catch {}
}

/**
 * Top-right toast, same look on the landing page and the dashboard.
 *  - Landing page: <FlashToast />  -> shows "Signed out" after a logout.
 *  - Dashboard:    <FlashToast welcome={{ title: 'Signed in', message: 'Welcome, Marie' }} />
 *                  -> shows once per login.
 */
export default function FlashToast({ welcome }) {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    let next = null;
    try {
      const raw = sessionStorage.getItem(FLASH);
      if (raw) {
        sessionStorage.removeItem(FLASH);
        next = JSON.parse(raw);
      } else if (welcome && !sessionStorage.getItem(WELCOMED)) {
        sessionStorage.setItem(WELCOMED, '1');
        next = welcome;
      }
    } catch {}
    if (next) setToast(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6500);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className={styles.toast} role="status">
      <b>{toast.title}</b>
      {toast.message && <i>{toast.message}</i>}
    </div>
  );
}