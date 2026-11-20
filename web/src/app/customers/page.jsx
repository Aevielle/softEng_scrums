import { requirePageAccess } from '@/lib/auth/guard';
import { navGroups } from '@/lib/auth/nav';
import { rightsFor } from '@/lib/auth/rights';
import { listCustomers } from '@/lib/customers/service';
import dash from '../dashboard/dashboard.module.css';
import Sidebar from '../dashboard/Sidebar';
import TopBar from '../dashboard/TopBar';
import DashFooter from '../dashboard/DashFooter';
import CustomersClient from './CustomersClient';

export default async function CustomersPage() {
  // Server-side check: anyone without the "customers" right who types /customers is sent back to the
  // dashboard with the "no rights" banner. /api/customers runs the same check again.
  const user = await requirePageAccess('customers');

  // The service decides what each role receives: Admins get all rows plus Status/Stamp,
  // a User gets Active rows with four columns only.
  const rows = await listCustomers(user);
  const isAdmin = user.role !== 'user';

  // Which buttons to show. Admins hold every right; a User only the ones ticked in the Rights dialog.
  // This only hides buttons: /api/customers checks the same rights again before anything is saved.
  // (Delete is built in the next ticket.)
  const rights = await rightsFor(user);
  const perm = { add: rights.has('Add Customer'), edit: rights.has('Edit Customer'), del: rights.has('Delete Customer') };

  return (
    <div className={dash.shell}>
      <div className={dash.orbs} aria-hidden="true">
        <i className={dash.stars} />
        <b className={dash.o1} />
        <b className={dash.o2} />
        <b className={dash.o3} />
      </div>

      <Sidebar groups={navGroups(user)} active="customers" />

      <main className={dash.main}>
        <TopBar
          title="Customer Management"
          role={user.role}
          roleLabel={user.roleLabel}
          firstName={user.firstName}
          email={user.email}
        />
        <CustomersClient initial={rows} isAdmin={isAdmin} perm={perm} />
        <DashFooter />
      </main>
    </div>
  );
}
