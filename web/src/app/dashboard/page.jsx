import Link from 'next/link';
import { requirePageAccess } from '@/lib/auth/guard';
import { MODULES } from '@/lib/auth/permissions';
import styles from './dashboard.module.css';
import FlashToast from '../FlashToast';
import Icon from './Icon';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import SideWidgets from './SideWidgets';
import ActivityList from './ActivityList';
import { SalesChart, ProductChart } from './Charts';

// ---------------------------------------------------------------------------
// SAMPLE DATA from the prototype (Student Guide, 3.2). Replace with real queries later,
// e.g. SELECT COUNT(*) FROM customer WHERE status='Active'.
// ---------------------------------------------------------------------------
const STATS = [
  { label: 'Total Customers', value: '1,248', note: '↑ 12% this month' },
  { label: 'Products', value: '386', note: '↑ 5 new this week' },
  { label: 'Open Orders', value: '94', note: '↑ 8% vs last week' },
  { label: 'Revenue (MTD)', value: '₱84.2k', note: '↑ 18% vs last month' },
];

// Quick Actions subtitles
const SUB = {
  customers: '4 active customers',
  products: '4 in catalog',
  hr: '3 employees',
  sales: '3 open orders',
  users: '5 accounts',
  settings: 'Company and access',
};
const ADMIN_SUMMARY = '5 accounts · 0 pending · 0 blocked';

const SALES = [['2026-10-01', 234.5], ['2026-10-05', 140], ['2026-10-08', 510]];
const BY_PRODUCT = [['P-001', 412.5], ['P-005', 235], ['P-003', 140], ['P-002', 97]];
const SALES_DAYS = SALES.map((s) => s[0]);

// Placeholder activity until an activity log table exists.
const SAMPLE_OTHERS = [
  { id: 'o1', who: 'Kim', role: 'user', roleLabel: 'User', text: 'requested access: Add Price', mins: 20 },
  { id: 'o2', who: 'Geliz', role: 'admin', roleLabel: 'Admin', text: 'updated rights for Kim', mins: 75 },
  { id: 'o3', who: 'Kim', role: 'user', roleLabel: 'User', text: 'edited customer C-002', mins: 130 },
];

const BANNER = {
  superadmin: 'You have full system access. You can manage all modules and assign rights.',
  admin: 'You can manage most modules and user rights (except Superadmin accounts).',
  user: 'You have access to the core modules assigned to you. Contact an Admin for elevated permissions.',
};

// "▲ 177% vs previous week": total of the latest week against the week before it
function weekTrend(rows) {
  const weekStart = (date) => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  };
  const weeks = {};
  rows.forEach(([date, v]) => {
    const k = weekStart(date);
    weeks[k] = (weeks[k] || 0) + v;
  });
  const keys = Object.keys(weeks).sort();
  const cur = weeks[keys[keys.length - 1]] || 0;
  const prev = weeks[keys[keys.length - 2]];
  return prev ? Math.round(((cur - prev) / prev) * 100) : null;
}

