// Explicit integration check: owns a disposable Docker database, never reads .env.
const assert = require('node:assert/strict');
const { execFile, spawn } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const { once } = require('node:events');
const { readFileSync, mkdtempSync, rmdirSync } = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { promisify } = require('node:util');
const mysql = require('mysql2/promise');

const run = promisify(execFile);
const databaseDir = path.resolve(__dirname, '../../plantplotter_db');
const read = (file) => readFileSync(path.join(databaseDir, file), 'utf8');
const container = `plantplotter-schema-${randomBytes(6).toString('hex')}`;
const password = randomBytes(24).toString('hex');
const workDir = mkdtempSync(path.join(os.tmpdir(), 'plantplotter-schema-'));
const docker = (args, options = {}) => run('docker', args, {
  windowsHide: true, timeout: 180000, maxBuffer: 4 * 1024 * 1024, ...options
});
let db;
let backend;
let backendClosed;
let created = false;
let backendOutput = '';

async function eventually(check, description) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await check()) return;
    await delay(250);
  }
  throw new Error(`Timed out waiting for ${description}`);
}

async function freePort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function importSql(sql) {
  // Use the MySQL client so DELIMITER-based migration files are also tested as shipped.
  const child = spawn('docker', ['exec', '-i', '-e', `MYSQL_PWD=${password}`, container,
    'mysql', '--default-character-set=utf8mb4', '-uroot'], { windowsHide: true });
  let errors = '';
  child.stdout.resume();
  child.stderr.on('data', chunk => { errors += chunk; });
  child.stdin.on('error', () => {}); // Exit code below reports a failed import.
  child.stdin.end(sql);
  const [code] = await once(child, 'close');
  assert.equal(code, 0, `MySQL import failed: ${errors}`);
}

async function snapshot() {
  const [columns] = await db.query(`SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE,
    IS_NULLABLE, COLUMN_DEFAULT, CHARACTER_SET_NAME FROM information_schema.columns
    WHERE TABLE_SCHEMA = 'garden_plotter'
    AND COLUMN_NAME NOT IN ('password_reset_token', 'password_reset_expires')
    ORDER BY TABLE_NAME, COLUMN_NAME`);
  const [indexes] = await db.query(`SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME
    FROM information_schema.statistics WHERE TABLE_SCHEMA = 'garden_plotter'
    ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`);
  const [checks] = await db.query(`SELECT CONSTRAINT_NAME, CHECK_CLAUSE
    FROM information_schema.check_constraints WHERE CONSTRAINT_SCHEMA = 'garden_plotter'
    ORDER BY CONSTRAINT_NAME`);
  return { columns, indexes, checks };
}

async function stopBackend() {
  if (!backend) return;
  if (backend.exitCode === null) backend.kill();
  await backendClosed;
  backend = null;
}

async function validateDemo(request) {
  const demoSection = readFileSync(path.resolve(databaseDir, '../README.md'), 'utf8')
    .split('## Demo')[1]?.split('## ')[0];
  assert.ok(demoSection, 'README must document the demo account');
  const email = demoSection.match(/- Email:\s*(\S+)/)?.[1];
  const demoPassword = demoSection.match(/- Password:\s*(\S+)/)?.[1];
  assert.ok(email);
  assert.ok(demoPassword);
  const [users] = await db.query('SELECT id, email, role, preferences FROM garden_plotter.users');
  assert.equal(users.length, 1, 'Seed must create only the required demo user');
  assert.equal(users[0].id, 1);
  assert.equal(users[0].email, email);
  assert.equal(users[0].role, 'user');
  assert.equal(users[0].preferences, null);

  const demo = await request('/auth/login', { email, password: demoPassword });
  assert.ok(demo.cookie, 'Documented demo credentials must issue a session');
  assert.equal(demo.body.user.isProtectedDemo, true);
  const profile = await request('/users/profile', null, demo.cookie);
  assert.equal(profile.body.preferences, null);
  const gardens = (await request('/gardens', null, demo.cookie)).body;
  assert.ok(gardens.length >= 5, 'Demo account must see the showcase gardens');
  const totals = { plants: 0, tasks: 0, activities: 0 };
  for (const garden of gardens) {
    assert.equal(garden.isDeletionProtected, true);
    assert.ok(!Object.hasOwn(garden, 'demo_showcase_key'));
    await request(`/gardens/${garden.id}`, null, demo.cookie);
    const plants = (await request(`/gardens/${garden.id}/plants`, null, demo.cookie)).body;
    assert.ok(plants.length > 0, `${garden.name}: planner must have planted items`);
    totals.plants += plants.length;
    for (const route of ['tasks', 'activities']) {
      const records = (await request(`/${route}?gardenId=${garden.id}`, null, demo.cookie)).body;
      assert.ok(records.length > 0, `${garden.name}: tracker must have ${route}`);
      assert.ok(records.every(record => record.garden_id === garden.id && record.user_id === users[0].id),
        `${garden.name}: ${route} must belong to the demo user and selected garden`);
      totals[route] += records.length;
      assert.ok(records.every(record => record.isDeletionProtected === true && !Object.hasOwn(record, 'demo_showcase_key')));
      const blocked = await request(`/${route}/${records[0].id}`, {}, demo.cookie, 403, 'DELETE');
      assert.equal(blocked.body.code, 'DEMO_DATA_PROTECTED');
    }
    const blocked = await request(`/gardens/${garden.id}`, {}, demo.cookie, 403, 'DELETE');
    assert.equal(blocked.body.code, 'DEMO_DATA_PROTECTED');
  }
  assert.ok(totals.plants >= 65 && totals.tasks >= 23 && totals.activities >= 40,
    'Demo API must expose the populated showcase dataset');
  const experiment = await request('/gardens', { name: 'Demo experiment', width: 4, height: 4 }, demo.cookie, 201);
  assert.equal(experiment.body.isDeletionProtected, false);
  await request(`/gardens/${experiment.body.id}`, {}, demo.cookie, 200, 'DELETE');
  const summaries = (await request('/gardens/summary', null, demo.cookie)).body;
  assert.equal(summaries.length, 5);
  assert.ok(summaries.every(garden => garden.isDeletionProtected));
  for (const [table, expected] of [['gardens', 5], ['planted_items', 65], ['garden_tasks', 23], ['garden_activities', 40]]) {
    const [[row]] = await db.query(`SELECT COUNT(*) AS count FROM garden_plotter.${table}`);
    assert.equal(row.count, expected, `${table}: blocked requests must preserve all canonical data`);
  }
  await request('/auth/logout', {}, demo.cookie);
  console.log('PASS: documented demo login, unset preferences, and populated garden/planner/tracker API data');
}

