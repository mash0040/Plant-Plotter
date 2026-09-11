const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-only-activity-secret';
process.env.NODE_ENV = 'development';

// Use the real routes, authentication and CSRF middleware with a scripted DB.
let queries;
let execute;
const dbPath = require.resolve('../config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  execute: async (sql, params) => { queries.push({ sql, params }); return execute(sql, params); }
} };
const router = require('../routes/activities');
const { requireCsrfProtection } = require('../middleware/csrfProtection');
const { getAuthCookieName } = require('../utils/authCookie');

let server;
let baseUrl;
before(async () => {
  const app = express();
  app.use(express.json(), cookieParser(), requireCsrfProtection);
  app.use('/api/activities', router);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/activities`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
beforeEach(() => {
  queries = [];
  execute = () => { throw new Error('Unexpected database query'); };
});

const request = async (method, body, { userId = 12, csrf = true } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (csrf) headers['X-CSRF-Protection'] = '1';
  if (userId !== null) headers.Cookie = `${getAuthCookieName()}=${jwt.sign({ id: userId }, process.env.JWT_SECRET)}`;
  const response = await fetch(`${baseUrl}${method === 'PUT' ? '/15' : ''}`, {
    method, headers, body: JSON.stringify(body)
  });
  return { status: response.status, body: await response.json() };
};
const activity = { garden_id: 7, activity_type: 'watered', plant_name: 'Basil',
  notes: 'Near the fence', activity_date: '2026-09-05' };

for (const method of ['POST', 'PUT']) {
  for (const time of ['24:00', '12:60', '12:30:60', '1:00 PM', '9:00', 900, {}, []]) {
    test(`${method} rejects invalid performed time ${JSON.stringify(time)} before DB access`, async () => {
      const response = await request(method, { ...activity, activity_time: time });
      assert.equal(response.status, 400);
      assert.equal(response.body.code, 'VALIDATION_ERROR');
      assert.ok(response.body.errors.activity_time);
      assert.equal(queries.length, 0);
    });
  }

  for (const [input, stored] of [['09:15', '09:15:00'], ['00:00', '00:00:00'], ['23:59:59', '23:59:59'], [null, null], ['', null]]) {
    test(`${method} persists explicit performed time ${JSON.stringify(input)} without replacing the creation timestamp`, async () => {
      const saved = { ...activity, id: 15, activity_time: stored, created_at: '2026-09-11T17:30:00.000Z' };
      execute = (sql, params) => {
        if (queries.length === 1) return [[{ id: 15 }]];
        if (queries.length === 2) {
          if (method === 'POST') {
            assert.equal(params[6], stored);
            assert.match(sql, /created_at/);
          } else {
            assert.match(sql, /activity_time = \?/);
            assert.doesNotMatch(sql, /created_at/);
            assert.equal(params[4], stored);
            assert.deepEqual(params.slice(5), ['15', 12]);
          }
          return [{ insertId: 15, affectedRows: 1 }];
        }
        return [[saved]];
      };
      const response = await request(method, { ...activity, activity_time: input });
      assert.equal(response.status, method === 'POST' ? 201 : 200);
      assert.deepEqual(response.body, saved);
    });
  }

  for (const type of ['unsupported', 'watering', '', null, 1, {}, []]) {
    test(`${method} rejects activity type ${JSON.stringify(type)} with 400 before accessing the DB`, async () => {
      const response = await request(method, { ...activity, activity_type: type });
      assert.equal(response.status, 400);
      assert.equal(response.body.code, 'VALIDATION_ERROR');
      assert.match(response.body.message, /activity[ _]type/);
      assert.equal(queries.length, 0);
    });
  }

  for (const type of ['planted', 'watered', 'fertilized', 'harvested', 'pruned', 'weeded']) {
    test(`${method} accepts ${type} and returns the authoritative saved activity`, async () => {
      const saved = { ...activity, id: 15, user_id: 12, activity_type: type,
        activity_time: '23:58:12', created_at: '2026-09-06T03:58:12.000Z' };
      execute = (sql, params) => {
        if (queries.length === 1) {
          assert.match(sql, /WHERE id = \? AND user_id = \?/);
          assert.deepEqual(params, [method === 'POST' ? 7 : '15', 12]);
          return [[{ id: method === 'POST' ? 7 : 15 }]];
        }
        if (queries.length === 2) {
          if (method === 'POST') {
            assert.match(sql, /INSERT INTO garden_activities/);
            assert.deepEqual(params.slice(0, 6), [12, 7, type, 'Basil', 'Near the fence', '2026-09-05']);
            assert.match(params[6], /^\d{2}:\d{2}:\d{2}$/);
          } else {
            assert.match(sql, /UPDATE garden_activities/);
            assert.deepEqual(params, [type, 'Basil', 'Near the fence', '2026-09-05', '15', 12]);
          }
          return [{ insertId: 15, affectedRows: 1 }];
        }
        assert.equal(queries.length, 3);
        assert.match(sql, /SELECT \* FROM garden_activities WHERE id = \? AND user_id = \?/);
        assert.deepEqual(params, [method === 'POST' ? 15 : '15', 12]);
        return [[saved]];
      };
      const response = await request(method, { ...activity, activity_type: type });
      assert.equal(response.status, method === 'POST' ? 201 : 200);
      assert.deepEqual(response.body, saved);
      assert.equal(queries.length, 3);
    });
  }

  test(`${method} keeps ownership and not-found checks`, async () => {
    execute = (sql, params) => {
      assert.match(sql, /WHERE id = \? AND user_id = \?/);
      assert.equal(params[1], 99);
      return [[]];
    };
    const response = await request(method, activity, { userId: 99 });
    assert.equal(response.status, 404);
    assert.equal(response.body.code, method === 'POST' ? 'GARDEN_NOT_FOUND' : 'ACTIVITY_NOT_FOUND');
    assert.equal(queries.length, 1);
  });

  test(`${method} requires authentication and CSRF protection`, async () => {
    assert.equal((await request(method, activity, { userId: null })).status, 401);
    assert.equal((await request(method, activity, { csrf: false })).status, 403);
    assert.equal(queries.length, 0);
  });
}

test('POST reports database unavailability without attempting a mutation', async () => {
  execute = () => { throw Object.assign(new Error('Connection refused'), { code: 'ECONNREFUSED' }); };
  const response = await request('POST', activity);
  assert.equal(response.status, 503);
  assert.equal(response.body.code, 'SERVICE_UNAVAILABLE');
  assert.equal(queries.length, 1);
});
