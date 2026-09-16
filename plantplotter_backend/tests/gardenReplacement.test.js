const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-only-garden-replacement-secret';
process.env.NODE_ENV = 'development';

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
  async execute(sql) {
    if (sql === 'SELECT session_version FROM users WHERE id = ? AND is_active = TRUE') return [[{ session_version: 0 }]];
    assert.fail('Replacement must use its transaction connection');
  }
} };
const gardenRouter = require('../routes/gardens');
const { replacePlantedItemsForGarden } = require('../services/gardenService');
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

const previousLayout = [
  { id: 81, garden_id: 4, plant_id: 'basil', plant_name: 'Basil', x_position: 2, y_position: 3 },
  { id: 82, garden_id: 4, plant_id: 'mint', plant_name: 'Mint', x_position: 5, y_position: 1 }
];
const otherGardenLayout = [{ id: 83, garden_id: 5, plant_name: 'Rose' }];
const replacements = [
  { plant_id: 'tomato', plant_name: 'Tomato', plant_emoji: 'T', plant_size: 2,
    plant_category: 'vegetables', x_position: 4, y_position: 6,
    planted_date: '2026-09-12', notes: 'Sunny corner' },
  { plant_id: 'carrot', plant_name: 'Carrot', plant_emoji: 'C', plant_size: 1,
    plant_category: 'vegetables', x_position: 1, y_position: 2,
    planted_date: '2026-09-11', notes: 'First row' }
];
const databaseError = (code = 'ER_TEST_FAILURE') => Object.assign(new Error('Simulated database failure'), { code });
const previousGarden = { id: 4, name: 'Herbs', description: '', width: 10, height: 8,
  soil_type: 'Loamy', location: null, status: 'Planning' };
const plannerGarden = { name: 'Kitchen garden', description: 'Expanded', width: 15, height: 12,
  soil_type: 'Clay', location: 'Backyard', status: 'Active' };