export default async function DashboardPage({ searchParams }) {
  // Server-side check. No key: every signed-in user may see the dashboard.
  // Every module page must call requirePageAccess('<key>') the same way, and every API route
  // must run authorizeApi('<key>'), so typing a URL or calling the API directly is refused.
  const user = await requirePageAccess();
  const { denied } = await searchParams;
  const isAdmin = user.role !== 'user';

  // Only what this person may open is ever sent to the browser.
  const groups = [
    { heading: 'Modules', items: MODULES.filter((m) => m.section === 'modules' && user.allowed.has(m.key)) },
    { heading: 'Administration', items: MODULES.filter((m) => m.section === 'admin' && user.allowed.has(m.key)) },
  ]
    .filter((g) => g.items.length > 0)
    .map((g) => ({ heading: g.heading, items: g.items.map(({ key, href, label }) => ({ key, href, label })) }));

  // Business modules are always shown as tiles (greyed out if not allowed), as in Figure 8.
  // Admin tiles only appear for people who may use them.
  const tiles = MODULES.filter((m) => m.section === 'modules' || user.allowed.has(m.key));
  const deniedModule = MODULES.find((m) => m.key === denied);

  const business = MODULES.filter((m) => m.section === 'modules');
  const granted = business.filter((m) => user.allowed.has(m.key)).length;
  const summary = isAdmin ? ADMIN_SUMMARY : `${granted} of ${business.length} modules granted`;

  const pct = weekTrend(SALES);
  const trend =
    pct === null ? 'No earlier week to compare' : `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct)}% vs previous week`;

  const ago = (mins) => new Date(Date.now() - mins * 60000).toISOString();
  const others = isAdmin ? SAMPLE_OTHERS.map((o) => ({ ...o, ts: ago(o.mins) })) : [];
  const activity = [
    { id: 'me', who: user.firstName, role: user.role, roleLabel: user.roleLabel, text: 'signed in', ts: new Date().toISOString() },
    ...others,
  ];

  return (
    <div className={styles.shell}>
      <FlashToast welcome={{ title: 'Signed in', message: `Welcome, ${user.firstName}` }} />

      <div className={styles.orbs} aria-hidden="true">
        <i className={styles.stars} />
        <b className={styles.o1} />
        <b className={styles.o2} />
        <b className={styles.o3} />
      </div>

      <Sidebar groups={groups} />

      <main className={styles.main}>
        <TopBar
          title="Dashboard"
          role={user.role}
          roleLabel={user.roleLabel}
          firstName={user.firstName}
          email={user.email}
          notes={others}
        />

        {deniedModule && (
          <div className={styles.denied} role="alert">
            You do not have rights to open {deniedModule.label}.
          </div>
        )}

        <div className={styles.layout}>
          <div className={styles.left}>
            <section className={`${styles.banner} ${styles.rise}`} style={{ '--d': 0 }}>
              <h2>Welcome back, {user.firstName}!</h2>
              <p>{BANNER[user.role]}</p>
            </section>

            <section className={`${styles.stats} ${styles.rise}`} style={{ '--d': 1 }} aria-label="Overview">
              {STATS.map((s) => (
                <div key={s.label} className={styles.stat}>
                  <span>{s.label}</span>
                  <strong>{s.value}</strong>
                  <small>{s.note}</small>
                </div>
              ))}
            </section>

            <section className={`${styles.card} ${styles.rise}`} style={{ '--d': 2 }}>
              <div className={styles.cardHead}>
                <h3>Quick Actions</h3>
                <span className={styles.muted0}>{summary}</span>
              </div>
              <div className={styles.tiles}>
                {tiles.map((m, i) =>
                  user.allowed.has(m.key) ? (
                    <Link key={m.key} href={m.href} className={`${styles.tile} ${styles[`p${(i % 4) + 1}`]}`}>
                      <div>
                        <b>{m.action}</b>
                        <p className={styles.sub}>{SUB[m.key]}</p>
                      </div>
                      <span className={styles.go}><Icon name="up" size={18} /></span>
                    </Link>
                  ) : (
                    <span
                      key={m.key}
                      className={`${styles.tile} ${styles[`p${(i % 4) + 1}`]} ${styles.locked}`}
                      aria-disabled="true"
                      title="You do not have rights for this module"
                    >
                      <div>
                        <b>{m.action}</b>
                        <p className={styles.sub}>No access yet</p>
                      </div>
                      <span className={styles.go}><Icon name="lock" size={18} /></span>
                    </span>
                  )
                )}
              </div>
            </section>

            <div className={styles.charts}>
              <section className={`${styles.card} ${styles.rise}`} style={{ '--d': 3 }}>
                <div className={styles.cardHead}>
                  <h3>Sales overview</h3>
                  <span className={`${styles.tr} ${pct !== null && pct < 0 ? styles.dn : ''}`}>{trend}</span>
                </div>
                <SalesChart data={SALES.map(([d, v]) => [d.slice(5), v])} />
              </section>
              <section className={`${styles.card} ${styles.rise}`} style={{ '--d': 4 }}>
                <div className={styles.cardHead}><h3>Revenue by product</h3></div>
                <ProductChart data={BY_PRODUCT} />
              </section>
            </div>
          </div>

          <div className={styles.right}>
            <SideWidgets salesDays={SALES_DAYS} />
            <section className={`${styles.card} ${styles.rise}`} style={{ '--d': 3 }}>
              <ActivityList items={activity} />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}