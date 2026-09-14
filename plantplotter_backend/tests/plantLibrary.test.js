const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-only-read-only-catalogue-secret';
process.env.NODE_ENV = 'test';

let queries;
let catalogueError;
const plants = [
  { id: 'basil', name: 'Basil', category: 'herbs', companion_plants: '["tomato"]', avoid_plants: null, soil_types: 'loamy, sandy' },
  { id: 'tomato', name: 'Tomato', category: 'vegetables', companion_plants: ['basil'], avoid_plants: 'fennel', soil_types: '["loamy"]' }
];
const dbPath = require.resolve('../config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  execute: async (sql, params) => {
    queries.push({ sql, params });
    if (sql === 'SELECT session_version FROM users WHERE id = ? AND is_active = TRUE') {
      return [[{ session_version: 0 }]];
    }
    assert.match(sql.trim(), /^SELECT /);
    assert.match(sql, /FROM plant_library/);
    if (catalogueError) throw catalogueError;
    if (params) return [plants.filter(plant => plant.id === params[0])];
    assert.match(sql, /ORDER BY category, name/);
    return [structuredClone(plants)];
  }
} };
const plantLibraryRouter = require('../routes/plantLibrary');
const { requireCsrfProtection } = require('../middleware/csrfProtection');
const { getAuthCookieName } = require('../utils/authCookie');

let server;
let baseUrl;
before(async () => {
  const app = express();
  app.use(express.json(), cookieParser(), requireCsrfProtection);
  app.use('/api/plants', plantLibraryRouter);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/plants`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
beforeEach(() => { queries = []; catalogueError = null; });

const request = (path = '', method = 'GET', claims = {}) => {
  const headers = { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' };
  if (claims !== null) {
    headers.Cookie = `${getAuthCookieName()}=${jwt.sign({ id: 12, sessionVersion: 0, ...claims }, process.env.JWT_SECRET)}`;
  }
  return fetch(`${baseUrl}${path}`, {
    method, headers,
    ...(method === 'GET' ? {} : { body: JSON.stringify({ id: 'basil', name: 'Changed', category: 'herbs' }) })
  });
};

test('authenticated catalogue browsing preserves category ordering, list parsing and defaults', async () => {
  const response = await request();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.map(plant => plant.id), ['basil', 'tomato']);
  assert.deepEqual(body[0].companion_plants, ['tomato']);
  assert.deepEqual(body[0].avoid_plants, []);
  assert.deepEqual(body[0].soil_types, ['loamy', 'sandy']);
  assert.equal(body[0].sunlight, 'Full Sun');
  assert.equal(body[0].spacing, 12);
  assert.deepEqual(body[1].companion_plants, ['basil']);
  assert.deepEqual(body[1].avoid_plants, ['fennel']);
});

test('individual catalogue records remain readable with normalized plant lists', async () => {
  const response = await request('/tomato');
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.id, 'tomato');
  assert.deepEqual(body.soil_types, ['loamy']);
  assert.deepEqual(body.avoid_plants, ['fennel']);
  assert.equal(body.water_needs, 'Moderate');
});

test('unknown catalogue records return the existing not-found response', async () => {
  const response = await request('/missing');
  assert.equal(response.status, 404);
  assert.equal((await response.json()).code, 'PLANT_NOT_FOUND');
});

for (const path of ['', '/basil']) {
  test(`catalogue read ${path || '/'} still requires authentication`, async () => {
    const response = await request(path, 'GET', null);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).code, 'AUTH_REQUIRED');
    assert.deepEqual(queries, []);
  });

  test(`catalogue read ${path || '/'} reports temporary database outages`, async () => {
    catalogueError = Object.assign(new Error('Unavailable'), { code: 'ECONNREFUSED' });
    const response = await request(path);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'SERVICE_UNAVAILABLE');
  });

  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    for (const [name, claims] of [['anonymous', null], ['normal session', {}], ['legacy admin session', { role: 'admin' }]]) {
      test(`${method} ${path || '/'} is unavailable for ${name} without database access`, async () => {
        const response = await request(path, method, claims);
        assert.equal(response.status, 404);
        await response.text();
        assert.deepEqual(queries, []);
      });
    }
  }
}
