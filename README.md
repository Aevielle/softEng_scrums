# Group 4

A small, database-driven Enterprise Resource Planning (ERP) web system for the fictitious company Hope, Inc. It keeps customers, products, employees and sales in one place, with role-based access, soft delete and an audit trail.

## Right now
We're on **Sprint 1: Login and Sign Up** (landing page, register, sign in, forgot password). We present it on **November 9, 2026**.

## Team
| Role | Name | GitHub |
|---|---|---|
| Scrum Master | Kim Aeriel V. Fonseca | @Aevielle |
| UI/UX Developer | Rilaneh Marie L. Acabal | @RilanehMarie |
| Backend Developer | Earl Paolo M. Octoman | @Paolo-Octoman |
| DevSecOps Engineer | Isabel Geliz V. Ramos | @GelizRamos |
| Test Engineer | Franchesca E. Ramirez | @cheesekaramirez |

## Sprint progress
- [Issues](https://github.com/Aevielle/softEng_scrums/issues)
- [Project board](https://github.com/users/Aevielle/projects/4)

## Local Development Setup

### Prerequisites
- Node.js (LTS version recommended)
- npm
- Access to the team's existing Supabase project

### Setup
1. Clone the repository.
2. Open a terminal in the repository root.
3. Navigate to the web application directory:

   ```bash
   cd web
   ```

4. Install dependencies:

   ```bash
   npm install
   ```

5. Create a local environment file by copying the example:

   ```bash
   cp .env.example .env.local
   ```

   On Windows Command Prompt, use:

   ```cmd
   copy .env.example .env.local
   ```

6. Update `.env.local` with the team's Supabase Project URL, publishable key, and the name of an existing database table. Never commit this file or share its real credentials publicly.

7. Start the development server:

   ```bash
   npm run dev
   ```

8. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Connection Test
With the development server running, visit:

[http://localhost:3000/api/db-check](http://localhost:3000/api/db-check)

A successful response confirms that the application can perform the configured read-only database test. If the test fails, verify the environment variables, table name, Supabase API access, and database permissions.

### Environment Variables
The `web/.env.example` file documents the required environment variables using placeholders. The local `web/.env.local` file contains machine-specific values and must not be committed to Git.
