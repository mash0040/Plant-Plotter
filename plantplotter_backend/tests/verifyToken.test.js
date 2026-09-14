const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-verify-token-secret';
process.env.NODE_ENV = 'development';

const jwt = require('jsonwebtoken');
let storedUsers;
let lookupError;
let lookups;
const dbPath = require.resolve('../config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  execute: async (sql, params) => {
    lookups += 1;
    assert.equal(sql, 'SELECT session_version FROM users WHERE id = ? AND is_active = TRUE');
    assert.deepEqual(params, [12]);
    if (lookupError) throw lookupError;
    return [storedUsers];
  }
} };
beforeEach(() => { storedUsers = [{ session_version: 0 }]; lookupError = null; lookups = 0; });
const verifyToken = require('../middleware/verifyToken');
const { getAuthCookieName } = require('../utils/authCookie');

const createResponse = () => ({
  body: null,
  clearedCookies: [],
  statusCode: null,
  headers: {},
  set(name, value) {
    this.headers[name] = value;
    return this;
  },
  clearCookie(...args) {
    this.clearedCookies.push(args);
    return this;
  },
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

test('authenticates a protected request from the session cookie', async () => {
  const token = jwt.sign({
    id: 12,
    email: 'garden@example.com',
    username: 'Garden User',
    sessionVersion: 0
  }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const request = {
    cookies: { [getAuthCookieName()]: token }
  };
  const response = createResponse();
  let nextCalled = false;

  await verifyToken(request, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.equal(lookups, 1);
  assert.deepEqual(response.clearedCookies, []);
  assert.deepEqual(request.user, {
    id: 12,
    email: 'garden@example.com',
    username: 'Garden User'
  });
});

test('does not accept a bearer token without the session cookie', async () => {
  const response = createResponse();

  await verifyToken({ cookies: {}, headers: { authorization: 'Bearer old-token' } }, response, () => {
    throw new Error('next should not be called');
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.code, 'AUTH_REQUIRED');
  assert.equal(lookups, 0);
});

test('clears an expired session cookie and returns an expiry code', async () => {
  const expiredToken = jwt.sign(
    { id: 12, email: 'garden@example.com' },
    process.env.JWT_SECRET,
    { expiresIn: -1 }
  );
  const response = createResponse();

  await verifyToken({
    cookies: { [getAuthCookieName()]: expiredToken }
  }, response, () => {
    throw new Error('next should not be called');
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.code, 'TOKEN_EXPIRED');
  assert.equal(response.clearedCookies[0][0], getAuthCookieName());
  assert.equal(lookups, 0);
});

const checkToken = async token => {
  const response = createResponse();
  const request = { cookies: { [getAuthCookieName()]: token } };
  let nextCalled = false;
  await verifyToken(request, response, () => { nextCalled = true; });
  return { response, request, nextCalled };
};
const sign = (claims = {}, options = {}) => jwt.sign(
  { id: 12, sessionVersion: 0, ...claims }, process.env.JWT_SECRET, { expiresIn: '1h', ...options }
);

test('ignores account role claims in existing versioned cookies', async () => {
  const { request, nextCalled } = await checkToken(sign({ role: 'admin' }));
  assert.equal(nextCalled, true);
  assert.equal(Object.hasOwn(request.user, 'role'), false);
  assert.equal(lookups, 1);
});

for (const version of [undefined, null, '0', -1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
  test(`rejects missing or malformed session version ${version} without DB access`, async () => {
    const { response, request, nextCalled } = await checkToken(sign({ sessionVersion: version }));
    assert.equal(response.statusCode, 401);
    assert.equal(response.body.code, 'INVALID_TOKEN');
    assert.equal(response.clearedCookies[0][0], getAuthCookieName());
    assert.equal(nextCalled, false);
    assert.equal(request.user, undefined);
    assert.equal(lookups, 0);
  });
}

test('checks the current version on every request, rejecting an old cookie after reset', async () => {
  const token = sign();
  assert.equal((await checkToken(token)).nextCalled, true);
  storedUsers[0].session_version = 1;
  const { response, request, nextCalled } = await checkToken(token);
  assert.equal(response.statusCode, 401);
  assert.equal(response.body.code, 'INVALID_TOKEN');
  assert.equal(response.clearedCookies[0][0], getAuthCookieName());
  assert.equal(nextCalled, false);
  assert.equal(request.user, undefined);
  assert.equal((await checkToken(sign({ sessionVersion: 1 }))).nextCalled, true);
  assert.equal(lookups, 3);
});

for (const rows of [[], [{ session_version: null }], [{ session_version: '0' }], [{ session_version: 1 }]]) {
  test(`rejects missing/inactive accounts or unmatched stored versions: ${JSON.stringify(rows)}`, async () => {
    storedUsers = rows;
    const { response, nextCalled } = await checkToken(sign());
    assert.equal(response.statusCode, 401);
    assert.equal(response.body.code, 'INVALID_TOKEN');
    assert.equal(response.clearedCookies.length, 1);
    assert.equal(nextCalled, false);
  });
}

for (const [code, status] of [['ECONNREFUSED', 503], ['ER_BAD_FIELD_ERROR', 500]]) {
  test(`database failure ${code} denies access without clearing the cookie`, async () => {
    lookupError = Object.assign(new Error('Private database details'), { code });
    const { response, request, nextCalled } = await checkToken(sign());
    assert.equal(response.statusCode, status);
    assert.deepEqual(response.clearedCookies, []);
    assert.equal(nextCalled, false);
    assert.equal(request.user, undefined);
    assert.doesNotMatch(response.body.message, /Private database details/);
    if (status === 503) {
      assert.equal(response.body.code, 'SERVICE_UNAVAILABLE');
      assert.equal(response.headers['Retry-After'], '60');
    }
    lookupError = null;
    assert.equal((await checkToken(sign())).nextCalled, true);
  });
}

for (const [name, makeToken, code] of [
  ['malformed', () => 'invalid-token', 'INVALID_TOKEN'],
  ['wrong signature', () => jwt.sign({ id: 12, sessionVersion: 0 }, 'wrong-secret'), 'INVALID_TOKEN'],
  ['expired', () => sign({}, { expiresIn: -1 }), 'TOKEN_EXPIRED'],
  ['not yet valid', () => sign({}, { notBefore: '1h' }), 'INVALID_TOKEN'],
  ['missing user ID', () => sign({ id: null }), 'MISSING_USER_ID'],
  ['invalid user ID', () => sign({ id: 'invalid' }), 'INVALID_USER_ID_FORMAT']
]) {
  test(`${name} cookie is cleared before database access`, async () => {
    const { response, nextCalled } = await checkToken(makeToken());
    assert.equal(response.statusCode, 401);
    assert.equal(response.body.code, code);
    assert.equal(response.clearedCookies[0][0], getAuthCookieName());
    assert.equal(nextCalled, false);
    assert.equal(lookups, 0);
  });
}
