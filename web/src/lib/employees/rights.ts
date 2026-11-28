// Per-action rights for Employees. These strings must match rights_catalogue.right_name exactly
// (the Rights dialog writes those names into user_permission). One place, so the page, the buttons,
// the API routes and the service can never disagree about what a right is called.
// Admin and Superadmin hold every right (see rightsFor in lib/auth/rights.ts).

export const EMPLOYEE_RIGHTS = {
  add: 'Add Employee',
  edit: 'Edit Employee',
  delete: 'Delete Employee', // S3-DEV-05. Restore has no right of its own: Admin / Superadmin only (like Jobs and Departments).
} as const;

export type EmployeeRightName = (typeof EMPLOYEE_RIGHTS)[keyof typeof EMPLOYEE_RIGHTS];