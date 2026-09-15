const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-only-garden-deletion-secret';
process.env.NODE_ENV = 'test';

let connection;
let acquisitions;
let acquisitionError;
const dbPath = require.resolve('../config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  async getConnection() {
    acquisitions += 1;
    if (acquisitionError) throw acquisitionError;
    return connection;
  },
  async execute(raw, params) {
    const sql = raw.replace(/\s+/g, ' ').trim();
    if (sql === 'SELECT session_version FROM users WHERE id = ? AND is_active = TRUE') {
      return [[{ session_version: 0 }]];
    }
    if (sql === 'SELECT record.demo_showcase_key, owner.email FROM gardens record JOIN users owner ON owner.id = record.user_id WHERE record.id = ? AND record.user_id = ?') {
      return [connection.persisted.gardens
        .filter(row => row.id === Number(params[0]) && row.user_id === params[1])
        .map(row => ({ demo_showcase_key: row.demo_showcase_key ?? null,
          email: row.user_id === 7 ? 'demo@plantplotter.com' : 'gardener@example.com' }))];
    }
    assert.fail(`Deletion must use its transaction connection: ${sql}`);
  }
} };
const gardenRouter = require('../routes/gardens');
const { deleteGardenForUser } = require('../services/gardenService');
const { requireCsrfProtection } = require('../middleware/csrfProtection');
const { getAuthCookieName } = require('../utils/authCookie');

