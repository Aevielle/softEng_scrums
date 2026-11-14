import { requirePageAccess } from '@/lib/auth/guard';
import { navGroups } from '@/lib/auth/nav';
import { listUsers } from '@/lib/users/service';
import dash from '../dashboard/dashboard.module.css';
import Sidebar from '../dashboard/Sidebar';
import TopBar from '../dashboard/TopBar';
import UsersClient from './UsersClient';

export default async function UsersPage() {
  // Server-side check: a User (or anyone without the "users" right) who types /users is sent
  // back to the dashboard with the "no rights" banner. The API routes check again.
  const user = await requirePageAccess('users');
  const rows = await listUsers(user); // Admins never receive Superadmin rows

  const intro =
    user.role === 'superadmin'
      ? 'Superadmin: manage all accounts and assign roles.'
      : 'Admin: manage Users only. Superadmin accounts are hidden and cannot be modified.';

  return (
    <div className={dash.shell}>
      <div className={dash.orbs} aria-hidden="true">
        <i className={dash.stars} />
        <b className={dash.o1} />
        <b className={dash.o2} />
        <b className={dash.o3} />
      </div>

      <Sidebar groups={navGroups(user)} active="users" />

      <main className={dash.main}>
        <TopBar
          title="User Management"
          role={user.role}
          roleLabel={user.roleLabel}
          firstName={user.firstName}
          email={user.email}
        />
        <UsersClient initial={rows} actor={{ id: user.id, role: user.role }} intro={intro} />
      </main>
    </div>
  );
}