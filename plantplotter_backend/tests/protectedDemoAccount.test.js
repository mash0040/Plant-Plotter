const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

process.env.JWT_SECRET = 'test-only-demo-account-secret';
process.env.NODE_ENV = 'test';

let users;
let gardens;
let queries;
let transactions;
let sentEmails;
let lookupError;
let passwordHash;
const execute = async (sql, params) => {
  // Keep the demo-identity lookup assertions independent of session verification.
  if (sql === 'SELECT session_version FROM users WHERE id = ? AND is_active = TRUE') {
    return [users.filter(user => user.id === params[0]).map(user => ({ session_version: user.session_version }))];
  }
  queries.push({ sql, params });
  if (lookupError) throw lookupError;
  if (sql.startsWith('SELECT')) {
    if (sql.includes('reset_password_token_hash = ?')) {
      assert.match(sql, /SELECT id, email, reset_password_expires/);
      return [users.filter(user => user.reset_password_token_hash === params[0])];
    }
    if (sql.includes('WHERE email = ?')) {
      const found = users.filter(user => user.email.toLowerCase() === params[0].toLowerCase()
        && (!sql.includes('id != ?') || user.id !== params[1]));
      return [found.map(user => ({ ...user }))];
    }
    assert.match(sql, /FROM users WHERE id = \?/);
    const found = users.filter(user => user.id === params[0]);
    if (sql === 'SELECT id, email FROM users WHERE id = ?') {
      return [found.map(({ id, email }) => ({ id, email }))];
    }
    return [found.map(({ id, username, email, preferences, role }) => ({ id, username, email, preferences, role }))];
  }
  if (sql.startsWith('UPDATE users SET username')) {
    assert.equal(sql, 'UPDATE users SET username = ?, updated_at = NOW() WHERE id = ?');
    const user = users.find(user => user.id === params[1]);
    user.username = params[0];
    return [{ affectedRows: 1 }];
  }
  if (/^UPDATE users\s+SET reset_password_token_hash = \?/.test(sql)) {
    const user = users.find(user => user.id === params[2]);
    user.reset_password_token_hash = params[0];
    user.reset_password_expires = params[1];
    return [{ affectedRows: 1 }];
  }
  if (sql.startsWith('DELETE FROM users')) {
    users = users.filter(user => user.id !== params[0]);
    gardens = gardens.filter(garden => garden.user_id !== params[0]);
    return [{ affectedRows: 1 }];
  }
  throw new Error(`Unexpected database mutation: ${sql}`);
};
const dbPath = require.resolve('../config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  execute,
  getConnection: async () => {
    transactions.push('connection');
    return {
      execute,
      beginTransaction: async () => { transactions.push('begin'); },
      commit: async () => { transactions.push('commit'); },
      rollback: async () => { transactions.push('rollback'); },
      release: () => { transactions.push('release'); }
    };
  }
} };
const emailPath = require.resolve('../utils/emailService');
require.cache[emailPath] = { id: emailPath, filename: emailPath, loaded: true,
  exports: { sendPasswordResetEmail: async (email) => { sentEmails.push(email); } } };

const userRouter = require('../routes/users');
const authRouter = require('../routes/auth');
const { requireCsrfProtection } = require('../middleware/csrfProtection');
const { getAuthCookieName } = require('../utils/authCookie');
const { hashResetToken, PASSWORD_RESET_SUCCESS_MESSAGE } = require('../utils/passwordResetService');

