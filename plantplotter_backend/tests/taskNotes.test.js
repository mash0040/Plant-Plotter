const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-only-task-notes-secret';
process.env.NODE_ENV = 'development';

// Real HTTP routes/authentication, with SQL contract assertions and in-memory rows.
// This does not replace migration validation against a live MySQL database.
let row;
let calls;
let failure;
const execute = async (sql, params) => {
  calls += 1;
  if (failure) throw failure;
  if (sql.includes('SELECT id FROM gardens')) {
    assert.deepEqual(params, [4, 12]);
    return [[{ id: 4 }]];
  }
  if (sql.includes('INSERT INTO garden_tasks')) {
    assert.match(sql, /recurring_pattern,\s+notes, created_at/);
    assert.equal((sql.match(/\?/g) || []).length, params.length);
    assert.equal(params.length, 12);
    assert.equal(params[0], 12);
    row = { ...task, id: 9, user_id: 12, notes: params[11] };
    return [{ insertId: 9 }];
  }
  if (sql.includes('UPDATE garden_tasks')) {
    assert.match(sql, /recurring_pattern = \?, notes = \?, completed_at = NULL/);
    assert.match(sql, /WHERE id = \? AND user_id = \?/);
    assert.equal((sql.match(/\?/g) || []).length, params.length);
    assert.deepEqual(params.slice(-2), ['9', 12]);
    assert.equal(params.length, 13);
    row = { ...row, notes: params[10] };
    return [{ affectedRows: 1 }];
  }
  if (sql.includes('SELECT t.*')) {
    assert.match(sql, /WHERE t.user_id = \?/);
    assert.match(sql, /AND t.garden_id = \?/);
    assert.deepEqual(params, [12, '4']);
    return [[{ ...row, garden_name: 'Patio' }]];
  }
  assert.match(sql, /SELECT \* FROM garden_tasks WHERE id = \? AND user_id = \?/);
  assert.equal(String(params[0]), '9');
  assert.equal(params[1], 12);
  return [[{ ...row }]];
};
const dbPath = require.resolve('../config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  execute,
  getConnection: async () => {
    calls += 1;
    return { execute, beginTransaction: async () => {}, commit: async () => {},
      rollback: async () => {}, release: () => {} };
  }
} };
const taskRouter = require('../routes/task');
const { requireCsrfProtection } = require('../middleware/csrfProtection');
const { getAuthCookieName } = require('../utils/authCookie');

const task = { title: 'Water basil', garden_id: 4, due_date: '2099-09-10',
  task_type: 'water', status: 'pending', is_recurring: false, recurring_pattern: null };
let server;
let baseUrl;
before(async () => {
  const app = express();
  app.use(express.json(), cookieParser(), requireCsrfProtection);
  app.use('/api/tasks', taskRouter);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/tasks`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
beforeEach(() => {
  row = { ...task, id: 9, user_id: 12, notes: 'Original notes' };
  calls = 0;
  failure = null;
});

const request = async (method, body) => {
  const suffix = method === 'GET' ? '?gardenId=4' : method === 'PUT' ? '/9' : '';
  const response = await fetch(`${baseUrl}${suffix}`, {
    method,
    headers: {
      'Content-Type': 'application/json', 'X-CSRF-Protection': '1',
      Cookie: `${getAuthCookieName()}=${jwt.sign({ id: 12 }, process.env.JWT_SECRET, { expiresIn: '1h' })}`
    },
    ...(method === 'GET' ? {} : { body: JSON.stringify({ ...task, ...body }) })
  });
  return { status: response.status, body: await response.json() };
};

const values = [
  ['multiline text', '  Use rain barrel\nBasil: café 🌱 水  '],
  ['empty string', ''], ['null', null], ['omitted', undefined],
  ['whitespace', '  \n '], ['limit', 'x'.repeat(2000)], ['Unicode limit', '🌱'.repeat(1000)]
];
for (const [label, notes] of values) {
  test(`creates and fetches notes: ${label}`, async () => {
    const expected = notes || null;
    const created = await request('POST', { notes });
    assert.equal(created.status, 201);
    assert.equal(created.body.notes, expected);
    const fetched = await request('GET');
    assert.equal(fetched.status, 200);
    assert.equal(fetched.body[0].notes, expected);
  });

  test(`edits and fetches notes: ${label}`, async () => {
    const expected = notes === undefined ? 'Original notes' : notes || null;
    const updated = await request('PUT', { notes });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.notes, expected);
    assert.equal((await request('GET')).body[0].notes, expected);
  });
}

test('an existing task with null notes loads and can be edited by an older client', async () => {
  row.notes = null;
  assert.equal((await request('GET')).body[0].notes, null);
  assert.equal((await request('PUT', {})).body.notes, null);
});

for (const method of ['POST', 'PUT']) {
  for (const [label, notes, message] of [
    ['over limit', 'x'.repeat(2001), 'Notes must be 2,000 characters or fewer.'],
    ['Unicode over limit', `${'🌱'.repeat(1000)}x`, 'Notes must be 2,000 characters or fewer.'],
    ...[42, false, {}, []].map(value => [JSON.stringify(value), value, 'Notes must be text.'])
  ]) {
    test(`${method} rejects ${label} before database access`, async () => {
      const response = await request(method, { notes });
      assert.equal(response.status, 400);
      assert.deepEqual(response.body, { message, code: 'VALIDATION_ERROR', errors: { notes: message } });
      assert.equal(calls, 0);
    });
  }
}

for (const [method, message] of [['GET', 'Failed to fetch tasks'], ['POST', 'Failed to create task'], ['PUT', 'Failed to update task']]) {
  test(`${method} hides SQL error details`, async () => {
    failure = Object.assign(new Error('SQL private database details'), { code: 'ER_BAD_FIELD_ERROR' });
    const response = await request(method, { notes: 'Care instructions' });
    assert.equal(response.status, 500);
    assert.deepEqual(response.body, { message });
  });
}
