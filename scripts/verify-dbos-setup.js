/**
 * Verify DBOS Setup
 * Checks that DBOS is properly configured and initialized
 */

const { Client } = require('pg');

async function verifyDBOSSetup() {
  console.log('🔍 Verifying DBOS setup...\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL ||
      'postgresql://dmap_user:dmap_dev_password@localhost:5432/dmap'
  });

  try {
    await client.connect();
    console.log('✅ Database connection successful');

    // Check for DBOS schema
    const schemaCheck = await client.query(`
      SELECT schema_name
      FROM information_schema.schemata
      WHERE schema_name = 'dbos'
    `);

    if (schemaCheck.rows.length > 0) {
      console.log('✅ DBOS schema exists');

      // Check for DBOS tables
      const tablesCheck = await client.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'dbos'
        ORDER BY table_name
      `);

      console.log(`✅ Found ${tablesCheck.rows.length} DBOS tables:`);
      tablesCheck.rows.forEach(row => {
        console.log(`   - dbos.${row.table_name}`);
      });
    } else {
      console.log('❌ DBOS schema not found');
      console.log('   Run: npm run dbos:migrate');
    }

    console.log('\n✅ DBOS setup verification complete!');
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyDBOSSetup().catch(console.error);
