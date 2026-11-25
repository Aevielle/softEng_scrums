import { requirePageAccess } from '@/lib/auth/guard';
import { navGroups } from '@/lib/auth/nav';
import { listEmployees } from '@/lib/employees/service';
import dash from '../dashboard/dashboard.module.css';
import Sidebar from '../dashboard/Sidebar';
import TopBar from '../dashboard/TopBar';
import DashFooter from '../dashboard/DashFooter';
import HrClient from './HrClient';

// NOTE: if S3-DEV-01/02 already created app/hr/page.jsx, keep that file and only add what is marked
// "S3-DEV-03" below: the listEmployees() call and <EmployeesTab ... /> inside its Employees tab.
export default async function HrPage() {
  // Server-side check: anyone without access to the Human Resources module who types /hr is sent back to the
  // dashboard with the "no rights" banner. /api/employees runs the same check again.
  const user = await requirePageAccess('hr');

  // S3-DEV-03: the service decides what each role receives (Admins: all rows + Status/Stamp; Users: Active only).
  const employees = await listEmployees(user);
  const isAdmin = user.role !== 'user';

  return (
    <div className={dash.shell}>
      <div className={dash.orbs} aria-hidden="true">
        <i className={dash.stars} />
        <b className={dash.o1} />
        <b className={dash.o2} />
        <b className={dash.o3} />
      </div>

      <Sidebar groups={navGroups(user)} active="hr" />

      <main className={dash.main}>
        <TopBar
          title="Human Resources"
          role={user.role}
          roleLabel={user.roleLabel}
          firstName={user.firstName}
          email={user.email}
        />
        <HrClient employees={employees} isAdmin={isAdmin} />
        <DashFooter />
      </main>
    </div>
  );
}