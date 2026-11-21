'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './dashboard.module.css';

// Full list behind the "View all (n)" link of Recent activity and Notifications.
// The rows (with their own trash icons) are passed in as children, so both lists look the same here as on the page.
export default function ViewAllDialog({ title, onClose, children }) {
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return createPortal(
    <div className={styles.cfOverlay} onClick={onClose}>
      <div
        className={`${styles.cfBox} ${styles.cfWide}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="va-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="va-title">{title}</h2>
        <div className={styles.cfList}>{children}</div>
        <div className={styles.cfActions}>
          <button type="button" className={styles.cfBtn} onClick={onClose} ref={closeRef}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
