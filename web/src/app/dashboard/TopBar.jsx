'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';
import LogoutDialog from './LogoutDialog';
import ConfirmDialog from './ConfirmDialog';
import ViewAllDialog from './ViewAllDialog';
import { notesFor, NOTE_IDS } from './notifications';
import { fmtTs } from './format';
import styles from './dashboard.module.css';

// Title + date/time on the left; theme, role badge, notifications and profile menu on the right.
export default function TopBar({ title, role, roleLabel, firstName, email, showDate = true }) {
  const [stamp, setStamp] = useState('');
  const [dark, setDark] = useState(true);
  const [menu, setMenu] = useState(null); // 'bell' | 'prof' | null
  const [seen, setSeen] = useState(false);
  const [items, setItems] = useState([]); // filled on mount, minus what this person already deleted
  const [ask, setAsk] = useState(false);
  const [del, setDel] = useState(null); // { id } = one notification, { all: true } = every one, null = no pop-up
  const [viewAll, setViewAll] = useState(false);
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

  // Notifications are the same in every module. What was deleted / already seen is kept in this browser
  // (per account), so moving to another page no longer brings the list back.
  const storeKey = `hope_notes:${email}`;
  useEffect(() => {
    let gone = [];
    let wasSeen = false;
    try {
      const saved = JSON.parse(localStorage.getItem(storeKey) || '{}');
      gone = Array.isArray(saved.gone) ? saved.gone : [];
      wasSeen = !!saved.seen;
    } catch {}
    setItems(notesFor(role).filter((n) => !gone.includes(n.id)));
    setSeen(wasSeen);
  }, [role, storeKey]);

  function remember(list, seenNow) {
    try {
      const gone = NOTE_IDS.filter((id) => !list.some((n) => n.id === id));
      localStorage.setItem(storeKey, JSON.stringify({ gone, seen: seenNow }));
    } catch {}
  }

  useEffect(() => {
    if (!menu) return;
    const onDown = (e) => {
      if (del) return; // the "Are you sure?" pop-up is open: clicking it must not close the menu behind it
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
  }, [menu, del]);

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
    remember(items, true);
  }

  const unread = seen ? 0 : items.length;
  const PREVIEW = 3; // rows in the bell menu; "View all" opens the rest
  const target = del && !del.all ? items.find((x) => x.id === del.id) : null;

  function confirmDelete() {
    const next = del.all ? [] : items.filter((x) => x.id !== del.id);
    setItems(next);
    remember(next, seen);
    setDel(null);
    if (!next.length) setViewAll(false);
  }

  const noteRow = (n) => (
    <div key={n.id} className={styles.ni}>
      <div>
        <span>
          <b>{n.who}</b>
          <span className={`${styles.rb} ${styles[n.role]}`}>{n.roleLabel}</span>
          {n.text}
        </span>
        <small>{fmtTs(n.ts)}</small>
      </div>
      <button type="button" className={styles.x2} aria-label="Delete" onClick={() => setDel({ id: n.id })}>
        <Icon name="trash" size={16} />
      </button>
    </div>
  );

  return (
    <header className={styles.topbar}>
      <div>
        <h1 className={styles.pageTitle}>{title}</h1>
        {showDate && <div className={styles.stamp}>{stamp || ' '}</div>}
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
                  <button type="button" className={styles.x2} aria-label="Delete all" onClick={() => setDel({ all: true })}>
                    <Icon name="trash" size={16} />
                  </button>
                )}
              </div>
              {items.length ? (
                <>
                  {items.slice(0, PREVIEW).map(noteRow)}
                  <div className={styles.viewAll}>
                    <button
                      type="button"
                      className={styles.link}
                      onClick={() => {
                        setMenu(null);
                        setViewAll(true);
                      }}
                    >
                      View all ({items.length})
                    </button>
                  </div>
                </>
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

      {viewAll && (
        <ViewAllDialog title={`All notifications (${items.length})`} onClose={() => setViewAll(false)}>
          {items.map(noteRow)}
        </ViewAllDialog>
      )}

      {del && (del.all || target) && (
        <ConfirmDialog
          title="Are you sure you want to delete?"
          text={
            del.all
              ? `All ${items.length} notifications will be removed.`
              : `"${target.who} ${target.text}" will be removed from your notifications.`
          }
          onYes={confirmDelete}
          onNo={() => setDel(null)}
        />
      )}
    </header>
  );
}