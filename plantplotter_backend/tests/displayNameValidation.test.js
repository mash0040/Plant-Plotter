const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { validateDisplayName, MIN_DISPLAY_NAME_LENGTH, MAX_DISPLAY_NAME_LENGTH } = require('../utils/displayNameValidation');

process.env.JWT_SECRET = 'test-only-display-name-secret';
process.env.NODE_ENV = 'test';

let users;
let signupDb;
const signupDatabase = require('./helpers/signupDatabase');
let queries;
const dbPath = require.resolve('../config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  getConnection: async () => {
    const connection = await signupDb.getConnection();
    const execute = connection.execute;
    connection.execute = async (sql, params) => { queries.push({ sql, params }); return execute(sql, params); };
    const commit = connection.commit;
    connection.commit = async () => { await commit(); users = signupDb.state.users; };
    return connection;
  },
  execute: async (sql, params) => {
    if (sql.includes('pending_signups') || sql.includes('signup_limits')) return signupDb.execute(sql, params);
    queries.push({ sql, params });
    if (sql.startsWith('SELECT') && sql.includes('WHERE email = ?')) {
      return [users.filter(user => user.email === params[0])];
    }
    if (sql.startsWith('SELECT') && sql.includes('WHERE id = ?')) {
      return [users.filter(user => user.id === params[0]).map(user => ({ ...user }))];
    }
    if (sql.startsWith('INSERT INTO users')) {
      const [username, email] = params;
      const id = users.length + 1;
      users.push({ id, username, email, session_version: 0, is_active: true });
      return [{ insertId: id }];
    }
    if (sql.startsWith('UPDATE users SET username')) {
      users.find(user => user.id === params[1]).username = params[0];
      return [{ affectedRows: 1 }];
    }
    assert.fail(`Unexpected query: ${sql}`);
  }
} };
const emailPath = require.resolve('../utils/emailService');
require.cache[emailPath] = { id: emailPath, filename: emailPath, loaded: true, exports: { sendSignupCodeEmail: async () => ({ sent: true }) } };
const { registerUser } = require('../controllers/userController');
const userRouter = require('../routes/users');
const { getAuthCookieName } = require('../utils/authCookie');
const { requireCsrfProtection } = require('../middleware/csrfProtection');
let server;
let baseUrl;
before(async () => {
  const app = express();
  app.use(express.json(), cookieParser(), requireCsrfProtection);
  app.post('/register', registerUser);
  app.use('/users', userRouter);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
beforeEach(() => {
  users = [{ id: 1, username: 'Gardener', email: 'existing@example.com', session_version: 0, is_active: true }];
  queries = [];
  signupDb = signupDatabase(users);
});

async function request(flow, username, overrides = {}) {
  const response = await fetch(`${baseUrl}${flow === 'registration' ? '/register' : '/users/profile'}`, {
    method: flow === 'registration' ? 'POST' : 'PUT',
    headers: {
      'Content-Type': 'application/json', 'X-CSRF-Protection': '1',
      Cookie: `${getAuthCookieName()}=${jwt.sign({ id: 1, sessionVersion: 0 }, process.env.JWT_SECRET)}`
    },
    body: JSON.stringify(flow === 'registration'
      ? { username, email: 'new@example.com', password: 'ValidPass123', ...overrides } : { username })
  });
  return { status: response.status, body: await response.json() };
}

test('documents the inclusive display-name boundaries', () => {
  assert.equal(MIN_DISPLAY_NAME_LENGTH, 2);
  assert.equal(MAX_DISPLAY_NAME_LENGTH, 30);
});

for (const [field, value, message] of [
  ['email', '', 'Email is required'],
  ['email', 'gardener@', 'Enter a valid email address, such as name@example.com.'],
  ['password', '', 'Password is required'],
  ['password', 'Aa1', 'Password must be at least 8 characters long'],
  ['password', 'Aa1' + 'x'.repeat(70), 'Password is too long. Try a shorter password.']
]) {
  test(`registration returns a field error for ${field}: ${message}`, async () => {
    const response = await request('registration', 'Gardener', { [field]: value });
    assert.equal(response.status, 400);
    assert.deepEqual(response.body, { message, code: 'VALIDATION_ERROR', errors: { [field]: message } });
    assert.deepEqual(queries, []);
  });
}

test('registration keeps the duplicate-email code for inline email feedback', async () => {
  const response = await request('registration', 'Gardener', { email: 'existing@example.com' });
  assert.equal(response.status, 409);
  assert.equal(response.body.code, 'EMAIL_ALREADY_REGISTERED');
  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /^SELECT/);
});

for (const flow of ['registration', 'profile']) {
  for (const [label, name] of [
    ['minimum', 'Al'], ['trimmed minimum', '  Al  '], ['two emoji', '\u{1F331}'.repeat(2)],
    ['below maximum', 'a'.repeat(29)], ['maximum', 'a'.repeat(30)],
    ['trimmed maximum', `  ${'a'.repeat(30)}  `], ['accented maximum', '\u00e9'.repeat(30)],
    ['emoji maximum', '\u{1F331}'.repeat(30)], ['internal whitespace', '  A  B  '],
    ['duplicate display name', 'Gardener'], ['combining sequence maximum', 'e\u0301'.repeat(15)]
  ]) {
    test(`${flow} accepts ${label} and persists only the trimmed name`, async () => {
      assert.equal(validateDisplayName(name), null);
      const response = await request(flow, name);
      assert.equal(response.status, flow === 'registration' ? 202 : 200);
      assert.equal(flow === 'registration' ? signupDb.state.attempts[0].username : response.body.user.username, name.trim());
      if (flow === 'registration') {
        assert.equal(users.length, 1, 'Validation must persist pending credentials, not an active user');
        const write = queries.find(({ sql }) => sql.startsWith('INSERT INTO pending_signups'));
        assert.equal(write.params[2], name.trim());
      } else {
        assert.equal(users[0].username, name.trim());
        const writes = queries.filter(({ sql }) => /^(INSERT|UPDATE)/.test(sql));
        assert.equal(writes.length, 1);
        assert.equal(writes[0].params[0], name.trim());
      }
    });
  }

  for (const [label, name, message] of [
    ['missing', undefined, 'Display name is required'],
    ['null', null, 'Display name is required'],
    ['non-string', 123, 'Display name is required'],
    ['empty', '', 'Display name is required'],
    ['whitespace only', ' \t\n\u00a0 ', 'Display name is required'],
    ['one character', 'A', 'Display name must be at least 2 characters'],
    ['trimmed one character', '  A  ', 'Display name must be at least 2 characters'],
    ['single emoji', '\u{1F331}', 'Display name must be at least 2 characters'],
    ['over maximum', 'a'.repeat(31), 'Display name must be 30 characters or fewer'],
    ['trimmed over maximum', `  ${'a'.repeat(31)}  `, 'Display name must be 30 characters or fewer'],
    ['emoji over maximum', '\u{1F331}'.repeat(31), 'Display name must be 30 characters or fewer'],
    ['combining sequence over maximum', 'e\u0301'.repeat(15) + 'e', 'Display name must be 30 characters or fewer']
  ]) {
    test(`${flow} rejects ${label} before persistence with a field error`, async () => {
      const original = structuredClone(users);
      assert.equal(validateDisplayName(name), message);
      const response = await request(flow, name);
      assert.equal(response.status, 400);
      assert.deepEqual(response.body, { message, code: 'VALIDATION_ERROR', errors: { username: message } });
      assert.deepEqual(users, original);
      if (flow === 'registration') assert.deepEqual(queries, []);
      else {
        // Only the real session and demo-account checks may read the database.
        assert.deepEqual(queries.map(({ sql }) => sql), [
          'SELECT session_version FROM users WHERE id = ? AND is_active = TRUE',
          'SELECT id, email FROM users WHERE id = ?'
        ]);
      }
    });
  }
}
