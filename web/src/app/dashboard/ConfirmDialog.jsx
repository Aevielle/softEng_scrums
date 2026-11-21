'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './dashboard.module.css';

// "Are you sure?" pop-up for the trash icons (Recent activity and Notifications).
// Rendered in a portal so the dark backdrop also covers the sidebar. "No" gets the focus (the safe choice).
export default function ConfirmDialog({ title, text, yesLabel = 'Yes, delete', noLabel = 'No, keep', onYes, onNo }) {
  const noRef = useRef(null);
  const onNoRef = useRef(onNo);
  onNoRef.current = onNo;

  useEffect(() => {
    noRef.current?.focus();
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation(); // do not also close the "View all" list or the notification menu behind it
      onNoRef.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  return createPortal(
    <div className={styles.cfOverlay} onClick={onNo}>
      <div
        className={styles.cfBox}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="cf-title"
        aria-describedby="cf-text"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="cf-title">{title}</h2>
        <p id="cf-text">{text}</p>
        <div className={styles.cfActions}>
          <button type="button" className={styles.cfBtn} onClick={onNo} ref={noRef}>
            {noLabel}
          </button>
          <button type="button" className={`${styles.cfBtn} ${styles.cfDanger}`} onClick={onYes}>
            {yesLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
