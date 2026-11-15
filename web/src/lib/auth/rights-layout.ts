/**
 * How the Rights dialog groups and orders rights (Figures 37-40 + Rilaneh Marie's mockup).
 * Values are rights_catalogue.right_id. The dialog reads the NAMES from the database;
 * this file only decides module titles and the order the checkboxes appear in
 * (two columns, filled left-to-right, top-to-bottom).
 *
 * A right that exists in rights_catalogue but is not listed here is still shown,
 * at the end of its module, so a newly added right never silently disappears.
 */
export type ModuleLayout = {
  moduleId: number;
  title: string;
  order: number[];
};

export const RIGHTS_LAYOUT: ModuleLayout[] = [
  { moduleId: 1, title: 'Customer Management', order: [3, 2, 1] },
  { moduleId: 2, title: 'Product Management', order: [9, 8, 7, 6, 5, 4] },
  {
    moduleId: 3,
    title: 'Human Resources',
    order: [22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10],
  },
  { moduleId: 4, title: 'Sales', order: [29, 28, 27, 26, 25, 24, 23] },
  { moduleId: 5, title: 'Reports', order: [36, 32, 35, 31, 34, 30, 33] },
];

/** rights_catalogue.module_id -> the sidebar/page module the user may open. */
export const MODULE_ID_TO_KEY = {
  1: 'customers',
  2: 'products',
  3: 'hr',
  4: 'sales',
  5: 'reports',
} as const;
