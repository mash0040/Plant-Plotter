const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-only-task-status-secret';
process.env.NODE_ENV = 'development';

// Exercise the real HTTP route and authentication with a scripted DB connection.
// Each test asserts the SQL contract; no development or production data is touched.
let connection;
let acquisitions;
const dbPath = require.resolve('../config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  getConnection: async () => { acquisitions += 1; return connection; }
} };
const taskRouter = require('../routes/task');
const { requireCsrfProtection } = require('../middleware/csrfProtection');
const { getAuthCookieName } = require('../utils/authCookie');

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

const storedTask = overrides => ({
  id: 9, user_id: 12, garden_id: 4, title: 'Water basil',
  description: 'Morning care', due_date: '2099-09-10', priority: 'medium',
  status: 'pending', completed_at: null, plant_name: 'Basil', task_type: 'water',
  estimated_duration: 10, is_recurring: 0, recurring_pattern: null,
  notes: 'Use rain barrel',
  ...overrides
});

const scriptConnection = steps => {
  const events = [];
  return {
    events,
    async beginTransaction() { events.push('begin'); },
    async commit() { events.push('commit'); },
    async rollback() { events.push('rollback'); },
    release() { events.push('release'); },
    async execute(sql, params) {
      events.push('execute');
      const step = steps.shift();
      assert.ok(step, `Unexpected SQL: ${sql}`);
      return step(sql, params);
    },
    assertFinished() { assert.equal(steps.length, 0, 'All expected SQL must execute'); }
  };
};

const selectTask = (task, { lock = true, userId = 12, id = '9' } = {}) => (sql, params) => {
  assert.equal(sql, `SELECT * FROM garden_tasks WHERE id = ? AND user_id = ?${lock ? ' FOR UPDATE' : ''}`);
  assert.deepEqual(params, [id, userId]);
  return [task ? [task] : []];
};
const updateStatus = (status, timestampSql) => (sql, params) => {
  assert.equal(sql.replace(/\s+/g, ' ').trim(),
    `UPDATE garden_tasks SET status = ?, completed_at = ${timestampSql} WHERE id = ? AND user_id = ?`);
  assert.deepEqual(params, [status, '9', 12]);
  return [{ affectedRows: 1 }];
};

