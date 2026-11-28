'use client';

import { useState } from 'react';
import EmployeesTab from './EmployeesTab';
import DepartmentsTab from './DepartmentsTab';
import JobsTab from './JobsTab';
import styles from './hr.module.css';

const SECTIONS = ['Employees', 'Jobs', 'Departments'];

// Employees / Jobs / Departments switcher (Figure 15).
export default function HrClient({ employees, isAdmin, perm, histPerm, departments, deptPerm, jobs, jobPerm }) {
  const [section, setSection] = useState('Employees');

  return (
    <>
      <div className={styles.sections} role="tablist" aria-label="Human Resources sections">
        {SECTIONS.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={section === s}
            className={section === s ? styles.on : ''}
            onClick={() => setSection(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {section === 'Employees' && <EmployeesTab initial={employees} isAdmin={isAdmin} perm={perm} histPerm={histPerm} />}

      {/* S3-DEV-01 / S3-DEV-02: kept mounted (just hidden) so rows added / deleted here are still shown after visiting another tab. */}
      <div hidden={section !== 'Jobs'}>
        <JobsTab initial={jobs} isAdmin={isAdmin} perm={jobPerm} />
      </div>

      <div hidden={section !== 'Departments'}>
        <DepartmentsTab initial={departments} isAdmin={isAdmin} perm={deptPerm} />
      </div>
    </>
  );
}