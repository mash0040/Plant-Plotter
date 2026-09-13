const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-only-session-revocation-secret';
process.env.NODE_ENV = 'test';

let users;
let sentEmails;
let passwordHash;
let pauseLogin;
const dbPath = require.resolve('../config/db');
// Stateful SQL double with real controllers, hashing, JWTs, cookie and CSRF middleware.
// The reset models one conditional atomic UPDATE; no live database is changed.
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  execute: async (sql, params) => {
    if (sql.startsWith('SELECT session_version FROM users')) {
      assert.equal(sql, 'SELECT session_version FROM users WHERE id = ? AND is_active = TRUE');
      return [users.filter(user => user.id === params[0] && user.is_active)
        .map(user => ({ session_version: user.session_version }))];
    }
    if (sql.startsWith('SELECT') && sql.includes('WHERE email = ?')) {
      const found = users.filter(user => user.email === params[0] && user.is_active).map(user => ({ ...user }));
      if (sql.includes('password_hash') && pauseLogin) await pauseLogin();
      return [found];
    }
    if (sql.startsWith('INSERT INTO users')) {
      assert.match(sql, /session_version, created_at, updated_at\) VALUES \(\?, \?, \?, \?, \?, 0, NOW\(\), NOW\(\)\)/);
      const [username, email, password_hash, role, is_active] = params;
      const id = users.length + 1;
      users.push({ id, username, email, password_hash, role, is_active, session_version: 0 });
      return [{ insertId: id }];
    }
    if (sql.includes('SET reset_password_token_hash = ?')) {
      const user = users.find(user => user.id === params[2]);
      user.reset_password_token_hash = params[0];
      user.reset_password_expires = params[1];
      return [{ affectedRows: 1 }];
    }
    if (sql.startsWith('SELECT') && sql.includes('WHERE reset_password_token_hash = ?')) {
      return [users.filter(user => user.reset_password_token_hash === params[0]).map(user => ({ ...user }))];
    }
    assert.match(sql, /SET password_hash = \?,\s+session_version = session_version \+ 1,/);
    assert.match(sql, /WHERE id = \?\s+AND reset_password_token_hash = \?\s+AND reset_password_expires > \?/);
    const [hash, id, tokenHash, now] = params;
    const user = users.find(user => user.id === id && user.reset_password_token_hash === tokenHash
      && user.reset_password_expires > now);
    if (!user) return [{ affectedRows: 0 }];
    user.password_hash = hash;
    user.session_version += 1;
    user.reset_password_token_hash = null;
    user.reset_password_expires = null;
    return [{ affectedRows: 1 }];
  }
} };
const emailPath = require.resolve('../utils/emailService');
require.cache[emailPath] = { id: emailPath, filename: emailPath, loaded: true,
  exports: { sendPasswordResetEmail: async email => { sentEmails.push(email); } } };
const authRouter = require('../routes/auth');
const { requireCsrfProtection } = require('../middleware/csrfProtection');

