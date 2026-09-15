const path = require('node:path');
const mysql = require('mysql2/promise');
const { buildDatabasePoolConfig } = require('../config/databasePoolConfig');
const { restoreDemoData } = require('../services/demoRestoreService');

async function main(args = process.argv.slice(2)) {
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: npm run demo:restore --workspace=plantplotter_backend');
    console.log('Replaces all shared demo garden/planner/tracker data, including visitor records, using the configured backend database. Accounts and normal-user data are preserved.');
    return;
  }
  if (args.length) throw new Error('Unknown restore argument. Use --help for usage.');
  require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
  for (const name of ['DB_HOST', 'DB_USER', 'DB_NAME']) {
    if (!process.env[name]?.trim()) throw new Error(`${name} must be configured before running the restore.`);
  }
  const config = buildDatabasePoolConfig();
  const pool = mysql.createPool({ ...config, connectionLimit: 1, maxIdle: 1 });
  try {
    console.log(`Restoring shared demo data in ${config.database} on ${config.host}:${config.port}...`);
    const counts = await restoreDemoData(pool);
    console.log(`Restore committed: ${counts.gardens} gardens, ${counts.planted_items} plants, ${counts.garden_tasks} tasks, ${counts.garden_activities} activities.`);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch(error => {
    // Avoid printing SQL, connection configuration, or credentials on operational failures.
    console.error(error.code === 'DEMO_RESTORE_REFUSED' || !error.code
      ? `Restore failed: ${error.message}`
      : `Restore failed (${error.code}). Check the database connection/schema and ensure other transactions have finished.`);
    process.exitCode = 1;
  });
}

module.exports = { main };
