const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-only-demo-data-secret';
process.env.NODE_ENV = 'test';

let records;
let queries;
let lookupError;
const users = [{ id: 7, email: '  DEMO@plantplotter.com  ' }, { id: 12, email: 'gardener@example.com' }];
const fixtures = [
  { table: 'gardens', route: 'gardens', key: 'garden-1', id: 81,
    fields: { name: 'Renamed garden', width: 8, height: 6, soil_type: 'Loamy', status: 'Active' } },
  { table: 'garden_tasks', route: 'tasks', key: 'task-1', id: 82,
    fields: { garden_id: 81, title: 'Renamed task', task_type: 'water', due_date: '2099-01-01', status: 'pending', is_recurring: false, recurring_pattern: null } },
  { table: 'garden_activities', route: 'activities', key: 'activity-1', id: 83,
    fields: { garden_id: 81, activity_type: 'watered', activity_date: '2026-09-15', plant_name: 'Basil' } }
];

// Real routers/authentication, with a stateful DB double that rejects unknown SQL.
const execute = async (raw, params) => {
  const sql = raw.replace(/\s+/g, ' ').trim();
  if (sql === 'SELECT session_version FROM users WHERE id = ? AND is_active = TRUE') {
    return [users.filter(user => user.id === params[0]).map(() => ({ session_version: 0 }))];
  }
  queries.push({ sql, params });
  if (sql.includes('JOIN users owner') || sql === 'SELECT id, email FROM users WHERE id = ?') {
    if (lookupError) throw lookupError;
    if (sql.includes('JOIN users owner')) {
      const table = sql.match(/FROM (\w+) record/)[1];
      assert.match(sql, /WHERE record.id = \? AND record.user_id = \?/);
      return [records[table].filter(row => row.id === Number(params[0]) && row.user_id === params[1])
        .map(row => ({ demo_showcase_key: row.demo_showcase_key, email: users.find(user => user.id === row.user_id).email }))];
    }
    return [users.filter(user => user.id === params[0])];
  }
  if (sql.startsWith('SELECT') && sql.includes('FROM planted_items')) return [[]];
  if (sql.startsWith('SELECT')) {
    const table = sql.match(/FROM (gardens|garden_tasks|garden_activities)\b/)?.[1];
    assert.ok(table, sql);
    const byId = /WHERE (?:g\.)?id = \?/.test(sql);
    const ownerId = byId ? params[1] : params[0];
    assert.match(sql, /(?:g\.|t\.|a\.)?user_id = \?/);
    return [records[table].filter(row => row.user_id === ownerId && (!byId || row.id === Number(params[0])))
      .map(row => ({ ...row }))];
  }
  if (sql.startsWith('DELETE FROM planted_items')) return [{ affectedRows: 2 }];
  if (sql.startsWith('DELETE')) {
    const table = sql.match(/^DELETE FROM (\w+)/)[1];
    assert.match(sql, /WHERE id = \? AND user_id = \?/);
    const count = records[table].length;
    records[table] = records[table].filter(row => !(row.id === Number(params[0]) && row.user_id === params[1]));
    return [{ affectedRows: count - records[table].length }];
  }
  if (sql.startsWith('UPDATE')) {
    const table = sql.match(/^UPDATE (\w+)/)[1];
    const row = records[table].find(row => row.id === Number(params.at(-2)) && row.user_id === params.at(-1));
    assert.ok(row, sql);
    const assignments = sql.split(' SET ')[1].split(' WHERE ')[0];
    const columns = [...assignments.matchAll(/(\w+) = \?/g)].map(match => match[1]);
    assert.equal(params.length, columns.length + 2);
    columns.forEach((column, index) => { row[column] = params[index]; });
    if (assignments.includes('completed_at')) row.completed_at = row.status === 'completed' ? '2026-09-15T12:00:00.000Z' : null;
    return [{ affectedRows: 1 }];
  }
  if (sql.startsWith('INSERT')) {
    const [, table, columns, values] = sql.match(/^INSERT INTO (\w+) \((.*?)\) VALUES \((.*)\)$/);
    const row = { id: 900, demo_showcase_key: null };
    let index = 0;
    columns.split(',').forEach((column, position) => {
      const value = values.split(',')[position].trim();
      row[column.trim()] = value === '?' ? params[index++] : value === "'pending'" ? 'pending' : '2026-09-15';
    });
    assert.equal(index, params.length);
    records[table].push(row);
    return [{ insertId: row.id }];
  }
  throw new Error(`Unexpected query: ${sql}`);
};
const dbPath = require.resolve('../config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  execute,
  getConnection: async () => ({ execute, beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release: () => {} })
} };
const { requireCsrfProtection } = require('../middleware/csrfProtection');
const { getAuthCookieName } = require('../utils/authCookie');
let server;
let baseUrl;
before(async () => {
  const app = express();
  app.use(express.json(), cookieParser(), requireCsrfProtection);
  app.use('/gardens', require('../routes/gardens'));
  app.use('/tasks', require('../routes/task'));
  app.use('/activities', require('../routes/activities'));
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
beforeEach(() => {
  queries = [];
  lookupError = null;
  records = Object.fromEntries(fixtures.map(({ table, fields, id, key }) => [table, [
    { ...fields, id, user_id: 7, demo_showcase_key: key },
    { ...fields, id: id + 100, user_id: 7, demo_showcase_key: null },
    { ...fields, id: id + 200, user_id: 12, demo_showcase_key: key }
  ]]));
});
const request = async (path, { method = 'GET', userId = 7, body, csrf = true, claims = {} } = {}) => {
  const token = userId == null ? null : jwt.sign({ id: userId, sessionVersion: 0, ...claims }, process.env.JWT_SECRET);
  const response = await fetch(baseUrl + path, { method,
    headers: { 'Content-Type': 'application/json', ...(csrf ? { 'X-CSRF-Protection': '1' } : {}),
      ...(token ? { Cookie: `${getAuthCookieName()}=${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  return { status: response.status, body: await response.json() };
};

for (const { table, route, id, fields } of fixtures) {
  test(`${route}: direct and forged DELETE cannot remove renamed/re-keyed showcase records`, async () => {
    const before = structuredClone(records);
    const response = await request(`/${route}/${id}`, { method: 'DELETE',
      body: { user_id: 12, demo_showcase_key: null, isDeletionProtected: false },
      claims: { email: 'normal@example.com', isProtectedDemo: false } });
    assert.equal(response.status, 403);
    assert.equal(response.body.code, 'DEMO_DATA_PROTECTED');
    assert.deepEqual(records, before);
    assert.ok(queries.every(({ sql }) => sql.startsWith('SELECT')), 'No child or parent mutation');
  });

  for (const [offset, userId] of [[100, 7], [200, 12]]) {
    test(`${route}: user ${userId} can delete ${offset === 100 ? 'temporary demo' : 'normal-user keyed'} records`, async () => {
      const response = await request(`/${route}/${id + offset}`, { method: 'DELETE', userId,
        claims: { email: 'demo@plantplotter.com', isProtectedDemo: true } });
      assert.equal(response.status, 200);
      assert.ok(!records[table].some(row => row.id === id + offset));
      assert.ok(records[table].some(row => row.id === id));
    });
  }

  test(`${route}: ownership and missing records retain 404`, async () => {
    for (const target of [id + 200, 9999]) {
      const response = await request(`/${route}/${target}`, { method: 'DELETE' });
      assert.equal(response.status, 404);
    }
    assert.equal(records[table].length, 3);
  });

  test(`${route}: permission failure denies deletion without exposing database details`, async () => {
    lookupError = Object.assign(new Error('private database detail'), { code: 'ECONNREFUSED' });
    const response = await request(`/${route}/${id}`, { method: 'DELETE' });
    assert.equal(response.status, 503);
    assert.equal(response.body.code, 'SERVICE_UNAVAILABLE');
    assert.doesNotMatch(JSON.stringify(response.body), /private database detail/);
    assert.ok(queries.every(({ sql }) => sql.startsWith('SELECT')));
  });

  test(`${route}: authentication and CSRF run before deletion permissions`, async () => {
    assert.equal((await request(`/${route}/${id}`, { method: 'DELETE', userId: null })).status, 401);
    assert.equal((await request(`/${route}/${id}`, { method: 'DELETE', csrf: false })).status, 403);
    assert.equal(queries.length, 0);
  });

  test(`${route}: GET reports authoritative per-record protection without internal keys`, async () => {
    for (const userId of [7, 12]) {
      const response = await request(`/${route}`, { userId });
      assert.equal(response.status, 200);
      for (const row of response.body) {
        assert.equal(row.isDeletionProtected, userId === 7 && row.id === id);
        assert.ok(!Object.hasOwn(row, 'demo_showcase_key'));
      }
    }
  });

  test(`${route}: updates preserve keys and return protection even with forged fields`, async () => {
    const response = await request(`/${route}/${id}`, { method: 'PUT', body: {
      ...fields, name: 'Updated name', title: 'Updated task', notes: 'Updated notes',
      demo_showcase_key: null, isDeletionProtected: false
    } });
    assert.equal(response.status, 200);
    assert.equal((response.body.garden || response.body).isDeletionProtected, true);
    assert.ok(records[table][0].demo_showcase_key);
    assert.equal((await request(`/${route}/${id}`, { method: 'DELETE' })).status, 403);
  });

  test(`${route}: creation ignores client keys and remains deletable`, async () => {
    const response = await request(`/${route}`, { method: 'POST', body: {
      ...fields, demo_showcase_key: 'forged-key', isDeletionProtected: true
    } });
    assert.equal(response.status, 201);
    assert.equal(response.body.isDeletionProtected, false);
    assert.equal(records[table].at(-1).demo_showcase_key, null);
    assert.equal((await request(`/${route}/900`, { method: 'DELETE' })).status, 200);
  });
}

test('garden summary/detail and task completion retain protection', async () => {
  for (const path of ['/gardens/summary', '/gardens/81']) {
    const response = await request(path);
    assert.equal(response.status, 200);
    assert.equal((Array.isArray(response.body) ? response.body[0] : response.body).isDeletionProtected, true);
  }
  const response = await request('/tasks/82', { method: 'PATCH', body: { status: 'completed' } });
  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'completed');
  assert.equal(response.body.isDeletionProtected, true);
});

test('demo can still clear plants without deleting the showcase garden', async () => {
  const response = await request('/gardens/81/plants', { method: 'DELETE' });
  assert.equal(response.status, 200);
  assert.equal(records.gardens[0].demo_showcase_key, 'garden-1');
});

test('completing a showcase recurring task creates an unprotected, deletable follow-up', async () => {
  Object.assign(records.garden_tasks[0], { is_recurring: true, recurring_pattern: 'daily' });
  const response = await request('/tasks/82', { method: 'PATCH', body: { status: 'completed' } });
  assert.equal(response.status, 200);
  assert.equal(response.body.isDeletionProtected, true);
  const next = records.garden_tasks.find(row => row.id === 900);
  assert.equal(next.demo_showcase_key, null);
  assert.equal(next.due_date, '2099-01-02');
  assert.equal((await request('/tasks/900', { method: 'DELETE' })).status, 200);
  assert.equal((await request('/tasks/82', { method: 'DELETE' })).status, 403);
});
