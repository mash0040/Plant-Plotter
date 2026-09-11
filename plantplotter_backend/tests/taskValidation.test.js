const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-only-task-validation-secret';
process.env.NODE_ENV = 'development';

// Exercise the real HTTP/authentication path and assert SQL-bound values without a live database.
let steps;
let calls;
const execute = async (sql, params) => {
  calls += 1;
  const step = steps.shift();
  assert.ok(step, `Unexpected SQL: ${sql}`);
  return step(sql, params);
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
beforeEach(() => { calls = 0; steps = []; });

const soilTask = { id: 16, user_id: 12, garden_id: 1, title: 'Soil amendment',
  description: 'Add compost to vegetable beds', plant_name: 'All Vegetables', task_type: 'maintenance',
  due_date: '2025-08-01', status: 'pending', priority: 'low', estimated_duration: 120,
  is_recurring: true, recurring_pattern: 'monthly', notes: null };
const request = async (method, body) => {
  const response = await fetch(`${baseUrl}${method === 'POST' ? '' : '/16'}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1',
      Cookie: `${getAuthCookieName()}=${jwt.sign({ id: 12 }, process.env.JWT_SECRET, { expiresIn: '1h' })}` },
    body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
};
const selectTask = task => (sql, params) => {
  assert.match(sql, /SELECT \* FROM garden_tasks WHERE id = \? AND user_id = \?/);
  assert.equal(String(params[0]), '16');
  assert.equal(params[1], 12);
  return [[task]];
};

for (const method of ['POST', 'PUT']) {
  for (const [field, invalidValues, message] of [
    ['title', [undefined, null, '', '   ', 123, {}], 'A task title is required.'],
    ['title', ['x'.repeat(256), '🌱'.repeat(256)], 'The task title must be 255 characters or fewer.'],
    ['due_date', [undefined, null, '', '  ', 123, {}], 'Select a due date.'],
    ['task_type', ['unsupported', 'constructor', '', null, false, 0, {}, []], 'Choose a supported task type.']
  ]) {
    for (const [index, value] of invalidValues.entries()) {
      test(`${method} identifies invalid ${field} case ${index} without database access`, async () => {
        const response = await request(method, { ...soilTask, [field]: value });
        assert.equal(response.status, 400);
        assert.deepEqual(response.body, { message, code: 'VALIDATION_ERROR', errors: { [field]: message } });
        assert.equal(calls, 0);
      });
    }
  }

  test(`${method} lists only the missing title and date with friendly messages`, async () => {
    const response = await request(method, { ...soilTask, title: '', due_date: '' });
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      message: 'A task title is required. Select a due date.', code: 'VALIDATION_ERROR',
      errors: { title: 'A task title is required.', due_date: 'Select a due date.' }
    });
    assert.equal(calls, 0);
  });

  test(`${method} handles an absent JSON body with friendly validation instead of a server error`, async () => {
    const response = await request(method, undefined);
    assert.equal(response.status, 400);
    assert.doesNotMatch(response.body.message, /due_date|garden_id|task_type/);
    assert.equal(calls, 0);
  });

  for (const task of [
    soilTask,
    { ...soilTask, title: 'Water pepper plants', task_type: 'water', plant_name: 'Bell Pepper', recurring_pattern: 'every-2-days' },
    { ...soilTask, title: 'Fall planting prep', task_type: 'plant', plant_name: 'Fall Vegetables' },
    { ...soilTask, title: 'x'.repeat(255) },
    { ...soilTask, title: '🌱'.repeat(255) },
    { ...soilTask, task_type: undefined }
  ]) {
    test(`${method} preserves compatible task fields (${task.task_type ?? 'omitted'}, title length ${task.title.length})`, async () => {
      const saved = { ...task, task_type: task.task_type ?? 'maintenance' };
      if (method === 'POST') {
        steps = [
          (sql, params) => {
            assert.equal(sql, 'SELECT id FROM gardens WHERE id = ? AND user_id = ?');
            assert.deepEqual(params, [1, 12]);
            return [[{ id: 1 }]];
          },
          (sql, params) => {
            assert.match(sql, /INSERT INTO garden_tasks/);
            assert.deepEqual(params, [12, 1, task.title, task.description, task.due_date, 'low', task.plant_name,
              saved.task_type, 120, true, task.recurring_pattern, null]);
            return [{ insertId: 16 }];
          },
          selectTask(saved)
        ];
      } else {
        steps = [selectTask(task), (sql, params) => {
          assert.match(sql, /UPDATE garden_tasks/);
          assert.match(sql, /WHERE id = \? AND user_id = \?/);
          assert.deepEqual(params, [task.title, task.description, task.due_date, 'low', 'pending', task.plant_name,
            saved.task_type, 120, true, task.recurring_pattern, null, '16', 12]);
          return [{ affectedRows: 1 }];
        }, selectTask(saved)];
      }
      const response = await request(method, task);
      assert.equal(response.status, method === 'POST' ? 201 : 200);
      assert.deepEqual(response.body, saved);
      assert.equal(steps.length, 0);
    });
  }
}

test('POST identifies only the missing garden in plain language', async () => {
  const response = await request('POST', { ...soilTask, garden_id: '' });
  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { message: 'Select a garden.', code: 'VALIDATION_ERROR',
    errors: { garden_id: 'Select a garden.' } });
  assert.equal(calls, 0);
});