let server;
let baseUrl;
before(async () => {
  const app = express();
  app.use(express.json(), cookieParser(), requireCsrfProtection);
  app.use('/api/gardens', gardenRouter);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/gardens`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });

const originalData = {
  gardens: [{ id: 4, user_id: 12, name: 'Kitchen garden' }, { id: 5, user_id: 99, name: 'Other garden' }],
  planted_items: [
    { id: 81, garden_id: 4, plant_name: 'Basil', x_position: 2, y_position: 3, notes: 'Sunny corner' },
    { id: 82, garden_id: 4, plant_name: 'Mint', x_position: 5, y_position: 1 },
    { id: 83, garden_id: 5, plant_name: 'Rose', x_position: 0, y_position: 0 }
  ],
  garden_tasks: [{ id: 91, garden_id: 4, user_id: 12 }, { id: 92, garden_id: 5, user_id: 99 }],
  garden_activities: [{ id: 101, garden_id: 4, user_id: 12 }, { id: 102, garden_id: 5, user_id: 99 }]
};
const databaseError = (code = 'ER_TEST_FAILURE') => Object.assign(new Error('Simulated database failure'), { code });

// SQL and cascades change a private transaction copy; only commit publishes it.
// Faults after child cleanup deliberately exercise rollback preservation. This
// double does not verify MySQL's actual cascade execution or locking behavior.
const transactionConnection = (options = {}) => {
  let persisted = structuredClone(options.data ?? originalData);
  let pending;
  const events = [];
  const failAt = phase => {
    if (options.failAt === phase) throw options.error || databaseError();
  };
  return {
    events,
    get persisted() { return structuredClone(persisted); },
    async beginTransaction() {
      events.push('begin');
      failAt('begin');
      pending = structuredClone(persisted);
    },
    async execute(raw, params) {
      assert.ok(pending, 'SQL must execute inside the transaction');
      const sql = raw.replace(/\s+/g, ' ').trim();
      const gardenId = Number(params[0]);
      if (sql === 'SELECT id FROM gardens WHERE id = ? AND user_id = ? FOR UPDATE') {
        events.push('ownership');
        failAt('ownership');
        return [pending.gardens.filter(row => row.id === gardenId && row.user_id === params[1])];
      }
      if (sql === 'SELECT id FROM planted_items WHERE garden_id = ? FOR UPDATE') {
        events.push('plants');
        failAt('plants');
        return [pending.planted_items.filter(row => row.garden_id === gardenId).map(row => ({ id: row.id }))];
      }
      assert.equal(sql, 'DELETE FROM gardens WHERE id = ? AND user_id = ?');
      events.push('delete');
      failAt('delete');
      assert.ok(pending.gardens.some(row => row.id === gardenId && row.user_id === params[1]));
      for (const table of ['planted_items', 'garden_tasks', 'garden_activities']) {
        pending[table] = pending[table].filter(row => row.garden_id !== gardenId);
      }
      events.push('dependent-cleanup');
      failAt('after-cleanup');
      if (options.zeroAffectedRows) return [{ affectedRows: 0 }];
      pending.gardens = pending.gardens.filter(row => row.id !== gardenId);
      return [{ affectedRows: 1 }];
    },
    async commit() {
      events.push('commit');
      failAt('commit');
      persisted = pending;
      pending = undefined;
    },
    async rollback() {
      events.push('rollback');
      if (options.rollbackError) throw options.rollbackError;
      pending = undefined;
    },
    release() { events.push('release'); },
    destroy() { events.push('destroy'); pending = undefined; }
  };
};

const request = async ({ userId = 12, gardenId = 4, csrf = true } = {}) => {
  const headers = {};
  if (csrf) headers['X-CSRF-Protection'] = '1';
  if (userId !== null) {
    headers.Cookie = `${getAuthCookieName()}=${jwt.sign({ id: userId, sessionVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;
  }
  const response = await fetch(`${baseUrl}/${gardenId}`, { method: 'DELETE', headers });
  return { status: response.status, body: await response.json(), headers: response.headers };
};

beforeEach(() => {
  acquisitions = 0;
  acquisitionError = undefined;
  connection = transactionConnection();
});

test('deletion commits the garden and all dependent data, reports plants, and preserves other gardens', async () => {
  const response = await request();
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { message: 'Garden deleted successfully', deletedPlants: 2 });
  assert.equal(acquisitions, 1);
  assert.deepEqual(connection.persisted, Object.fromEntries(Object.entries(originalData)
    .map(([table, rows]) => [table, rows.filter(row => table === 'gardens' ? row.id === 5 : row.garden_id === 5)])));
  assert.deepEqual(connection.events, ['begin', 'ownership', 'plants', 'delete', 'dependent-cleanup', 'commit', 'release']);
});

test('a garden with no plants reports zero while still deleting its tracker data', async () => {
  const data = structuredClone(originalData);
  data.planted_items = data.planted_items.filter(row => row.garden_id !== 4);
  connection = transactionConnection({ data });
  const response = await request();
  assert.equal(response.status, 200);
  assert.equal(response.body.deletedPlants, 0);
  assert.deepEqual(connection.persisted.planted_items, data.planted_items);
  assert.ok(connection.persisted.garden_tasks.every(row => row.garden_id !== 4));
  assert.ok(connection.persisted.garden_activities.every(row => row.garden_id !== 4));
});

for (const phase of ['begin', 'ownership', 'plants', 'delete', 'after-cleanup', 'commit']) {
  test(`${phase} failure rolls back the garden, original layout, and tracker data`, async () => {
    connection = transactionConnection({ failAt: phase });
    const response = await request();
    assert.equal(response.status, 500);
    assert.equal(response.body.message, 'Failed to delete garden');
    assert.equal(response.body.deletedPlants, undefined);
    assert.deepEqual(connection.persisted, originalData);
    assert.deepEqual(connection.events.slice(-2), ['rollback', 'release']);
    if (phase === 'after-cleanup' || phase === 'commit') {
      assert.ok(connection.events.includes('dependent-cleanup'));
    }
  });
}

test('zero deleted garden rows returns the existing 404 and rolls back dependent cleanup', async () => {
  connection = transactionConnection({ zeroAffectedRows: true });
  const response = await request();
  assert.equal(response.status, 404);
  assert.equal(response.body.code, 'GARDEN_NOT_FOUND');
  assert.deepEqual(connection.persisted, originalData);
  assert.deepEqual(connection.events, ['begin', 'ownership', 'plants', 'delete', 'dependent-cleanup', 'rollback', 'release']);
});

for (const [description, options] of [
  ['another user', { userId: 99 }],
  ['a missing garden', { gardenId: 999 }]
]) {
  test(`deletion rejects ${description} before any cleanup`, async () => {
    const response = await request(options);
    assert.equal(response.status, 404);
    assert.equal(response.body.code, 'GARDEN_NOT_FOUND');
    assert.equal(response.body.message, 'Garden not found or unauthorized');
    assert.deepEqual(connection.persisted, originalData);
    assert.deepEqual(connection.events, ['begin', 'ownership', 'rollback', 'release']);
  });
}

test('temporary failure after cleanup rolls back and retains the database-unavailable response', async () => {
  connection = transactionConnection({ failAt: 'after-cleanup', error: databaseError('ECONNRESET') });
  const response = await request();
  assert.equal(response.status, 503);
  assert.equal(response.body.code, 'SERVICE_UNAVAILABLE');
  assert.equal(response.headers.get('Retry-After'), '60');
  assert.deepEqual(connection.persisted, originalData);
  assert.deepEqual(connection.events.slice(-2), ['rollback', 'release']);
});

test('connection acquisition failure returns 503 without changing data', async () => {
  acquisitionError = databaseError('ECONNREFUSED');
  const response = await request();
  assert.equal(response.status, 503);
  assert.equal(response.body.code, 'SERVICE_UNAVAILABLE');
  assert.deepEqual(connection.persisted, originalData);
  assert.deepEqual(connection.events, []);
});

test('rollback failure destroys the connection instead of releasing it and preserves the original error', async () => {
  const originalError = databaseError('ECONNRESET');
  connection = transactionConnection({ failAt: 'after-cleanup', error: originalError, rollbackError: databaseError() });
  await assert.rejects(deleteGardenForUser('4', 12), error => error === originalError);
  assert.deepEqual(connection.persisted, originalData);
  assert.deepEqual(connection.events, ['begin', 'ownership', 'plants', 'delete', 'dependent-cleanup', 'rollback', 'destroy']);
});

for (const [description, options, status] of [
  ['unauthenticated', { userId: null }, 401],
  ['missing CSRF header', { csrf: false }, 403]
]) {
  test(`${description} requests never acquire a connection`, async () => {
    assert.equal((await request(options)).status, status);
    assert.equal(acquisitions, 0);
    assert.deepEqual(connection.persisted, originalData);
  });
}

test('demo showcase protection rejects deletion before acquiring a transaction', async () => {
  const data = structuredClone(originalData);
  Object.assign(data.gardens[0], { user_id: 7, demo_showcase_key: 'garden-1' });
  connection = transactionConnection({ data });
  const response = await request({ userId: 7 });
  assert.equal(response.status, 403);
  assert.equal(response.body.code, 'DEMO_DATA_PROTECTED');
  assert.equal(acquisitions, 0);
  assert.deepEqual(connection.persisted, data);
});
