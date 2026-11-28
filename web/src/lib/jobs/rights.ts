// Per-action rights for Jobs. These strings must match rights_catalogue.right_name exactly
// (the Rights dialog writes those names into user_permission). One place, so the page, the buttons,
// the API routes and the service can never disagree about what a right is called.
// Admin and Superadmin hold every right (see rightsFor in lib/auth/rights.ts).
//
// Restore has no right of its own: only an Admin or a Superadmin may restore, whatever a User has been ticked for.

export const JOB_RIGHTS = {
  add: 'Add Job',
  edit: 'Edit Job',
  delete: 'Delete Job',
} as const;

export type JobRightName = (typeof JOB_RIGHTS)[keyof typeof JOB_RIGHTS];