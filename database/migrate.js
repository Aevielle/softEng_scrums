require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMigrations() {
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    console.error('Error: Missing database credentials in .env file.');
    process.exit(1);
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
      process.exit(1);
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
      process.exit(1);
    }

    for (const file of files) {
      console.log(`Executing migration file: ${file}...`);
      const filePath = path.join(databaseDir, file);
      const sqlQuery = fs.readFileSync(filePath, 'utf8');
      await client.query(sqlQuery);
      console.log(`Successfully executed: ${file}`);
    }

    console.log('All migrations completed successfully.');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();