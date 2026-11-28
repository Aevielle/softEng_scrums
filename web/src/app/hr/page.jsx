import { requirePageAccess } from '@/lib/auth/guard';
import { navGroups } from '@/lib/auth/nav';
import { rightsFor } from '@/lib/auth/rights';
import { listEmployees } from '@/lib/employees/service';
import { EMPLOYEE_RIGHTS } from '@/lib/employees/rights';
import { listDepartments } from '@/lib/departments/service';
import { DEPARTMENT_RIGHTS } from '@/lib/departments/rights';
import { listJobs } from '@/lib/jobs/service';
import { JOB_RIGHTS } from '@/lib/jobs/rights';
import dash from '../dashboard/dashboard.module.css';
import Sidebar from '../dashboard/Sidebar';
import TopBar from '../dashboard/TopBar';
import DashFooter from '../dashboard/DashFooter';
import HrClient from './HrClient';

// NOTE: if S3-DEV-01/02 already created app/hr/page.jsx, keep that file and only add what is marked
// "S3-DEV-03" / "S3-DEV-04" below: the listEmployees() call, the perm object, and <EmployeesTab ... /> inside its Employees tab.
export default async function HrPage() {
  // Server-side check: anyone without access to the Human Resources module who types /hr is sent back to the
  // dashboard with the "no rights" banner. /api/employees runs the same check again.
  const user = await requirePageAccess('hr');

  // S3-DEV-03: the service decides what each role receives (Admins: all rows + Status/Stamp; Users: Active only).
  const employees = await listEmployees(user);
  const isAdmin = user.role !== 'user';

  // S3-DEV-04: which buttons to show. Admins hold every right; a User only the ones ticked in the Rights dialog.
  // This only hides buttons: /api/employees checks the same rights again before anything is saved.
  const rights = await rightsFor(user);
  const perm = { add: rights.has(EMPLOYEE_RIGHTS.add), edit: rights.has(EMPLOYEE_RIGHTS.edit) };

  // S3-DEV-01: same idea for Departments. Admins: every row + Status/Stamp; Users: Active rows only.
  // Restore is Admin / Superadmin only (no right of its own). /api/departments checks everything again.
  const departments = await listDepartments(user);
  const deptPerm = {
    add: rights.has(DEPARTMENT_RIGHTS.add),
    edit: rights.has(DEPARTMENT_RIGHTS.edit),
    del: rights.has(DEPARTMENT_RIGHTS.delete),
    restore: isAdmin,
  };

  // S3-DEV-02: same idea for Jobs. Admins: every row + Status/Stamp; Users: Active rows only.
  // Restore is Admin / Superadmin only (no right of its own). /api/jobs checks everything again.
  const jobs = await listJobs(user);
  const jobPerm = {
    add: rights.has(JOB_RIGHTS.add),
    edit: rights.has(JOB_RIGHTS.edit),
    del: rights.has(JOB_RIGHTS.delete),
    restore: isAdmin,
  };

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
        <HrClient
          employees={employees}
          isAdmin={isAdmin}
          perm={perm}
          departments={departments}
          deptPerm={deptPerm}
          jobs={jobs}
          jobPerm={jobPerm}
        />
        <DashFooter />
      </main>
    </div>
  );
}