let server;
let baseUrl;
before(async () => {
  passwordHash = await bcrypt.hash('TestPass123', 4);
  const app = express();
  app.use(express.json(), cookieParser(), requireCsrfProtection);
  app.use('/api/users', userRouter);
  app.use('/api/auth', authRouter);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
beforeEach(() => {
  users = [
    { id: 7, username: 'Demo', email: 'demo@plantplotter.com', password_hash: passwordHash, session_version: 0, role: 'user', preferences: '{}' },
    { id: 12, username: 'Gardener', email: 'gardener@example.com', password_hash: passwordHash, session_version: 0, role: 'user', preferences: '{}' }
  ];
  gardens = [{ id: 1, user_id: 7 }, { id: 2, user_id: 12 }];
  queries = [];
  transactions = [];
  sentEmails = [];
  lookupError = null;
});

const request = async (path, method = 'GET', body, { userId = 7, csrf = true, claims = {} } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (csrf) headers['X-CSRF-Protection'] = '1';
  if (userId !== null) headers.Cookie = `${getAuthCookieName()}=${jwt.sign({ ...claims, id: userId, sessionVersion: 0 }, process.env.JWT_SECRET)}`;
  const response = await fetch(`${baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: response.status, body: await response.json(), cookie: response.headers.get('set-cookie') };
};

for (const [path, method] of [['/users/account', 'DELETE'], ['/users/profile', 'PUT']]) {
  test(`${method} ${path} rejects demo mutations before acquiring a transaction or changing data`, async () => {
    const original = structuredClone({ users, gardens });
    const response = await request(path, method, {
      id: 12, email: 'replacement@example.com', username: 'Replacement', role: 'admin', isProtectedDemo: false
    }, { claims: { email: 'old@example.com', role: 'admin', isProtectedDemo: false } });
    assert.equal(response.status, 403);
    assert.equal(response.body.code, 'DEMO_ACCOUNT_PROTECTED');
    assert.equal(response.cookie, null);
    assert.deepEqual({ users, gardens }, original);
    assert.deepEqual(transactions, []);
    assert.equal(queries.length, 1);
    assert.deepEqual(queries[0].params, [7]);
    assert.match(queries[0].sql, /^SELECT/);
  });

  test(`${method} ${path} fails closed when the stored identity cannot be loaded`, async () => {
    lookupError = Object.assign(new Error('Unavailable'), { code: 'ECONNREFUSED' });
    const response = await request(path, method, { username: 'Changed', email: 'changed@example.com' });
    assert.equal(response.status, 503);
    assert.equal(response.body.code, 'SERVICE_UNAVAILABLE');
    assert.equal(queries.length, 1);
    assert.deepEqual(transactions, []);
    assert.equal(users.length, 2);
    assert.equal(gardens.length, 2);
  });

  test(`${method} ${path} still requires authentication and CSRF protection`, async () => {
    assert.equal((await request(path, method, {}, { userId: null })).status, 401);
    assert.equal((await request(path, method, {}, { csrf: false })).body.code, 'CSRF_VALIDATION_FAILED');
    assert.equal(queries.length, 0);
  });
}

test('stored demo email casing and surrounding whitespace do not bypass protection', async () => {
  users[0].email = ' Demo@PlantPlotter.COM ';
  assert.equal((await request('/users/account', 'DELETE')).body.code, 'DEMO_ACCOUNT_PROTECTED');
  assert.deepEqual(transactions, []);
});

for (const [userId, isProtectedDemo] of [[7, true], [12, false]]) {
  test(`profile and login expose authoritative demo protection for user ${userId}`, async () => {
    const profile = await request('/users/profile', 'GET', undefined, { userId });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.isProtectedDemo, isProtectedDemo);
    const login = await request('/auth/login', 'POST', {
      email: users.find(user => user.id === userId).email, password: 'TestPass123', isProtectedDemo: !isProtectedDemo
    }, { userId: null });
    assert.equal(login.status, 200);
    assert.equal(login.body.user.isProtectedDemo, isProtectedDemo);
    assert.ok(login.cookie);
  });
}

test('normal profile updates ignore misleading demo fields in body and JWT', async () => {
  const options = { userId: 12, claims: { email: 'demo@plantplotter.com', isProtectedDemo: true } };
  const profile = await request('/users/profile', 'PUT', {
    id: 7, username: 'Updated Gardener', isProtectedDemo: true
  }, options);
  assert.equal(profile.status, 200);
  assert.equal(profile.body.user.isProtectedDemo, false);
  assert.equal(profile.body.user.email, 'gardener@example.com');
  assert.equal(users[1].username, 'Updated Gardener');
  assert.equal(users[1].email, 'gardener@example.com');
  assert.equal(users[0].username, 'Demo');
});

for (const userId of [null, 7, 12]) {
  test(`removed preferences endpoint returns 404 without touching account data for user ${userId}`, async () => {
    const original = structuredClone({ users, gardens });
    const headers = { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' };
    if (userId !== null) {
      headers.Cookie = `${getAuthCookieName()}=${jwt.sign({ id: userId, sessionVersion: 0 }, process.env.JWT_SECRET)}`;
    }
    const response = await fetch(`${baseUrl}/users/preferences`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ garden: { defaultUnits: 'metric' }, arbitrary: true })
    });
    assert.equal(response.status, 404);
    await response.text();
    assert.deepEqual({ users, gardens }, original);
    assert.deepEqual(queries, []);
    assert.deepEqual(transactions, []);
  });
}

test('normal profile requires a nonblank display name without requiring email', async () => {
  const original = structuredClone(users);
  for (const body of [{}, { username: '' }, { username: '   ' }, { username: null }, { username: 123 }]) {
    const response = await request('/users/profile', 'PUT', body, { userId: 12 });
    assert.equal(response.status, 400);
    assert.equal(response.body.code, 'VALIDATION_ERROR');
    assert.equal(response.body.message, 'Username is required');
  }
  assert.deepEqual(users, original);
  assert.ok(queries.every(query => query.sql.startsWith('SELECT')));
});

for (const email of ['replacement@example.com', 'gardener@example.com', 'demo@plantplotter.com', '', null, 123, {}, []]) {
  test(`normal profile rejects email field ${JSON.stringify(email)} without changing any profile data`, async () => {
    const original = structuredClone(users);
    const response = await request('/users/profile', 'PUT', { username: 'Changed', email }, { userId: 12 });
    assert.equal(response.status, 400);
    assert.equal(response.body.code, 'EMAIL_READ_ONLY');
    assert.equal(response.body.message, 'Email cannot be changed in profile settings.');
    assert.deepEqual(users, original);
    assert.ok(queries.every(query => query.sql.startsWith('SELECT')));
  });
}

test('display-name updates allow duplicates and keep profile, login, and recovery on the original email', async () => {
  const profile = await request('/users/profile', 'PUT', { username: '  Demo  ' }, { userId: 12 });
  assert.equal(profile.status, 200);
  assert.equal(profile.body.user.username, 'Demo');
  assert.equal(profile.body.user.email, 'gardener@example.com');
  assert.deepEqual(profile.body.user.preferences, {});
  assert.equal(users[1].username, 'Demo');
  assert.equal(users[1].email, 'gardener@example.com');

  const refreshed = await request('/users/profile', 'GET', undefined, { userId: 12 });
  assert.equal(refreshed.status, 200);
  assert.equal(refreshed.body.username, 'Demo');
  assert.equal(refreshed.body.email, 'gardener@example.com');

  const login = await request('/auth/login', 'POST', {
    email: 'gardener@example.com', password: 'TestPass123'
  }, { userId: null });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.email, 'gardener@example.com');
  assert.ok(login.cookie);

  const recovery = await request('/auth/forgot-password', 'POST', { email: 'gardener@example.com' }, { userId: null });
  assert.equal(recovery.status, 200);
  assert.equal(recovery.body.message, PASSWORD_RESET_SUCCESS_MESSAGE);
  assert.equal(sentEmails.length, 1);
  assert.equal(sentEmails[0].to, 'gardener@example.com');
  assert.ok(users[1].reset_password_token_hash);
});

test('normal account deletion commits and clears the session without affecting the demo account', async () => {
  const response = await request('/users/account', 'DELETE', { id: 7 }, { userId: 12 });
  assert.equal(response.status, 200);
  assert.deepEqual(transactions, ['connection', 'begin', 'commit', 'release']);
  assert.deepEqual(users.map(user => user.id), [7]);
  assert.deepEqual(gardens, [{ id: 1, user_id: 7 }]);
  assert.match(response.cookie, /Expires=Thu, 01 Jan 1970/);
});

test('a missing account is rejected by session verification and clears its cookie', async () => {
  const response = await request('/users/account', 'DELETE', {}, { userId: 99 });
  assert.equal(response.status, 401);
  assert.equal(response.body.code, 'INVALID_TOKEN');
  assert.match(response.cookie, /Expires=Thu, 01 Jan 1970/);
  assert.deepEqual(transactions, []);
});

test('demo and normal users can still sign out', async () => {
  for (const userId of [7, 12]) {
    const response = await request('/auth/logout', 'POST', {}, { userId });
    assert.equal(response.status, 200);
    assert.match(response.cookie, /Expires=Thu, 01 Jan 1970/);
  }
  assert.equal(queries.length, 0);
});

test('direct demo forgot-password requests return the generic response with no writes or email', async () => {
  const original = structuredClone(users);
  const response = await request('/auth/forgot-password', 'POST', { email: ' DEMO@PlantPlotter.COM ' }, { userId: null });
  const missing = await request('/auth/forgot-password', 'POST', { email: 'missing@example.com' }, { userId: null });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { message: PASSWORD_RESET_SUCCESS_MESSAGE });
  assert.deepEqual(response.body, missing.body);
  assert.deepEqual(users, original);
  assert.deepEqual(sentEmails, []);
  assert.ok(queries.every(query => query.sql.startsWith('SELECT')));
});

test('a previously issued demo reset token cannot change its password', async () => {
  users[0].reset_password_token_hash = hashResetToken('previous-demo-token');
  users[0].reset_password_expires = new Date(Date.now() + 60000);
  const original = structuredClone(users);
  const response = await request('/auth/reset-password', 'POST', {
    token: 'previous-demo-token', password: 'NewPass123', confirmPassword: 'NewPass123', userId: 12, email: 'gardener@example.com'
  }, { userId: null });
  assert.equal(response.status, 400);
  assert.equal(response.body.message, 'Password reset link is invalid or expired.');
  assert.deepEqual(users, original);
  assert.equal(queries.length, 1);
  assert.deepEqual(sentEmails, []);
});
