import { requirePageAccess } from '@/lib/auth/guard';
import { navGroups } from '@/lib/auth/nav';
import { accessOptionsFor, getOwnProfile, listMine } from '@/lib/requests/service';
import dash from '../dashboard/dashboard.module.css';
import Sidebar from '../dashboard/Sidebar';
import TopBar from '../dashboard/TopBar';
import DashFooter from '../dashboard/DashFooter';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  // Every signed-in account has a profile, so no module key. Server-side check still applies.
  const user = await requirePageAccess();

  // Demo sessions have no app_user row: show the page, but nothing can be saved or sent.
  const demo = user.id === null;
  const [me, requests, access] = demo
    ? [{ firstName: user.firstName, lastName: '', email: user.email }, [], []]
    : await Promise.all([
        getOwnProfile(user.id),
        listMine(user.id),
        user.role === 'user' ? accessOptionsFor(user.id) : [],
      ]);

  return (
    <div className={dash.shell}>
      <div className={dash.orbs} aria-hidden="true">
        <i className={dash.stars} />
        <b className={dash.o1} />
        <b className={dash.o2} />
        <b className={dash.o3} />
      </div>

      <Sidebar groups={navGroups(user)} active="profile" />

      <main className={dash.main}>
        <TopBar
          title="My Profile"
          role={user.role}
          roleLabel={user.roleLabel}
          firstName={user.firstName}
          email={user.email}
        />
        <ProfileClient
          me={me}
          role={user.role}
          roleLabel={user.roleLabel}
          initialRequests={requests}
          accessOptions={access}
          demo={demo}
        />
        <DashFooter />
      </main>
    </div>
  );
}
