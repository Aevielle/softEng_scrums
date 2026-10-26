require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMigrations() {
  if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD) {
    console.error('Error: Missing database credentials in .env file.');
    process.exit(1);
  }

  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Supabase database...');
    await client.connect();
    console.log('Connected successfully!');

    const databaseDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(databaseDir)) {
      console.log('No migrations directory found.');
      return;
    }

    const files = fs.readdirSync(databaseDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No .sql migration files found in database/migrations folder.');
      return;
    }

    for (const file of files) {
      console.log(`Executing migration file: ${file}...`);
      const filePath = path.join(databaseDir, file);
      const sqlQuery = fs.readFileSync(filePath, 'utf8');

      await client.query(sqlQuery);
      console.log(`Finished executing: ${file}`);
    }

    console.log('All database migrations executed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();