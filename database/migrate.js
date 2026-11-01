require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMigrations() {
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    console.error('Error: Missing database credentials in .env file.');
    process.exitCode = 1;
    return;
  }

  const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';

  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized }
  });

  try {
    console.log('Connecting to Supabase database...');
    await client.connect();
    console.log('Connected successfully!');

    const databaseDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(databaseDir)) {
      console.error('Error: Migrations directory not found.');
      process.exitCode = 1;
      return;
    }

    const files = fs.readdirSync(databaseDir)
      .filter(file => file.endsWith('.sql'))
      .sort((a, b) => {
        const numA = parseInt(a.match(/^\d+/)?.[0] || '0', 10);
        const numB = parseInt(b.match(/^\d+/)?.[0] || '0', 10);
        return numA - numB || a.localeCompare(b);
      });

    if (files.length === 0) {
      console.error('Error: No .sql migration files found in database/migrations folder.');
      process.exitCode = 1;
      return;
    }

    // Ensure tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get already applied migrations
    const appliedRes = await client.query('SELECT filename FROM schema_migrations;');
    const appliedFiles = new Set(appliedRes.rows.map(row => row.filename));

    for (const file of files) {
      if (appliedFiles.has(file)) {
        console.log(`Skipping already applied migration: ${file}`);
        continue;
      }

      console.log(`Executing migration file: ${file}...`);
      const filePath = path.join(databaseDir, file);
      const sqlQuery = fs.readFileSync(filePath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sqlQuery);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1);', [file]);
        await client.query('COMMIT');
        console.log(`Successfully executed: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Migration failed on ${file}:`, err.message);
        throw err;
      }
    }

    console.log('All pending database migrations executed successfully!');
  } catch (error) {
    console.error('Migration process failed:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

runMigrations();