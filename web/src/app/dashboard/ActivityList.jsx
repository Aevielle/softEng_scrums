'use client';

import { useState } from 'react';
import Icon from './Icon';
import { fmtTs } from './format';
import styles from './dashboard.module.css';

export default function ActivityList({ items }) {
  const [list, setList] = useState(items);

  return (
    <>
      <div className={styles.cardHead}>
        <h3>Recent activity</h3>
        {list.length > 0 && (
          <button type="button" className={styles.x2} aria-label="Delete all" onClick={() => setList([])}>
            <Icon name="trash" size={16} />
          </button>
        )}
      </div>

      {list.length ? (
        list.map((e, i) => (
          <div key={e.id} className={`${styles.activity} ${styles[`p${(i % 4) + 1}`]}`}>
            <div>
              <b>
                <span>{e.who}</span>
                <span className={`${styles.rb} ${styles[e.role]}`}>{e.roleLabel}</span>
                {e.text}
              </b>
              <time dateTime={e.ts} suppressHydrationWarning>{fmtTs(e.ts)}</time>
            </div>
            <button
              type="button"
              className={styles.x2}
              aria-label="Delete"
              onClick={() => setList((l) => l.filter((x) => x.id !== e.id))}
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        ))
      ) : (
        <p className={styles.muted}>No activity yet. Things done in the system will show up here.</p>
      )}
    </>
  );
}