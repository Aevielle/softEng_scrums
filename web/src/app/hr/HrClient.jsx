'use client';

import { useState } from 'react';
import EmployeesTab from './EmployeesTab';
import styles from './hr.module.css';

const SECTIONS = ['Employees', 'Jobs', 'Departments'];

// Employees / Jobs / Departments switcher (Figure 15). Jobs and Departments are other tickets (S3-UIX-01 wireframes):
// plug their components in where the placeholder is.
export default function HrClient({ employees, isAdmin, perm }) {
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
      {section !== 'Employees' && <p className={styles.empty}>The {section} tab is not built yet.</p>}
    </>
  );
}