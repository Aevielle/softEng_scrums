// The per-action rights for Product Management. These strings must match rights_catalogue.right_name
// exactly (the Rights dialog writes those names into user_permission). One place, so the page, the
// API routes and the buttons can never disagree about what a right is called.
// Admin and Superadmin hold every right (see rightsFor in lib/auth/rights.ts).

export const PRODUCT_RIGHTS = {
  add: 'Add Product',
  edit: 'Edit Product',
  del: 'Delete Product',
} as const;