# Database Setup Instructions

Follow these steps to set up your local database and run migrations without using Docker:

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

## User & Permissions Schema (`002_user_permissions_setup.sql`)
- **`role`**: Defines user roles across the system.
- **`app_user`**: Stores user authentication data (first_name, last_name, unique email, password_hash, role_id, and is_blocked flag).
- **`module`**: Tracks system modules for access control.
- **`rights_catalogue`**: Stores permission rights associated with system modules.
- **`user_permission`**: Maps users to specific rights with **soft delete** support (`is_deleted` and `deleted_at`).