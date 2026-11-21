// Per-action rights for Customer Management. These strings must match rights_catalogue.right_name exactly
// (the Rights dialog writes those names into user_permission). One place, so the page, the buttons, the API
// routes and the service can never disagree about what a right is called.
// Admin and Superadmin hold every right (see rightsFor in lib/auth/rights.ts).

export const CUSTOMER_RIGHTS = {
  add: 'Add Customer',
  edit: 'Edit Customer',
  del: 'Delete Customer',
} as const;

export type CustomerRightName = (typeof CUSTOMER_RIGHTS)[keyof typeof CUSTOMER_RIGHTS];
