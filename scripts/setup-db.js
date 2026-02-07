/**
 * Database setup script
 * Creates the database and runs migrations
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  console.log('🚀 Starting database setup...');

  // Parse DATABASE_URL or use individual environment variables
  const databaseUrl = process.env.DATABASE_URL;
  let dbConfig;

  if (databaseUrl) {
    const url = new URL(databaseUrl);
    dbConfig = {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      user: url.username,
      password: url.password,
      database: url.pathname.slice(1), // Remove leading slash
    };
  } else {
    dbConfig = {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT) || 5432,
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD,
      database: 'postgres', // Connect to default database first
    };
  }

  const targetDatabase = 'claude_ui';

  try {
    // Connect to PostgreSQL server (default database)
    const client = new Client({
      ...dbConfig,
      database: 'postgres',
    });

    await client.connect();
    console.log('✅ Connected to PostgreSQL server');

    // Check if database exists
    const result = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [targetDatabase]
    );

    if (result.rowCount === 0) {
      // Create database
      console.log(`📦 Creating database: ${targetDatabase}`);
      await client.query(`CREATE DATABASE ${targetDatabase}`);
      console.log(`✅ Database ${targetDatabase} created successfully`);
    } else {
      console.log(`✅ Database ${targetDatabase} already exists`);
    }

    await client.end();

    // Connect to the target database and run migrations
    const targetClient = new Client({
      ...dbConfig,
      database: targetDatabase,
    });

    await targetClient.connect();
    console.log(`✅ Connected to database: ${targetDatabase}`);

    // Read and execute migration file
    const migrationPath = path.join(
      __dirname,
      '../db/migrations/001_initial_schema.sql'
    );
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Running migrations...');
    await targetClient.query(migrationSQL);
    console.log('✅ Migrations completed successfully');

    await targetClient.end();

    console.log('🎉 Database setup completed!');
    console.log(`\nYou can now connect to the database:`);
    console.log(`  Database: ${targetDatabase}`);
    console.log(`  Host: ${dbConfig.host}`);
    console.log(`  Port: ${dbConfig.port}`);
    console.log(`  User: ${dbConfig.user}`);
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

// Run the setup
setupDatabase();
