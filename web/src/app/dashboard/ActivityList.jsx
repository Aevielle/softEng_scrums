'use client';

import { useState } from 'react';
import Icon from './Icon';
import ConfirmDialog from './ConfirmDialog';
import ViewAllDialog from './ViewAllDialog';
import { fmtTs } from './format';
import styles from './dashboard.module.css';

const PREVIEW = 4; // rows shown on the dashboard; "View all" opens the rest

export default function ActivityList({ items }) {
  const [list, setList] = useState(items);
  const [ask, setAsk] = useState(null); // { id } = one row, { all: true } = every row, null = no pop-up
  const [viewAll, setViewAll] = useState(false);

  const target = ask && !ask.all ? list.find((x) => x.id === ask.id) : null;

  function confirmDelete() {
    const next = ask.all ? [] : list.filter((x) => x.id !== ask.id);
    setList(next);
    setAsk(null);
    if (!next.length) setViewAll(false);
  }

  const row = (e, i) => (
    <div key={e.id} className={`${styles.activity} ${styles[`p${(i % 4) + 1}`]}`}>
      <div>
        <b>
          <span>{e.who}</span>
          <span className={`${styles.rb} ${styles[e.role]}`}>{e.roleLabel}</span>
          {e.text}
        </b>
        <time dateTime={e.ts} suppressHydrationWarning>{fmtTs(e.ts)}</time>
      </div>
      <button type="button" className={styles.x2} aria-label="Delete" onClick={() => setAsk({ id: e.id })}>
        <Icon name="trash" size={16} />
      </button>
    </div>
  );

  return (
    <>
      <div className={styles.cardHead}>
        <h3>Recent activity</h3>
        {list.length > 0 && (
          <button type="button" className={styles.x2} aria-label="Delete all" onClick={() => setAsk({ all: true })}>
            <Icon name="trash" size={16} />
          </button>
        )}
      </div>

      {list.length ? (
        <>
          {list.slice(0, PREVIEW).map(row)}
          <div className={styles.viewAll}>
            <button type="button" className={styles.link} onClick={() => setViewAll(true)}>
              View all ({list.length})
            </button>
          </div>
        </>
      ) : (
        <p className={styles.muted}>No activity yet. Things done in the system will show up here.</p>
      )}

      {viewAll && (
        <ViewAllDialog title={`All activity (${list.length})`} onClose={() => setViewAll(false)}>
          {list.map(row)}
        </ViewAllDialog>
      )}

      {ask && (ask.all || target) && (
        <ConfirmDialog
          title="Are you sure you want to delete?"
          text={
            ask.all
              ? `All ${list.length} recent activities will be removed from this list.`
              : `"${target.who} ${target.text}" will be removed from your recent activity.`
          }
          onYes={confirmDelete}
          onNo={() => setAsk(null)}
        />
      )}
    </>
  );
}
