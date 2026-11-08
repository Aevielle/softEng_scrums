# Database Setup Instructions

Follow these steps to set up your local database, configure environment variables, and run migrations without using Docker.

1. Environment Setup (.env)

   1. Environment Setup

   1. For Database Setup (Root Directory):
      Create a `.env` file in the main project root directory with your database connection credentials (used by `migrate.js`):

      ```env
      DB_HOST=your_supabase_host_here
      DB_PORT=5432
      DB_NAME=postgres
      DB_USER=your_db_user
      DB_PASSWORD=your_db_password
      ```

   2. For Web App Frontend:
      
      Navigate to the `web` folder and copy `web/.env.example` to `web/.env.local` to set up the frontend Supabase keys (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_TEST_TABLE`).

      (Note: Never upload or commit your .env or .env.local files to GitHub to keep your credentials safe.)




2. Install Dependencies:

   Before running the migration script, make sure all required packages are installed by running this command in your terminal:

        npm install

3. Run Migrations:

   To create all the required database tables automatically, run this command in your terminal:
   
         node database/migrate.js

Note: The migration script is fully idempotent. You can re-run it multiple times safely without encountering database errors.

## Summary of Database Setup

### 1. S1-DBA-02: HOPE Base Tables & Sample Data (`005_hope_base_tables_and_sample_data.sql`)
- **What it does:** Builds the core HOPE system tables (`employee`, `department`, `job`, `jobHistory`, `customer`, `sales`, `salesDetail`, `product`, `payment`, and `priceHist`) and populates the initial sample data.
- **Idempotency:** The original `HopeDB_audit.sql` contained `DROP TABLE` statements that would wipe data if re-executed. This script has been modified to handle existing tables safely so running it multiple times will not delete or duplicate existing data.
- **Audit Logging Scope:** The original audit log functionality from Sir's SQL script was extracted and is managed separately under S1-DBA-06.

### 2. S1-DBA-03: User Accounts & Permissions (`002_user_permissions_setup.sql`)
- **What it does:** Creates the authentication and permission tables (`app_user`, `role`, `module`, rights catalogue, and `user_permission`).
- **Key Features:**
  - `app_user` contains fields for first name, last name, unique email, password hash, role, and a `blocked` flag.
  - `user_permission` implements **soft delete** functionality (marking records as inactive rather than permanently removing rows).
- **Idempotency:** Safe to run multiple times without corrupting existing structures.

### 3. S1-DBA-06: Audit Logging & User Tracking System (`006_s1_dba_06_audit_log.sql`)
- **What it does:** Tracks table modifications (`ADD`, `EDIT`, `DELETE`) and logs *who* performed each action via the `audit_user()` session function and `trg_audit_log` triggers.
- **Session User Context:** Reads the user ID from `app.current_user_id`. When testing triggers manually in the Supabase SQL Editor, set the current session user beforehand:
  ```sql
  SET LOCAL app.current_user_id = '1';