// Stateful transaction double: SQL mutates a private working copy, commit publishes
// it, and rollback discards it. This exercises the real service and HTTP route;
// it does not replace manual verification against MySQL.
const transactionConnection = (options = {}) => {
  let persisted = structuredClone([...previousLayout, ...otherGardenLayout]);
  let pending;
  let persistedGarden = { ...previousGarden, ...options.garden };
  let pendingGarden;
  let inserts = 0;
  const events = [];
  const failAt = phase => {
    if (options.failAt === phase) throw options.error || databaseError();
  };
  return {
    events,
    get persisted() { return structuredClone(persisted); },
    get persistedGarden() { return structuredClone(persistedGarden); },
    async beginTransaction() {
      events.push('begin');
      failAt('begin');
      pending = structuredClone(persisted);
      pendingGarden = structuredClone(persistedGarden);
    },
    async execute(sql, params) {
      assert.ok(pending, 'SQL must execute inside the transaction');
      const normalized = sql.replace(/\s+/g, ' ').trim();
      if (normalized.startsWith('UPDATE gardens')) {
        events.push('metadata');
        failAt('metadata');
        assert.equal(normalized, 'UPDATE gardens SET name = ?, description = ?, width = ?, height = ?, soil_type = ?, location = ?, status = ?, updated_at = NOW() WHERE id = ? AND user_id = ?');
        assert.deepEqual(params.slice(-2), ['4', 12]);
        const fields = ['name', 'description', 'width', 'height', 'soil_type', 'location', 'status'];
        Object.assign(pendingGarden, Object.fromEntries(fields.map((field, index) => [field, params[index]])));
        return [{ affectedRows: 1 }];
      }
      if (normalized === 'SELECT * FROM gardens WHERE id = ? AND user_id = ?') {
        events.push('readback');
        failAt('readback');
        return [[structuredClone(pendingGarden)]];
      }
      if (normalized === 'SELECT id, email FROM users WHERE id = ?') {
        events.push('protection');
        failAt('protection');
        return [[{ id: 12, email: 'demo@plantplotter.com' }]];
      }
      if (normalized.startsWith('SELECT')) {
        events.push('ownership');
        assert.equal(normalized, 'SELECT id FROM gardens WHERE id = ? AND user_id = ? FOR UPDATE');
        failAt('ownership');
        return [String(params[0]) === '4' && params[1] === 12 ? [{ id: 4 }] : []];
      }
      if (normalized.startsWith('DELETE')) {
        events.push('delete');
        assert.equal(normalized, 'DELETE FROM planted_items WHERE garden_id = ?');
        assert.equal(String(params[0]), '4');
        failAt('delete');
        pending = pending.filter(row => row.garden_id !== 4);
        return [{ affectedRows: previousLayout.length }];
      }
      assert.equal(normalized, 'INSERT INTO planted_items (garden_id, plant_id, plant_name, plant_emoji, plant_size, plant_category, x_position, y_position, planted_date, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())');
      inserts += 1;
      events.push(`insert:${inserts}`);
      failAt(`insert:${inserts}`);
      const fields = ['garden_id', 'plant_id', 'plant_name', 'plant_emoji', 'plant_size',
        'plant_category', 'x_position', 'y_position', 'planted_date', 'notes'];
      assert.equal(params.length, fields.length);
      pending.push(Object.fromEntries(fields.map((field, index) => [field, params[index]])));
      return [{ insertId: 100 + inserts, affectedRows: 1 }];
    },
    async commit() {
      events.push('commit');
      failAt('commit');
      persisted = pending;
      persistedGarden = pendingGarden;
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

const request = async (plantedItems, { userId = 12, gardenId = 4, csrf = true, planner = false, garden = plannerGarden } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (csrf) headers['X-CSRF-Protection'] = '1';
  if (userId !== null) {
    headers.Cookie = `${getAuthCookieName()}=${jwt.sign({ id: userId, sessionVersion: 0 }, process.env.JWT_SECRET, { expiresIn: '1h' })}`;
  }
  const response = await fetch(`${baseUrl}/${gardenId}/${planner ? 'planner' : 'complete'}`, {
    method: 'PUT', headers, body: JSON.stringify(planner ? { garden, plantedItems } : { plantedItems })
  });
  return { status: response.status, body: await response.json(), headers: response.headers };
};

beforeEach(() => {
  acquisitions = 0;
  acquisitionError = undefined;
  connection = transactionConnection();
});

const assertOriginalLayout = () => {
  assert.deepEqual(connection.persisted, [...previousLayout, ...otherGardenLayout]);
};

for (const plants of [replacements, []]) {
  test(`planner commits metadata with ${plants.length} plants in one transaction`, async () => {
    const response = await request(plants, { planner: true });
    assert.equal(response.status, 200);
    assert.equal(acquisitions, 1);
    assert.deepEqual(connection.persistedGarden, { id: 4, ...plannerGarden });
    assert.deepEqual(connection.persisted, [...otherGardenLayout, ...plants.map(plant => ({ garden_id: 4, ...plant }))]);
    assert.deepEqual(response.body.garden.dimensions, { width: 15, height: 12 });
    assert.equal(response.body.garden.name, plannerGarden.name);
    assert.equal(response.body.garden.plantCount, plants.length);
    assert.deepEqual(connection.events, ['begin', 'ownership', 'metadata', 'delete',
      ...plants.map((_, index) => `insert:${index + 1}`), 'readback', 'commit', 'release']);
  });
}

for (const phase of ['begin', 'ownership', 'metadata', 'delete', 'insert:1', 'insert:2', 'readback', 'commit']) {
  test(`planner ${phase} failure preserves both metadata and layout`, async () => {
    connection = transactionConnection({ failAt: phase });
    const response = await request(replacements, { planner: true });
    assert.equal(response.status, 500);
    assert.equal(response.body.message, 'Failed to save garden layout');
    assertOriginalLayout();
    assert.deepEqual(connection.persistedGarden, previousGarden);
    assert.deepEqual(connection.events.slice(-2), ['rollback', 'release']);
    if (phase === 'metadata') assert.ok(!connection.events.includes('delete'));
  });
}

for (const garden of [null, {}, { ...plannerGarden, width: 0 }, { ...plannerGarden, name: '' }]) {
  test(`planner rejects invalid metadata ${JSON.stringify(garden)} before a transaction`, async () => {
    const response = await request(replacements, { planner: true, garden });
    assert.equal(response.status, 400);
    assert.equal(response.body.code, 'VALIDATION_ERROR');
    assert.equal(acquisitions, 0);
    assertOriginalLayout();
    assert.deepEqual(connection.persistedGarden, previousGarden);
  });
}

for (const plants of [undefined, null, {}, [null], ['invalid'], [[]]]) {
  test(`planner rejects malformed or omitted layout ${JSON.stringify(plants)}`, async () => {
    const response = await request(plants, { planner: true });
    assert.equal(response.status, 400);
    assert.equal(acquisitions, 0);
    assertOriginalLayout();
  });
}

for (const [options, status] of [
  [{ userId: 99 }, 404], [{ gardenId: 999 }, 404], [{ userId: null }, 401], [{ csrf: false }, 403]
]) {
  test(`planner enforces access ${JSON.stringify(options)}`, async () => {
    const response = await request(replacements, { planner: true, ...options });
    assert.equal(response.status, status);
    assertOriginalLayout();
    assert.deepEqual(connection.persistedGarden, previousGarden);
    assert.ok(!connection.events.includes('metadata'));
  });
}

test('planner rolls back both halves on a temporary insert failure', async () => {
  connection = transactionConnection({ failAt: 'insert:2', error: databaseError('ECONNRESET') });
  const response = await request(replacements, { planner: true });
  assert.equal(response.status, 503);
  assert.equal(response.body.code, 'SERVICE_UNAVAILABLE');
  assert.equal(response.headers.get('Retry-After'), '60');
  assertOriginalLayout();
  assert.deepEqual(connection.persistedGarden, previousGarden);
});

test('planner preserves showcase protection and reads permissions before committing', async () => {
  connection = transactionConnection({ garden: { demo_showcase_key: 'showcase' } });
  const response = await request([], { planner: true });
  assert.equal(response.status, 200);
  assert.equal(response.body.garden.isDeletionProtected, true);
  assert.equal(response.body.garden.demo_showcase_key, undefined);
  assert.deepEqual(connection.events.slice(-3), ['protection', 'commit', 'release']);
});

test('planner rolls back if preparing the protected garden response fails', async () => {
  connection = transactionConnection({ garden: { demo_showcase_key: 'showcase' }, failAt: 'protection' });
  const response = await request([], { planner: true });
  assert.equal(response.status, 500);
  assertOriginalLayout();
  assert.deepEqual(connection.persistedGarden, { ...previousGarden, demo_showcase_key: 'showcase' });
});

test('successful replacement commits every requested plant and preserves other gardens', async () => {
  const response = await request(replacements);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { message: 'Plants saved successfully', plantsAdded: 2, totalPlants: 2 });
  assert.equal(acquisitions, 1);
  assert.deepEqual(connection.persisted, [...otherGardenLayout,
    ...replacements.map(plant => ({ garden_id: 4, ...plant }))]);
  assert.deepEqual(connection.events, ['begin', 'ownership', 'delete', 'insert:1', 'insert:2', 'commit', 'release']);
});

test('explicit empty replacement commits a cleared garden', async () => {
  const response = await request([]);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { message: 'Plants saved successfully', plantsAdded: 0, totalPlants: 0 });
  assert.deepEqual(connection.persisted, otherGardenLayout);
  assert.deepEqual(connection.events, ['begin', 'ownership', 'delete', 'commit', 'release']);
});

for (const [phase, expectedEvents] of [
  ['begin', ['begin']],
  ['ownership', ['begin', 'ownership']],
  ['delete', ['begin', 'ownership', 'delete']],
  ['insert:1', ['begin', 'ownership', 'delete', 'insert:1']],
  ['insert:2', ['begin', 'ownership', 'delete', 'insert:1', 'insert:2']],
  ['commit', ['begin', 'ownership', 'delete', 'insert:1', 'insert:2', 'commit']]
]) {
  test(`${phase} failure returns an error and rolls back to the previous layout`, async () => {
    connection = transactionConnection({ failAt: phase });
    const response = await request(replacements);
    assert.equal(response.status, 500);
    assert.equal(response.body.message, 'Failed to save plants');
    assert.equal(response.body.plantsAdded, undefined);
    assertOriginalLayout();
    assert.deepEqual(connection.events, [...expectedEvents, 'rollback', 'release']);
  });
}

test('plant conversion failure after deletion also preserves the previous layout', async () => {
  const response = await request([replacements[0], null]);
  assert.equal(response.status, 500);
  assertOriginalLayout();
  assert.deepEqual(connection.events, ['begin', 'ownership', 'delete', 'insert:1', 'rollback', 'release']);
});

test('temporary insert failure rolls back and retains the database-unavailable response', async () => {
  connection = transactionConnection({ failAt: 'insert:2', error: databaseError('ECONNRESET') });
  const response = await request(replacements);
  assert.equal(response.status, 503);
  assert.equal(response.body.code, 'SERVICE_UNAVAILABLE');
  assert.equal(response.headers.get('Retry-After'), '60');
  assertOriginalLayout();
  assert.deepEqual(connection.events.slice(-2), ['rollback', 'release']);
});

test('connection acquisition failure retains the database-unavailable response without changing data', async () => {
  acquisitionError = databaseError('ECONNREFUSED');
  const response = await request(replacements);
  assert.equal(response.status, 503);
  assert.equal(response.body.code, 'SERVICE_UNAVAILABLE');
  assert.equal(response.headers.get('Retry-After'), '60');
  assertOriginalLayout();
  assert.deepEqual(connection.events, []);
});

test('rollback failure destroys the connection and preserves the original error', async () => {
  const originalError = databaseError('ECONNRESET');
  connection = transactionConnection({ failAt: 'insert:2', error: originalError,
    rollbackError: databaseError() });
  await assert.rejects(replacePlantedItemsForGarden('4', 12, replacements), error => error === originalError);
  assertOriginalLayout();
  assert.deepEqual(connection.events, ['begin', 'ownership', 'delete', 'insert:1', 'insert:2', 'rollback', 'destroy']);
});

for (const [description, options] of [
  ['another user', { userId: 99 }],
  ['a missing garden', { gardenId: 999 }]
]) {
  test(`replacement rejects ${description} before deletion`, async () => {
    const response = await request(replacements, options);
    assert.equal(response.status, 404);
    assert.equal(response.body.code, 'GARDEN_NOT_FOUND');
    assertOriginalLayout();
    assert.deepEqual(connection.events, ['begin', 'ownership', 'rollback', 'release']);
  });
}

for (const [description, options, status] of [
  ['unauthenticated', { userId: null }, 401],
  ['missing CSRF header', { csrf: false }, 403]
]) {
  test(`${description} requests never acquire a connection`, async () => {
    const response = await request(replacements, options);
    assert.equal(response.status, status);
    assert.equal(acquisitions, 0);
    assertOriginalLayout();
  });
}
