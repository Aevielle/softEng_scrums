'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import LogoutDialog from './LogoutDialog';
import { fmtTs } from './format';
import styles from './dashboard.module.css';

// Title + date/time on the left; theme, role badge, notifications and profile menu on the right.
export default function TopBar({ title, role, roleLabel, firstName, email, notes = [] }) {
  const [stamp, setStamp] = useState('');
  const [dark, setDark] = useState(true);
  const [menu, setMenu] = useState(null); // 'bell' | 'prof' | null
  const [seen, setSeen] = useState(false);
  const [items, setItems] = useState(notes);
  const [ask, setAsk] = useState(false);
  const toolsRef = useRef(null);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const date = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      setStamp(`${date} · ${time}`);
    };
    tick();
    const t = setInterval(tick, 10000);

    const r = document.documentElement;
    setDark(r.dataset.theme ? r.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const onDown = (e) => {
      if (!toolsRef.current?.contains(e.target)) setMenu(null);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setMenu(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  function toggleTheme() {
    const next = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {}
    setDark(!dark);
  }

  function openBell() {
    setMenu(menu === 'bell' ? null : 'bell');
    setSeen(true);
  }

  const unread = seen ? 0 : items.length;

  return (
    <header className={styles.topbar}>
      <div>
        <h1 className={styles.pageTitle}>{title}</h1>
        <div className={styles.stamp}>{stamp || ' '}</div>
      </div>

      <div className={styles.tools} ref={toolsRef}>
        <button type="button" className={styles.ib} onClick={toggleTheme} aria-label="Toggle theme">
          <Icon name={dark ? 'sun' : 'moon'} />
        </button>

        <span className={`${styles.roleBadge} ${styles[role]}`}>{roleLabel}</span>

        <div className={styles.dd}>
          <button
            type="button"
            className={styles.ib}
            onClick={openBell}
            aria-label="Notifications"
            aria-expanded={menu === 'bell'}
          >
            <Icon name="bell" />
            {unread > 0 && <i className={styles.bdg}>{unread}</i>}
          </button>

          {menu === 'bell' && (
            <div className={styles.pop}>
              <div className={styles.popHead}>
                <b>Notifications</b>
                {items.length > 0 && (
                  <button type="button" className={styles.x2} aria-label="Delete all" onClick={() => setItems([])}>
                    <Icon name="trash" size={16} />
                  </button>
                )}
              </div>
              {items.length ? (
                items.map((n) => (
                  <div key={n.id} className={styles.ni}>
                    <div>
                      <span>
                        <b>{n.who}</b>
                        <span className={`${styles.rb} ${styles[n.role]}`}>{n.roleLabel}</span>
                        {n.text}
                      </span>
                      <small>{fmtTs(n.ts)}</small>
                    </div>
                    <button
                      type="button"
                      className={styles.x2}
                      aria-label="Delete"
                      onClick={() => setItems((l) => l.filter((x) => x.id !== n.id))}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                ))
              ) : (
                <p className={styles.muted}>You are all caught up.</p>
              )}
            </div>
          )}
        </div>

        <div className={styles.dd}>
          <button
            type="button"
            className={styles.avb}
            onClick={() => setMenu(menu === 'prof' ? null : 'prof')}
            aria-label="Profile menu"
            aria-expanded={menu === 'prof'}
          >
            <span className={styles.av}><Icon name="user" /></span>
          </button>

          {menu === 'prof' && (
            <div className={styles.pop}>
              <div className={styles.popUser}>
                <span className={`${styles.av} ${styles.avXl}`}><Icon name="user" size={36} /></span>
                <b>{firstName}</b>
                <span className={`${styles.roleBadge} ${styles[role]}`}>{roleLabel}</span>
                <span className={styles.stamp}>{email}</span>
              </div>
              <Link href="/profile" className={styles.popBtn} onClick={() => setMenu(null)}>
                <Icon name="user" size={16} /> View profile
              </Link>
              <button
                type="button"
                className={styles.popBtn}
                onClick={() => {
                  setMenu(null);
                  setAsk(true);
                }}
              >
                <Icon name="out" size={16} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <LogoutDialog open={ask} onClose={() => setAsk(false)} />
    </header>
  );
}