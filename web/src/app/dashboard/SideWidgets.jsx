'use client';

import { useEffect, useState } from 'react';
import Icon from './Icon';
import styles from './dashboard.module.css';

// Clock + calendar from the mockup's right-hand column. Client side only (needs the browser clock).
// `salesDays` is a list of 'YYYY-MM-DD' strings to shade.
export default function SideWidgets({ salesDays = [] }) {
  const [now, setNow] = useState(null);
  const [view, setView] = useState(null); // { y, m }

  useEffect(() => {
    const d = new Date();
    setNow(d);
    setView({ y: d.getFullYear(), m: d.getMonth() });
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  if (!now || !view) return <div className={styles.clockBox} aria-hidden="true" />;

  const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const date = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const day = now.getHours() >= 6 && now.getHours() < 18;

  const first = new Date(view.y, view.m, 1);
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // week starts Monday
  const shaded = new Set(salesDays);
  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(<i key={`b${i}`} />);
  for (let d = 1; d <= days; d++) {
    const key = `${view.y}-${String(view.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = now.getFullYear() === view.y && now.getMonth() === view.m && now.getDate() === d;
    cells.push(
      <span key={d} className={isToday ? styles.today : shaded.has(key) ? styles.sold : ''}>{d}</span>
    );
  }

  const move = (n) =>
    setView(({ y, m }) => {
      const t = new Date(y, m + n, 1);
      return { y: t.getFullYear(), m: t.getMonth() };
    });

  return (
    <>
      <div className={`${styles.clockBox} ${styles.rise}`} style={{ '--d': 1 }}>
        <div>
          <b>{time}</b>
          <span>{date}</span>
        </div>
        <div className={styles.wx}>
          <Icon name={day ? 'sun' : 'moon'} size={34} />
          <small>{day ? 'Daytime' : 'Night'}</small>
        </div>
      </div>

      <section className={`${styles.card} ${styles.rise}`} style={{ '--d': 2 }} aria-label="Calendar">
        <div className={styles.cardHead}>
          <b>{first.toLocaleString([], { month: 'long', year: 'numeric' })}</b>
          <span className={styles.calNav}>
            <button type="button" onClick={() => move(-1)} aria-label="Previous month"><Icon name="chev" size={16} /></button>
            <button type="button" onClick={() => move(1)} aria-label="Next month" className={styles.flip}><Icon name="chev" size={16} /></button>
          </span>
        </div>
        <div className={styles.cal}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <u key={d}>{d}</u>)}
          {cells}
        </div>
        <p className={styles.muted}>Shaded days have sales.</p>
      </section>
    </>
  );
}