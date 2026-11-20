# Module and Feature Plan

Hope, Inc. ERP is planned across four sprints of two weeks each. The schedule below breaks
each module into the features that need to be implemented.

| Module | Sprint | Weeks | What we build |
|---|---|---|---|
| User Management | Sprint 1 | 1 to 2 | Register, login, forgot password, user list, approve users, rights |
| Customers | Sprint 2 | 3 to 4 | Customer list, add and edit, delete and restore |
| Products | Sprint 2 | 3 to 4 | Product list, add and edit, delete and restore, price history |
| Human Resources | Sprint 3 | 5 to 6 | Departments, jobs, employees, job history |
| Sales | Sprint 4 | 7 to 8 | Sales and line items, payments, balance |
| Reports | Sprint 4 | 7 to 8 | The seven reports, with Print and Save as PDF |

## Feature implementation schedule

| Sprint | Features to implement | Expected result |
|---|---|---|
| Sprint 1 | Landing page; registration; confirmation email; sign in and sign out; forgot-password and reset-password flow; session and route protection; dashboard; user list; approve and block/unblock users; assign roles and rights; server-side permission checks | A protected application where approved users see only the modules and actions allowed by their role and rights |
| Sprint 2 | Customer search/list; customer add and edit; customer soft delete and restore; product search/list; product add and edit; product soft delete and restore; product price history | Customers and products can be maintained without permanently deleting records, and product price changes remain traceable |
| Sprint 3 | Department management; job management; employee management; employee soft delete and restore; employee job history | HR records are linked consistently and changes to an employee's job are recorded |
| Sprint 4 | Sales headers and line items; payment recording; balance calculation; seven reports (Top Customers, Top Products, All Employees, Top Sales, Product Master List, Active Employees, Employee Job History); report print and PDF output; audit-log viewer; System Settings | Sales can be recorded and reconciled, management can generate reports, and authorized administrators can review system activity and settings |

### Cross-module requirements

These requirements apply whenever a feature is implemented:

- Enforce role and right checks in both the UI and the server/API.
- Use soft delete and restore for records that other modules may reference.
- Record the acting user and timestamp for auditable changes.
- Add focused unit, integration, and end-to-end tests for the feature and its role restrictions.
- Update the relevant wireframes, database migration, issue, and test documentation in the same sprint.

## Notes
- For the November 9 presentation we focus on Login and Sign Up first (landing page, register, sign in, forgot password).
- The audit log viewer is in Sprint 4 too.
- Sprint 1 also has the main page and the rights, so the other modules can use them later.
