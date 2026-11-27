'use client';

import { useState } from 'react';
import EmployeesTab from './EmployeesTab';
import DepartmentsTab from './DepartmentsTab';
import styles from './hr.module.css';

const SECTIONS = ['Employees', 'Jobs', 'Departments'];

// Employees / Jobs / Departments switcher (Figure 15). Jobs is another ticket (S3-UIX-01 wireframes):
// plug its component in where the placeholder is.
export default function HrClient({ employees, isAdmin, perm, departments, deptPerm }) {
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

      {section === 'Employees' && <EmployeesTab initial={employees} isAdmin={isAdmin} perm={perm} />}
      {section === 'Jobs' && <p className={styles.empty}>The {section} tab is not built yet.</p>}

      {/* S3-DEV-01: kept mounted (just hidden) so rows added / deleted here are still shown after visiting another tab. */}
      <div hidden={section !== 'Departments'}>
        <DepartmentsTab initial={departments} isAdmin={isAdmin} perm={deptPerm} />
      </div>
    </>
  );
}