async function validateAuth(port) {
  const api = `http://127.0.0.1:${port}/api`;
  const request = async (route, body, cookie, expected = 200, method) => {
    const response = await fetch(`${api}${route}`, {
      method: method || (body ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1', ...(cookie ? { Cookie: cookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(5000)
    });
    assert.equal(response.status, expected, `${route}: unexpected HTTP status`);
    const result = await response.json();
    return { body: result, cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };
  await eventually(async () => {
    if (backend.exitCode !== null) throw new Error('Backend exited before becoming ready');
    try { return (await fetch(`${api}/health`, { signal: AbortSignal.timeout(1000) })).ok; }
    catch { return false; }
  }, 'backend startup');

  await validateDemo(request);

  const email = 'schema-check@example.com';
  const oldPassword = 'SchemaCheck!2026';
  const newPassword = 'SchemaChanged!2026';
  const registered = await request('/auth/register', { username: 'Schema Check', email, password: oldPassword }, null, 201);
  assert.ok(registered.cookie, 'Registration must issue a session cookie');
  const loggedIn = await request('/auth/login', { email, password: oldPassword });
  assert.ok(loggedIn.cookie, 'Login must issue a session cookie');
  await request('/auth/verify', null, loggedIn.cookie);
  await request('/auth/forgot-password', { email });
  await eventually(() => /Dev reset link: (\S+)/.test(backendOutput), 'development reset link');
  const token = new URL(backendOutput.match(/Dev reset link: (\S+)/)[1]).searchParams.get('token');
  const [rows] = await db.execute('SELECT reset_password_token_hash, reset_password_expires, session_version FROM garden_plotter.users WHERE email = ?', [email]);
  const { createHash } = require('node:crypto');
  assert.equal(rows[0].reset_password_token_hash, createHash('sha256').update(token).digest('hex'));
  assert.ok(rows[0].reset_password_expires > new Date());
  assert.equal(rows[0].session_version, 0);
  await request('/auth/reset-password', { token: 'invalid', password: newPassword, confirmPassword: newPassword }, null, 400);
  await request('/auth/reset-password', { token, password: newPassword, confirmPassword: newPassword });
  const [resetRows] = await db.execute('SELECT reset_password_token_hash, reset_password_expires, session_version FROM garden_plotter.users WHERE email = ?', [email]);
  assert.equal(resetRows[0].reset_password_token_hash, null);
  assert.equal(resetRows[0].reset_password_expires, null);
  assert.equal(resetRows[0].session_version, 1);
  await request('/auth/verify', null, loggedIn.cookie, 401);
  await request('/auth/verify', null, registered.cookie, 401);
  await request('/auth/login', { email, password: oldPassword }, null, 401);
  const newLogin = await request('/auth/login', { email, password: newPassword });
  await request('/auth/verify', null, newLogin.cookie);
  const ownGarden = await request('/gardens', { name: 'Personal experiment', width: 4, height: 4 }, newLogin.cookie, 201);
  for (const [route, body] of [
    ['tasks', { garden_id: ownGarden.body.id, title: 'Water basil', due_date: '2099-01-01', task_type: 'water' }],
    ['activities', { garden_id: ownGarden.body.id, activity_type: 'watered' }]
  ]) {
    const created = await request(`/${route}`, body, newLogin.cookie, 201);
    assert.equal(created.body.isDeletionProtected, false);
    await request(`/${route}/${created.body.id}`, {}, newLogin.cookie, 200, 'DELETE');
  }
  await request(`/gardens/${ownGarden.body.id}`, {}, newLogin.cookie, 200, 'DELETE');
  await request('/auth/reset-password', { token, password: newPassword, confirmPassword: newPassword }, null, 400);
  console.log('PASS: backend registration, login, password reset, token consumption, and session revocation');
}

async function main() {
  console.log('Starting disposable MySQL 8.4 (Docker may download the image)...');
  await docker(['run', '--detach', '--rm', '--name', container, '--publish', '127.0.0.1::3306',
    '--env', `MYSQL_ROOT_PASSWORD=${password}`, '--env', 'MYSQL_ROOT_HOST=%', 'mysql:8.4']);
  created = true;
  const { stdout } = await docker(['port', container, '3306/tcp']);
  const dbPort = Number(stdout.trim().split(':').pop());
  await eventually(async () => {
    try {
      db = await mysql.createConnection({ host: '127.0.0.1', port: dbPort, user: 'root', password, connectTimeout: 1000 });
      return true;
    } catch { return false; }
  }, 'MySQL startup');

  const schema = read('plantPlotterSchema.sql');
  await importSql(schema);
  await importSql(read('data_instance.sql'));
  const expected = await snapshot();
  for (const name of ['users', 'gardens', 'planted_items', 'garden_activities', 'garden_tasks', 'plant_library']) {
    const [rows] = await db.query(`SELECT COUNT(*) AS count FROM garden_plotter.${name}`);
    assert.ok(rows[0].count > 0, `Seed must populate ${name}`);
  }
  console.log('PASS: fresh schema and demo seed imported with no migrations');

  const apiPort = await freePort();
  backend = spawn(process.execPath, [path.resolve(__dirname, '../server.js')], {
    cwd: workDir, windowsHide: true,
    env: { ...process.env, NODE_ENV: 'test', PORT: String(apiPort), JWT_SECRET: randomBytes(32).toString('hex'),
      DB_HOST: '127.0.0.1', DB_PORT: String(dbPort), DB_USER: 'root', DB_PASSWORD: password,
      DB_NAME: 'garden_plotter', DB_SSL: 'false', DB_SSL_CA_PATH: '', DB_CONNECT_TIMEOUT_MS: '2000',
      EMAIL_PROVIDER: '', EMAIL_FROM: '', RESEND_API_KEY: '', SENDGRID_API_KEY: '',
      PASSWORD_RESET_BASE_URL: 'http://localhost:3000/reset-password' }
  });
  backendClosed = once(backend, 'close');
  backend.stdout.on('data', chunk => { backendOutput += chunk; });
  backend.stderr.on('data', chunk => { backendOutput += chunk; });
  await validateAuth(apiPort);
  await stopBackend();

  const repeatable = ['password_reset_migration.sql', 'performance_indexes.sql', 'task_type_options_migration.sql'];
  for (const file of repeatable) await importSql(read(file));
  assert.deepEqual(await snapshot(), expected, 'Repeatable upgrades must preserve fresh definitions');

  // Reconstruct the established pre-migration definitions inside this owned container.
  let older = schema
    .replace(/    demo_showcase_key[^\n]*\n/g, '')
    .replace(/    UNIQUE KEY uq_\w+_demo_showcase[^\n]*\n/g, '')
    .replace(/    (?:session_version|notes VARCHAR\(2000\)|reset_password_token_hash|reset_password_expires)[^\n]*\n/g, '')
    .replace(/    INDEX (?:idx_users_reset_password_token_hash|idx_plant_library_name|idx_plant_library_category_name|idx_gardens_user_updated|idx_planted_items_garden_created|idx_garden_activities_user_garden_date_time|idx_garden_tasks_user_garden_due)[^\n]*\n/g, '')
    .replace(/    CONSTRAINT chk_task_recurrence CHECK \([\s\S]+?\n    \),\r?\n/, '')
    .replace("'treat', 'other', ", '')
    .replace('is_recurring BOOLEAN NOT NULL DEFAULT FALSE', 'is_recurring BOOLEAN DEFAULT FALSE')
    .replace('    last_login TIMESTAMP NULL,', '    password_reset_token VARCHAR(255),\n    password_reset_expires TIMESTAMP NULL,\n    last_login TIMESTAMP NULL,')
    .replace(/,\r?\n\)/g, '\n)');
  assert.notEqual(older, schema);
  await db.query('DROP DATABASE garden_plotter'); // Only the newly created container is reachable here.
  await importSql(older);
  const legacySeed = read('data_instance.sql')
    .replace(/demo_showcase_key, /g, '')
    .replace(/\('(?:garden|task|activity)-\d+', /g, '(');
  await importSql(legacySeed);
  // The demo owner need not be user 1. Keep a separate normal account/data set.
  await db.query("UPDATE garden_plotter.users SET email = 'normal@example.com' WHERE id = 1");
  await db.query("INSERT INTO garden_plotter.users (id, username, email, password_hash) VALUES (7, 'Demo', '  DEMO@plantplotter.com  ', 'test-only-hash')");
  for (const table of ['gardens', 'garden_tasks', 'garden_activities']) {
    await db.query(`UPDATE garden_plotter.${table} SET user_id = 7 WHERE user_id = 1`);
  }
  // Include normal-owned IDs inside the seed ranges: IDs alone must never mark them.
  await db.query('UPDATE garden_plotter.gardens SET user_id = 1 WHERE id = 5');
  for (const table of ['garden_tasks', 'garden_activities']) {
    await db.query(`UPDATE garden_plotter.${table} SET user_id = 1 WHERE garden_id = 5`);
  }
  await db.query("INSERT INTO garden_plotter.gardens (id, user_id, name, width, height) VALUES (900, 1, 'Normal garden', 4, 4)");
  await db.query("INSERT INTO garden_plotter.garden_tasks (id, user_id, garden_id, title, due_date, task_type) VALUES (900, 1, 900, 'Normal task', '2026-09-15', 'water')");
  await db.query("INSERT INTO garden_plotter.garden_activities (id, user_id, garden_id, activity_type, activity_date) VALUES (900, 1, 900, 'watered', '2026-09-15')");
  const originalRows = {};
  for (const table of ['gardens', 'garden_tasks', 'garden_activities']) {
    originalRows[table] = (await db.query(`SELECT id, user_id, created_at, updated_at FROM garden_plotter.${table} ORDER BY id`))[0];
  }
  await importSql(read('demo_showcase_protection_migration.sql'));
  for (const [table, prefix, count] of [['gardens', 'garden', 5], ['garden_tasks', 'task', 23], ['garden_activities', 'activity', 40]]) {
    const [rows] = await db.query(`SELECT id, user_id, created_at, updated_at, demo_showcase_key FROM garden_plotter.${table} ORDER BY id`);
    assert.deepEqual(rows.map(({ demo_showcase_key, ...row }) => row), originalRows[table], `${table}: migration preserves ownership and timestamps`);
    assert.equal(rows.filter(row => row.demo_showcase_key).length, originalRows[table].filter(row => row.user_id === 7 && row.id <= count).length);
    assert.ok(rows.every(row => row.demo_showcase_key === (row.user_id === 7 ? `${prefix}-${row.id}` : null)));
  }
  console.log('PASS: showcase migration scopes to stored demo owner and preserves normal data/timestamps');
  await db.query("UPDATE garden_plotter.users SET password_reset_token = 'legacy-marker' WHERE id = 1");
  await db.query("UPDATE garden_plotter.garden_tasks SET is_recurring = FALSE WHERE recurring_pattern = 'daily'");
  for (const file of ['password_reset_migration.sql', 'session_version_migration.sql', 'task_notes_migration.sql',
    'task_type_options_migration.sql', 'task_recurrence_migration.sql', 'performance_indexes.sql']) {
    await importSql(read(file));
  }
  assert.deepEqual(await snapshot(), expected, 'Upgraded definitions must match fresh schema');
  for (const file of repeatable) await importSql(read(file));
  assert.deepEqual(await snapshot(), expected, 'Repeated upgrades must preserve definitions');
  const [legacy] = await db.query('SELECT password_reset_token, reset_password_token_hash, session_version FROM garden_plotter.users WHERE id = 1');
  assert.equal(legacy[0].password_reset_token, 'legacy-marker');
  assert.equal(legacy[0].reset_password_token_hash, null);
  assert.equal(legacy[0].session_version, 0);
  const [tasks] = await db.query("SELECT is_recurring, notes FROM garden_plotter.garden_tasks WHERE recurring_pattern = 'daily'");
  assert.ok(tasks.length);
  assert.ok(tasks.every(task => task.is_recurring === 1 && task.notes === null));
  console.log('PASS: older-schema upgrades, definition parity, data preservation, and repeatable migrations');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(async () => {
  await stopBackend();
  if (db) await db.end();
  if (created) await docker(['rm', '--force', '--volumes', container]);
  rmdirSync(workDir);
  console.log('Disposable validation resources removed.');
});
