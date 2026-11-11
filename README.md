# Hope, Inc. ERP

A small web-based ERP for the fictitious company Hope, Inc. It keeps customers, products, employees and sales in **one shared database**, with role-based access, soft delete and an audit trail.

**Live demo:** https://soft-eng-scrums-djix8tfji-group-4-7285.vercel.app/
**Next presentation:** December 7, 2026

## Contents
- [About the project](#about-the-project)
- [Modules](#modules)
- [User roles](#user-roles)
- [Progress](#progress)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Team](#team)
- [How we work](#how-we-work)
- [Links](#links)

## About the project
Companies often keep each department's data in separate spreadsheets, so the numbers drift apart and nobody knows which copy is right. Hope, Inc. ERP fixes this by giving every module the **same database**: when Sales records an order, the Customers and Products screens already match it.<br>The system is for the staff of Hope, Inc. Each person signs in and sees only the parts of the system that their role and rights allow. We are Group 4, and we are building it for our Software Engineering class, one sprint at a time.

**What makes it different from a plain list of records:**
- **Role-based access:** This is what you see and what you can do depends on your role (Superadmin, Admin, User) and on the rights an Admin gave you.
- **Checked on the server:** It is more than just hiding a button. Every single page and API route checks the user's rights again, so typing a URL by hand does not get around it.
- **Account approval:** A new sign-up starts as a User and waits until an Admin or Superadmin approves it inside the app.
- **Email:** A confirmation email after registering and an emailed link to reset a forgotten password.
- **Safe passwords and sessions:** Passwords are displayed as  hashed (never stored as plain text), and the login cookie is signed and cannot be read by page scripts.
- **Soft delete:** Deleting a record marks it as Inactive rather than removing it, so an Admin can restore it and the links to other records stay intact.
- **Audit trail:** Every record keeps the latest action, who did it, and when.
- **Reports:** Read-only summaries that you can print or save as PDF.

## Modules
| Module | What it does | Sprint |
|---|---|---|
| User Management | Register, sign in, forgot password, approve users, block users, assign rights | 1 |
| Customers | Customer list with search, add, edit, delete and restore | 2 |
| Products | Product catalogue with price history | 2 |
| Human Resources | Departments, jobs, employees, job history | 3 |
| Sales | Sales with line items, payments, balance | 4 |
| Reports | Seven reports with Print and Save as PDF | 4 |

## User roles
| Role | Who | What they can do |
|---|---|---|
| Superadmin | System owner | Everything, including assigning any role |
| Admin | Manager | Manages most modules and user rights, but can't see or change Superadmin accounts |
| User | Staff | Only the modules and actions an Admin gave them (rights) |

The dashboard menu follows a crucial role: A Superadmin sees every module plus User Management and System Settings, an Admin sees every module plus User Management, and a User sees only the modules they were granted.<br>New accounts start as a User and wait for approval.

## Progress
- [x] Project setup, Supabase database and user tables
- [x] Landing page
- [x] Register and Sign in
- [x] Forgot password with an emailed link
- [ ] Confirmation email after registering
- [ ] Approve users inside the app (Superadmin)
- [ ] User Management and Rights screens
- [ ] Customers and Products
- [ ] Human Resources
- [ ] Sales and Reports

The full task list is in our Planned Tasks sheet, and each task is one pull request.

## Tech stack
- **Next.js** (React) and **Node.js** for the app
- **Supabase** (PostgreSQL) for the database
- **bcryptjs** for password hashing and jose for signed session cookies
- **Nodemailer with Brevo** (SMTP) for sending email
- **Jest** for tests
- **Vercel** for the live demo

## Getting started

### What you need
- **Git**
- **Node.js 20.9+** (LTS version) and npm. Check with `node -v`
- Access to the team's Supabase project (ask Geliz to invite you). Use the **test** project only, never production data.
- A free **Brevo** account, only if you want to send real emails (see Email setup). The app still runs without it, but the emails will not be sent.

### Run the app on your laptop
1. Clone the repository.
2. Open a terminal in the repository root, then go to the web folder:
   ```
   cd web
   ```
3. Install the packages:
   ```
   npm install
   ```
4. Make your local environment file from the example:
   ```
   cp .env.example .env.local
   ```
   On Windows Command Prompt, use:
   ```
   copy .env.example .env.local
   ```
5. Open `.env.local` and fill in the team's Supabase Project URL, publishable key, and the name of an existing database table. **Never commit this file or share the real keys.**
6. Set up the Database (see Database)
7. Start the app:
   ```
   npm run dev
   ```
8. Open http://localhost:3000 in your browser.

### Pages to try
| Page | Address |
|---|---|
| Landing page | http://localhost:3000 |
| Create your account | http://localhost:3000/register |
| Sign in | http://localhost:3000/login |
| Database connection test | http://localhost:3000/api/db-check |

### Environment variables
There are two example files, and each shows the variables with placeholders only:
- `web/.env.example` is for the app.
- `.env.example` in the root is for the database migration script.

Your own `.env.local` (and `.env`) have the real values, so they stay on your laptop and are never committed.

### Database
Run the SQL files in `database/migrations/` one by one, in order. You can safely run them more than once, because they use `IF NOT EXISTS` and `ON CONFLICT DO NOTHING`, so nothing is deleted or duplicated.

Full steps: [Database Setup Instructions](./Database%20Setup%20Instructions.md)

### If something doesn't work
- **The connection test fails:** check the environment variables, the table name, the Supabase API access, and the database permissions.
- **Register says "The default User role is not configured":** the `role` table has no User row yet. Ask Geliz to run the seed data.
- **Changes to `.env.local` don't show:** stop the app and run `npm run dev` again.

## Project structure
```
softEng_scrums/
├── web/                           the Next.js app (screens and API)
├── database/                      SQL migrations and the migration script
├── docs/                          test plan and team documents
├── .github/                       issue and pull request templates
├── DESIGN_SYSTEM.md               colors, fonts, and components
├── Database Setup Instructions.md
└── README.md
```

## Team
| Role | Name | GitHub |
|---|---|---|
| Scrum Master | Kim Aeriel V. Fonseca | @Aevielle |
| UI/UX Developer | Rilaneh Marie L. Acabal | @RilanehMarie |
| Backend Developer | Earl Paolo M. Octoman | @Paolo-Octoman |
| DevSecOps Engineer | Isabel Geliz V. Ramos | @GelizRamos |
| Test Engineer | Franchesca E. Ramirez | @cheesekaramirez |

## How we work
1. Pick your Issue on the board and move it to In Progress.
2. Make a new branch for it from the latest main: `git checkout main`, `git pull`, then `git checkout -b s1-dev-02-register` (use your own task ID). One Issue = one branch = one pull request.
3. Open a pull request when you're done. Write "Closes #(Issue number)" if it finishes the task. If not, write "Related to #(Issue number)".
4. The tester tests it and one teammate reviews it. No review, no merge.
5. The Scrum Master merges it. Nobody pushes straight to main.
6. Update our Planned Tasks sheet: Status and PR link.

If you get stuck, add the **Blocked** label to your Issue and write a comment.

## Links
- [Issues](https://github.com/Aevielle/softEng_scrums/issues)
- [Project board](https://github.com/users/Aevielle/projects/4)
- [Design system](./DESIGN_SYSTEM.md)
- [Docs folder](./docs)