let server;
let baseUrl;
before(async () => {
  passwordHash = await bcrypt.hash('OldPass123', 4);
  const app = express();
  app.use(express.json(), cookieParser(), requireCsrfProtection);
  app.use('/api/auth', authRouter);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/auth`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
beforeEach(() => {
  users = [1, 2].map(id => ({ id, username: `Gardener ${id}`, email: `user${id}@example.com`,
    password_hash: passwordHash, role: 'user', is_active: true, session_version: 0 }));
  sentEmails = [];
  pauseLogin = null;
});
const request = async (path, body, cookie) => {
  const headers = { 'Content-Type': 'application/json', 'X-CSRF-Protection': '1' };
  if (cookie) headers.Cookie = cookie;
  const response = await fetch(`${baseUrl}/${path}`, {
    method: body === undefined ? 'GET' : 'POST', headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const setCookie = response.headers.get('set-cookie');
  return { status: response.status, body: await response.json(), setCookie, cookie: setCookie?.split(';')[0] };
};
const login = (password = 'OldPass123', email = 'user1@example.com') => request('login', { email, password });
const verify = cookie => request('verify', undefined, cookie);
const getResetToken = async () => {
  assert.equal((await request('forgot-password', { email: 'user1@example.com' })).status, 200);
  return new URL(sentEmails.at(-1).resetUrl).searchParams.get('token');
};
const reset = (token, password = 'NewPass123') => request('reset-password', { token, password, confirmPassword: password });
const claims = cookie => jwt.verify(cookie.slice(cookie.indexOf('=') + 1), process.env.JWT_SECRET);

test('successful reset revokes all old sessions, preserves other accounts, and allows a fresh login', async () => {
  const first = await login();
  const second = await login();
  const other = await login('OldPass123', 'user2@example.com');
  for (const session of [first, second, other]) {
    assert.equal(session.status, 200);
    assert.equal((await verify(session.cookie)).status, 200);
  }
  assert.equal(claims(first.cookie).sessionVersion, 0);
  const token = await getResetToken();
  assert.equal((await verify(first.cookie)).status, 200, 'Requesting recovery does not revoke sessions');
  assert.equal((await reset(token)).status, 200);
  assert.equal(users[0].session_version, 1);
  for (const session of [first, second]) {
    const rejected = await verify(session.cookie);
    assert.equal(rejected.status, 401);
    assert.equal(rejected.body.code, 'INVALID_TOKEN');
    assert.match(rejected.setCookie, /Expires=Thu, 01 Jan 1970/);
  }
  assert.equal((await verify(other.cookie)).status, 200);
  assert.equal((await login()).body.code, 'INVALID_CREDENTIALS');
  const fresh = await login('NewPass123');
  assert.equal(fresh.status, 200);
  assert.equal(claims(fresh.cookie).sessionVersion, 1);
  assert.equal((await verify(fresh.cookie)).status, 200);
  assert.equal((await reset(token, 'OtherPass123')).status, 400);
  assert.equal((await verify(fresh.cookie)).status, 200, 'Reused reset links cannot revoke a new session');
  const logout = await request('logout', {}, fresh.cookie);
  assert.equal(logout.status, 200);
  assert.match(logout.setCookie, /Expires=Thu, 01 Jan 1970/);
  assert.equal((await verify()).body.code, 'AUTH_REQUIRED');
});

test('invalid, expired and validation-failing resets preserve the password and existing session', async () => {
  const session = await login();
  const token = await getResetToken();
  assert.equal((await reset('invalid-token')).status, 400);
  assert.equal((await reset(token, 'short')).status, 400);
  assert.equal((await request('reset-password', { token, password: 'NewPass123', confirmPassword: 'Mismatch123' })).status, 400);
  users[0].reset_password_expires = new Date(0);
  assert.equal((await reset(token)).status, 400);
  assert.equal(users[0].session_version, 0);
  assert.equal(users[0].password_hash, passwordHash);
  assert.equal((await verify(session.cookie)).status, 200);
});

test('registration issues a versioned cookie that can access protected endpoints', async () => {
  const response = await request('register', { username: 'New gardener', email: 'new@example.com', password: 'NewPass123' });
  assert.equal(response.status, 201);
  assert.equal(claims(response.cookie).sessionVersion, 0);
  assert.equal((await verify(response.cookie)).status, 200);
  assert.equal(response.body.token, undefined);
  assert.equal(response.body.user.sessionVersion, undefined);
});

test('a login using the old password that overlaps reset cannot obtain a usable session', { timeout: 5000 }, async () => {
  const token = await getResetToken();
  let releaseLogin;
  let notifyRead;
  const read = new Promise(resolve => { notifyRead = resolve; });
  const gate = new Promise(resolve => { releaseLogin = resolve; });
  pauseLogin = async () => { notifyRead(); await gate; };
  const pendingLogin = login();
  await read;
  try {
    assert.equal((await reset(token)).status, 200);
  } finally {
    pauseLogin = null;
    releaseLogin();
  }
  const staleLogin = await pendingLogin;
  assert.equal(staleLogin.status, 200);
  assert.equal(claims(staleLogin.cookie).sessionVersion, 0);
  assert.equal((await verify(staleLogin.cookie)).status, 401);
  assert.equal((await verify((await login('NewPass123')).cookie)).status, 200);
});
