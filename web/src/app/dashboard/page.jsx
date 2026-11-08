import Link from 'next/link';
import { requirePageAccess } from '@/lib/auth/guard';
import { MODULES } from '@/lib/auth/permissions';
import styles from './dashboard.module.css';
import LogoutButton from './LogoutButton';

// Sample numbers from the prototype (Student Guide, 3.2).
// Real version: one query per card, e.g. SELECT COUNT(*) FROM customer WHERE status='Active'.
const STATS = [
  { label: 'Total Customers', value: '1,248', note: 'Active accounts' },
  { label: 'Products', value: '386', note: 'In catalogue' },
  { label: 'Open Orders', value: '94', note: 'Awaiting fulfilment' },
  { label: 'Revenue (MTD)', value: '$84.2k', note: 'Month to date' },
];

const BANNER = {
  superadmin: 'You have full system access. You can manage all modules and assign rights.',
  admin: 'You can manage most modules and user rights (except Superadmin accounts).',
  user: 'You have access to the core modules assigned to you. Contact an Admin for elevated permissions.',
};

export default async function DashboardPage({ searchParams }) {
  const user = await requirePageAccess(); // no key: every signed-in user may see the dashboard
  const { denied } = await searchParams;

  const sidebarModules = MODULES.filter((m) => m.section === 'modules' && user.allowed.has(m.key));
  const sidebarAdmin = MODULES.filter((m) => m.section === 'admin' && user.allowed.has(m.key));

  // Business modules are always shown as tiles (greyed out if not allowed), as in Figure 8.
  // Admin tiles only appear for people who may use them.
  const tiles = MODULES.filter((m) => m.section === 'modules' || user.allowed.has(m.key));

  const deniedModule = MODULES.find((m) => m.key === denied);

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.logo}>H</span> Hope, Inc. ERP
        </div>

        <nav aria-label="Main">
          <Link href="/dashboard" className={`${styles.navItem} ${styles.active}`}>Dashboard</Link>

          {sidebarModules.length > 0 && <p className={styles.navHeading}>Modules</p>}
          {sidebarModules.map((m) => (
            <Link key={m.key} href={m.href} className={styles.navItem}>{m.label}</Link>
          ))}

          {sidebarAdmin.length > 0 && <p className={styles.navHeading}>Administration</p>}
          {sidebarAdmin.map((m) => (
            <Link key={m.key} href={m.href} className={styles.navItem}>{m.label}</Link>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <LogoutButton />
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <h1>Dashboard</h1>
          <span className={styles.roleBadge}>{user.roleLabel}</span>
        </header>

        {deniedModule && (
          <div className={styles.denied} role="alert">
            You do not have rights to open {deniedModule.label}.
          </div>
        )}

        <section className={styles.banner}>
          <h2>Welcome back, {user.firstName}!</h2>
          <p>{BANNER[user.role]}</p>
        </section>

        <section className={styles.stats} aria-label="Overview">
          {STATS.map((s) => (
            <div key={s.label} className={styles.stat}>
              <span>{s.label}</span>
              <strong>{s.value}</strong>
              <small>{s.note}</small>
            </div>
          ))}
        </section>

        <section>
          <h3 className={styles.sectionTitle}>Quick Actions</h3>
          <div className={styles.tiles}>
            {tiles.map((m) =>
              user.allowed.has(m.key) ? (
                <Link key={m.key} href={m.href} className={styles.tile}>{m.action}</Link>
              ) : (
                <span key={m.key} className={`${styles.tile} ${styles.locked}`} aria-disabled="true"
                      title="You do not have rights for this module">
                  {m.action}
                </span>
              )
            )}
          </div>
        </section>
      </main>
    </div>
  );
}