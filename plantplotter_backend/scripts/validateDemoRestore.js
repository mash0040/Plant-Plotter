// Called only by validateFreshDatabase.js inside its disposable MySQL container.
const assert = require('node:assert/strict');
const { loadDemoSeed } = require('../utils/demoSeedData');

module.exports = async function validateDemoRestore(db, request, runRestore) {
  await db.query('USE garden_plotter');
  const seed = loadDemoSeed();
  const [[originalDemo]] = await db.query('SELECT password_hash FROM users WHERE id = 1');
  // Normal users now own the original seed IDs. The new demo ID must be discovered.
  await db.query("UPDATE users SET email = 'original-owner@example.com' WHERE id = 1");
  await db.execute('INSERT INTO users (id, username, email, password_hash, is_active) VALUES (7, ?, ?, ?, TRUE)',
    ['Demo User', 'demo@plantplotter.com', originalDemo.password_hash]);

  const allRows = async () => {
    const result = {};
    for (const table of ['users', 'user_sessions', 'plant_library', 'gardens', 'planted_items', 'garden_tasks', 'garden_activities']) {
      result[table] = (await db.query(`SELECT * FROM ${table} ORDER BY id`))[0];
    }
    return result;
  };
  const unchangedRows = async () => {
    const rows = await allRows();
    const normalGardenIds = new Set(rows.gardens.filter(row => row.user_id !== 7).map(row => row.id));
    return {
      ...rows,
      gardens: rows.gardens.filter(row => row.user_id !== 7),
      planted_items: rows.planted_items.filter(row => normalGardenIds.has(row.garden_id)),
      garden_tasks: rows.garden_tasks.filter(row => row.user_id !== 7),
      garden_activities: rows.garden_activities.filter(row => row.user_id !== 7)
    };
  };
  const addTemporaryData = async () => {
    const [garden] = await db.query("INSERT INTO gardens (user_id, name, width, height) VALUES (7, 'Visitor experiment', 4, 4)");
    await db.execute("INSERT INTO planted_items (garden_id, plant_id, plant_name, x_position, y_position) VALUES (?, 'basil', 'Changed basil', 1, 1)", [garden.insertId]);
    await db.execute("INSERT INTO garden_tasks (user_id, garden_id, title, task_type, due_date) VALUES (7, ?, 'Visitor task', 'water', '2026-09-15')", [garden.insertId]);
    await db.execute("INSERT INTO garden_activities (user_id, garden_id, activity_type, activity_date) VALUES (7, ?, 'watered', '2026-09-15')", [garden.insertId]);
  };
  const assertCanonical = async () => {
    const gardens = (await db.query('SELECT * FROM gardens WHERE user_id = 7'))[0];
    const gardenMap = new Map(gardens.map(row => [row.id, Number(row.demo_showcase_key.split('-')[1])]));
    for (const [table, expected] of Object.entries(seed)) {
      const [rows] = table === 'planted_items'
        ? await db.query('SELECT plant.* FROM planted_items plant JOIN gardens garden ON garden.id = plant.garden_id WHERE garden.user_id = 7')
        : await db.query(`SELECT * FROM ${table} WHERE user_id = 7`);
      const normalize = row => Object.fromEntries(Object.keys(expected[0]).filter(key => key !== 'id').map(key => {
        let value = row[key];
        if (key === 'user_id') value = 7;
        if (key === 'garden_id' && row.user_id !== 'seed') value = gardenMap.get(value);
        if (value instanceof Date) value = value.toISOString().slice(0, 10);
        if (typeof value === 'boolean') value = Number(value);
        return [key, value];
      }));
      const actual = rows.map(normalize).map(JSON.stringify).sort();
      const wanted = expected.map(row => normalize({ ...row, user_id: 'seed' })).map(JSON.stringify).sort();
      assert.deepEqual(actual, wanted, `${table}: canonical content and relationships must be restored`);
    }
  };

  await addTemporaryData();
  const unaffected = await unchangedRows();
  await runRestore();
  await assertCanonical();
  assert.deepEqual(await unchangedRows(), unaffected, 'Restore must preserve accounts, normal users, and catalogue');

  // Edits, deletion, and additional demo data must all converge to the same content.
  await db.query("UPDATE gardens SET name = 'Changed', width = 1 WHERE user_id = 7");
  await db.query("DELETE FROM gardens WHERE user_id = 7 AND demo_showcase_key = 'garden-1'");
  await db.query("UPDATE garden_tasks SET title = 'Changed', status = 'cancelled' WHERE user_id = 7");
  await db.query("UPDATE garden_activities SET notes = 'Changed history' WHERE user_id = 7");
  await addTemporaryData();
  await runRestore();
  await assertCanonical();
  assert.deepEqual(await unchangedRows(), unaffected);

  // A real SQL failure after deletion must restore every old row, including IDs/times.
  await db.query("CREATE TRIGGER reject_demo_restore BEFORE INSERT ON garden_tasks FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Injected restore failure'");
  const beforeFailure = await allRows();
  await runRestore(1);
  assert.deepEqual(await allRows(), beforeFailure, 'Failed restore must roll back all data changes');
  await db.query('DROP TRIGGER reject_demo_restore');
  const [[transactions]] = await db.query('SELECT COUNT(*) AS count FROM information_schema.innodb_trx');
  assert.equal(transactions.count, 0, 'Restore must not leave an open transaction');

  const [[demoGarden]] = await db.query('SELECT id FROM gardens WHERE user_id = 7 LIMIT 1');
  const [foreignTask] = await db.execute("INSERT INTO garden_tasks (user_id, garden_id, title, task_type, due_date) VALUES (1, ?, 'Foreign owner', 'water', '2026-09-15')", [demoGarden.id]);
  const inconsistent = await allRows();
  await runRestore(1);
  assert.deepEqual(await allRows(), inconsistent, 'Cross-owner data must be refused without cascade deletion');
  await db.execute('DELETE FROM garden_tasks WHERE id = ?', [foreignTask.insertId]);

  await db.query("UPDATE users SET email = 'missing-demo@example.com' WHERE id = 7");
  const missingOwner = await allRows();
  await runRestore(1);
  assert.deepEqual(await allRows(), missingOwner, 'Missing demo must not create or alter an account');
  await db.query("UPDATE users SET email = 'demo@plantplotter.com' WHERE id = 7");
  const beforeEmptyRestore = await unchangedRows();
  await db.query('DELETE FROM gardens WHERE user_id = 7');
  await runRestore();
  await runRestore();
  await assertCanonical();
  assert.deepEqual(await unchangedRows(), beforeEmptyRestore);

  const login = await request('/auth/login', { email: 'demo@plantplotter.com', password: 'demo123' });
  assert.equal(login.body.user.isProtectedDemo, true);
  for (const [route, count] of [['gardens', 5], ['tasks', 23], ['activities', 40]]) {
    const response = await request(`/${route}`, null, login.cookie);
    assert.equal(response.body.length, count);
    assert.ok(response.body.every(row => row.isDeletionProtected === true));
  }
  await request('/auth/logout', {}, login.cookie);
  console.log('PASS: demo restore CLI, repeated/empty recovery, rollback, normal-user preservation, login and deletion protection');
};
