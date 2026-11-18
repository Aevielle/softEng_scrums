'use client';

import Link from 'next/link';
import { useState } from 'react';
import Icon from './Icon';
import styles from './dashboard.module.css';

// `groups` is already filtered on the server by role and rights, so a link that the
// person may not use is never sent to the browser. The server still re-checks on every page.
const ACCOUNT = { heading: 'Account', items: [{ key: 'profile', href: '/profile', label: 'My Profile', icon: 'user' }] };

export default function Sidebar({ groups, active = 'dashboard' }) {
  const [mini, setMini] = useState(false);
  let i = 0; // drives the slide-in delay of each item

  const item = (key, href, label, icon, active) => (
    <Link
      key={key}
      href={href}
      className={`${styles.navItem} ${active ? styles.active : ''}`}
      title={label}
      style={{ '--i': i++ }}
    >
      <span className={styles.navIcon}><Icon name={icon} /></span>
      <span className={styles.label}>{label}</span>
    </Link>
  );

  return (
    <aside className={`${styles.sidebar} ${mini ? styles.mini : ''}`}>
      <div className={styles.brand}>
        <span className={styles.logo}>H</span>
        <b className={styles.label}>Hope, Inc. ERP</b>
      </div>

      <nav aria-label="Main" className={styles.nav}>
        {item('dashboard', '/dashboard', 'Dashboard', 'dashboard', active === 'dashboard')}

        {[...groups, ACCOUNT].map((g) => (
          <div key={g.heading}>
            <p className={`${styles.navHeading} ${styles.label}`}>{g.heading}</p>
            {g.items.map((m) => item(m.key, m.href, m.label, m.icon || m.key, active === m.key))}
          </div>
        ))}
      </nav>

      <button
        type="button"
        className={styles.toggle}
        onClick={() => setMini((v) => !v)}
        aria-label={mini ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-expanded={!mini}
      >
        <Icon name="chev" />
      </button>
    </aside>
  );
}