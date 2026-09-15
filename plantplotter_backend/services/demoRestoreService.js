const { loadDemoSeed } = require('../utils/demoSeedData');
const { isProtectedDemoAccount } = require('../utils/protectedDemoAccount');

const restoreError = message => Object.assign(new Error(message), { code: 'DEMO_RESTORE_REFUSED' });

const restoreDemoData = async (pool) => {
  // Validate the canonical dataset before connecting or deleting anything.
  const seed = loadDemoSeed();
  const connection = await pool.getConnection();
  let transaction = false;
  try {
    await connection.execute('SET SESSION innodb_lock_wait_timeout = 10');
    const [[settings]] = await connection.execute('SELECT @@SESSION.foreign_key_checks AS foreignKeys');
    if (settings.foreignKeys !== 1) throw restoreError('Restore requires foreign-key checks to be enabled.');
    const [tables] = await connection.execute(
      "SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('users', 'gardens', 'planted_items', 'garden_tasks', 'garden_activities')"
    );
    if (tables.length !== 5 || tables.some(table => table.ENGINE !== 'InnoDB')) {
      throw restoreError('Restore requires the current InnoDB application schema.');
    }
    // A plain read avoids locking unrelated users while finding the reserved identity.
    const [candidates] = await connection.execute(
      "SELECT id FROM users WHERE LOWER(TRIM(email)) = 'demo@plantplotter.com'"
    );
    if (candidates.length !== 1) throw restoreError('Expected exactly one existing demo account. No account was created or changed.');
    const userId = candidates[0].id;
    await connection.beginTransaction();
    transaction = true;
    const [users] = await connection.execute('SELECT id, email, is_active FROM users WHERE id = ? FOR UPDATE', [userId]);
    if (users.length !== 1 || !isProtectedDemoAccount(users[0]) || !users[0].is_active) {
      throw restoreError('The demo account is missing, inactive, or changed identity.');
    }
    // The owner lock serializes restores and blocks new FK-linked demo inserts.
    await connection.execute('SELECT id FROM gardens WHERE user_id = ? FOR UPDATE', [userId]);
    for (const table of ['garden_tasks', 'garden_activities']) {
      const [rows] = await connection.execute(
        `SELECT record.user_id, garden.user_id AS garden_owner
         FROM ${table} record JOIN gardens garden ON garden.id = record.garden_id
         WHERE record.user_id = ? OR garden.user_id = ? FOR UPDATE`, [userId, userId]
      );
      if (rows.some(row => row.user_id !== userId || row.garden_owner !== userId)) {
        throw restoreError('Tracker ownership is inconsistent. Resolve it before restoring the demo.');
      }
    }
    // Explicit owner-scoped deletes, with foreign keys enabled throughout.
    await connection.execute('DELETE FROM garden_tasks WHERE user_id = ?', [userId]);
    await connection.execute('DELETE FROM garden_activities WHERE user_id = ?', [userId]);
    await connection.execute('DELETE plant FROM planted_items plant JOIN gardens garden ON garden.id = plant.garden_id WHERE garden.user_id = ?', [userId]);
    await connection.execute('DELETE FROM gardens WHERE user_id = ?', [userId]);

    const gardenIds = new Map();
    for (const [table, rows] of Object.entries(seed)) {
      for (const row of rows) {
        const { id, ...data } = row;
        if (Object.hasOwn(data, 'user_id')) data.user_id = userId;
        if (Object.hasOwn(data, 'garden_id')) data.garden_id = gardenIds.get(data.garden_id);
        const columns = Object.keys(data);
        const [result] = await connection.execute(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')})`,
          columns.map(column => data[column])
        );
        if (table === 'gardens') gardenIds.set(id, result.insertId);
      }
    }
    await connection.commit();
    transaction = false;
    return Object.fromEntries(Object.entries(seed).map(([table, rows]) => [table, rows.length]));
  } catch (error) {
    if (transaction) {
      try { await connection.rollback(); }
      catch { connection.destroy(); }
    }
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = { restoreDemoData };
