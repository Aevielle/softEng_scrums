// Per-action rights for Job History. These strings must match rights_catalogue.right_name exactly
// (the Rights dialog writes those names into user_permission). One place, so the page, the buttons,
// the API routes and the service can never disagree about what a right is called.
// Admin and Superadmin hold every right (see rightsFor in lib/auth/rights.ts).
//
// "View" is a right of its own on purpose: birth dates and salaries are personal data (Data Privacy Act of 2012,
// RA 10173), so who may SEE job history is decided separately from who may change it (guide section 3.8).

export const JOBHISTORY_RIGHTS = {
  view: 'View Job History',
  add: 'Add Job History',
  edit: 'Edit Job History',
  delete: 'Delete Job History',
} as const;

export type JobHistoryRightName = (typeof JOBHISTORY_RIGHTS)[keyof typeof JOBHISTORY_RIGHTS];
