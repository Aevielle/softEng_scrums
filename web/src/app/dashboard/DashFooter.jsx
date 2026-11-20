'use client';

import { useEffect, useState } from 'react';
import p from '../page.module.css';
import styles from './dashboard.module.css';

const INFO = {
  privacy: {
    title: "Privacy",
    text: "This is a classroom prototype. Everything you enter is saved only in this browser and is never sent to a server.",
  },
  support: {
    title: "Support",
    text: "Need help? Ask your course instructor, or an Admin on your Hope, Inc. ERP team.",
  },
};

export default function DashFooter() {
  const [open, setOpen] = useState(null); // 'privacy' | 'support' | null

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const info = open ? INFO[open] : null;

  return (
    <div className={styles.foot}>
      <footer className={p.footer}>
        <span className={p.brand}>
          <span className={p.logo}>H</span>
          <span>Hope, Inc.</span>
        </span>
        <div className={p.footerLinks}>
          <span className={p.note}>© 2026 Hope, Inc. ERP</span>
          <button type="button" className={p.footLink} onClick={() => setOpen('privacy')}>Privacy</button>
          <button type="button" className={p.footLink} onClick={() => setOpen('support')}>Support</button>
        </div>
      </footer>

      {info && (
        <div className={p.infoOverlay} onClick={() => setOpen(null)}>
          <div
            className={p.infoModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="info-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="info-title" className={p.infoTitle}>{info.title}</h2>
            <p className={p.infoText}>{info.text}</p>
            <button type="button" className={p.infoClose} onClick={() => setOpen(null)} autoFocus>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}