const request = async (body, { userId = 12, id = 9, method = 'PATCH', csrf = true } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (csrf) headers['X-CSRF-Protection'] = '1';
  if (userId !== null) {
    headers.Cookie = `${getAuthCookieName()}=${jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;
  }
  const response = await fetch(`${baseUrl}/${id}`, { method, headers, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json(), headers: response.headers };
};

beforeEach(() => { acquisitions = 0; connection = scriptConnection([]); });

test('completes an owned legacy task with status only and records the timestamp', async () => {
  const task = storedTask({ title: '', due_date: 'legacy-date', task_type: 'legacy-type' });
  const completed = { ...task, status: 'completed', completed_at: '2026-09-10T12:00:00.000Z' };
  connection = scriptConnection([
    selectTask(task), updateStatus('completed', 'NOW()'), selectTask(completed, { lock: false })
  ]);
  const response = await request({ status: 'completed', title: 'Must not overwrite metadata', notes: 'x'.repeat(2001) });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, completed);
  connection.assertFinished();
  assert.deepEqual(connection.events, ['begin', 'execute', 'execute', 'execute', 'commit', 'release']);
});

test('repeated completion preserves its timestamp and creates no extra recurrence', async () => {
  const completed = storedTask({ status: 'completed', completed_at: '2026-09-01T12:00:00.000Z',
    is_recurring: 1, recurring_pattern: 'weekly' });
  connection = scriptConnection([
    selectTask(completed), updateStatus('completed', 'COALESCE(completed_at, NOW())'),
    selectTask(completed, { lock: false })
  ]);
  const response = await request({ status: 'completed' });
  assert.equal(response.status, 200);
  assert.equal(response.body.completed_at, completed.completed_at);
  connection.assertFinished();
});

test('legacy completed tasks without a timestamp are backfilled without another occurrence', async () => {
  const task = storedTask({ status: 'completed', is_recurring: 1, recurring_pattern: 'weekly' });
  connection = scriptConnection([
    selectTask(task), updateStatus('completed', 'COALESCE(completed_at, NOW())'),
    selectTask({ ...task, completed_at: '2026-09-10T12:00:00.000Z' }, { lock: false })
  ]);
  assert.equal((await request({ status: 'completed' })).status, 200);
  connection.assertFinished();
});

for (const status of ['pending', 'overdue', 'cancelled']) {
  test(`transition to ${status} clears completed_at without validating editable metadata`, async () => {
    const task = storedTask({ title: '', status: 'completed', completed_at: '2026-09-01T12:00:00.000Z' });
    connection = scriptConnection([
      selectTask(task), updateStatus(status, 'NULL'),
      selectTask({ ...task, status, completed_at: null }, { lock: false })
    ]);
    const response = await request({ status });
    assert.equal(response.status, 200);
    assert.equal(response.body.completed_at, null);
    connection.assertFinished();
  });
}

for (const status of [undefined, null, '', 'unknown', true, 1, {}]) {
  test(`rejects invalid status ${JSON.stringify(status)} before acquiring a connection`, async () => {
    assert.equal((await request({ status })).status, 400);
    assert.equal(acquisitions, 0);
  });
}

test('requires authentication and CSRF protection', async () => {
  assert.equal((await request({ status: 'completed' }, { userId: null })).status, 401);
  assert.equal((await request({ status: 'completed' }, { csrf: false })).status, 403);
  assert.equal(acquisitions, 0);
});

for (const options of [{ userId: 99 }, { id: 999 }]) {
  test(`returns the same not-found response for ${JSON.stringify(options)}`, async () => {
    connection = scriptConnection([selectTask(null, { userId: options.userId || 12, id: String(options.id || 9) })]);
    const response = await request({ status: 'completed' }, options);
    assert.equal(response.status, 404);
    assert.deepEqual(response.body, { message: 'Task not found', code: 'TASK_NOT_FOUND' });
    assert.deepEqual(connection.events, ['begin', 'execute', 'rollback', 'release']);
  });
}

for (const [pattern, nextDate] of [['daily', '2099-09-11'], ['every-2-days', '2099-09-12'],
  ['weekly', '2099-09-17'], ['monthly', '2099-10-10']]) {
  test(`completion schedules ${pattern} once from stored metadata in the transaction`, async () => {
    const task = storedTask({ is_recurring: 1, recurring_pattern: pattern });
    const completed = { ...task, status: 'completed', completed_at: '2026-09-10T12:00:00.000Z' };
    connection = scriptConnection([
      selectTask(task), updateStatus('completed', 'NOW()'),
      (sql, params) => {
        assert.match(sql, /INSERT INTO garden_tasks/);
        assert.deepEqual(params, [12, 4, task.title, task.description, nextDate, 'medium', 'Basil',
          'water', 10, true, pattern, task.notes]);
        assert.ok(!connection.events.includes('commit'));
        return [{ insertId: 10 }];
      },
      selectTask(completed, { lock: false }),
      selectTask(completed), updateStatus('completed', 'COALESCE(completed_at, NOW())'),
      selectTask(completed, { lock: false })
    ]);
    assert.equal((await request({ status: 'completed' })).status, 200);
    assert.equal((await request({ status: 'completed' })).status, 200);
    connection.assertFinished();
    assert.equal(connection.events.filter(event => event === 'commit').length, 2);
  });
}

test('invalid scheduling metadata gives a recoverable error before changing the task', async () => {
  connection = scriptConnection([selectTask(storedTask({ is_recurring: 1, recurring_pattern: 'legacy' }))]);
  const response = await request({ status: 'completed' });
  assert.equal(response.status, 400);
  assert.match(response.body.message, /Edit this recurring task/);
  assert.deepEqual(connection.events, ['begin', 'execute', 'rollback', 'release']);
});

test('a failure to create the next occurrence rolls back completion and releases the connection', async () => {
  connection = scriptConnection([
    selectTask(storedTask({ is_recurring: 1, recurring_pattern: 'daily' })),
    updateStatus('completed', 'NOW()'),
    () => { throw Object.assign(new Error('Connection lost'), { code: 'ECONNRESET' }); }
  ]);
  const response = await request({ status: 'completed' });
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('retry-after'), '60');
  assert.equal(response.body.code, 'SERVICE_UNAVAILABLE');
  assert.deepEqual(connection.events.slice(-2), ['rollback', 'release']);
  assert.ok(!connection.events.includes('commit'));
});

test('a status update failure is recoverable and does not commit', async () => {
  connection = scriptConnection([selectTask(storedTask()), () => { throw new Error('Private DB detail'); }]);
  const response = await request({ status: 'completed' });
  assert.equal(response.status, 500);
  assert.equal(response.body.message, 'Failed to update task');
  assert.deepEqual(connection.events.slice(-2), ['rollback', 'release']);
  assert.ok(!connection.events.includes('commit'));
});

test('PUT retains editable-field validation', async () => {
  assert.equal((await request({ status: 'completed' }, { method: 'PUT' })).status, 400);
  assert.equal(acquisitions, 0);
});

for (const notes of ['New care instructions', '', null, undefined]) {
  test(`PUT completion copies the edited notes to recurrence: ${JSON.stringify(notes)}`, async () => {
    const task = storedTask({ is_recurring: 1, recurring_pattern: 'weekly' });
    const expectedNotes = notes === undefined ? task.notes : notes || null;
    connection = scriptConnection([
      selectTask(task),
      (sql, params) => {
        assert.match(sql, /notes = \?/);
        assert.equal(params[10], expectedNotes);
        return [{ affectedRows: 1 }];
      },
      (sql, params) => {
        assert.match(sql, /recurring_pattern,\s+notes, created_at/);
        assert.equal(params[11], expectedNotes);
        return [{ insertId: 10 }];
      },
      selectTask({ ...task, status: 'completed', notes: expectedNotes }, { lock: false })
    ]);
    const response = await request({ ...task, status: 'completed', notes }, { method: 'PUT' });
    assert.equal(response.status, 200);
    assert.equal(response.body.notes, expectedNotes);
    connection.assertFinished();
  });
}

for (const status of ['completed', 'pending']) {
  test(`PUT also maintains the completion timestamp for ${status}`, async () => {
    const task = storedTask({ status: status === 'completed' ? 'pending' : 'completed' });
    connection = scriptConnection([
      selectTask(task),
      (sql, params) => {
        assert.match(sql, new RegExp(`completed_at = ${status === 'completed' ? 'NOW\\(\\)' : 'NULL'}`));
        assert.match(sql, /WHERE id = \? AND user_id = \?/);
        assert.equal(params[4], status);
        assert.deepEqual(params.slice(-2), ['9', 12]);
        return [{ affectedRows: 1 }];
      },
      selectTask({ ...task, status }, { lock: false })
    ]);
    assert.equal((await request({ ...task, status }, { method: 'PUT' })).status, 200);
    connection.assertFinished();
  });
}
