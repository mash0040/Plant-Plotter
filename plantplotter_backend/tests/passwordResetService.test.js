const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const {
  PASSWORD_RESET_SUCCESS_MESSAGE,
  hashResetToken,
  requestPasswordReset,
  resetPassword
} = require('../utils/passwordResetService');

const createFakeDb = (initialUsers = [], { beforePasswordUpdate = async () => {} } = {}) => {
  const users = initialUsers.map(user => ({ ...user }));
  const calls = [];

  return {
    users,
    calls,
    async execute(query, params = []) {
      calls.push({ query, params });

      if (query.includes('SELECT id, email FROM users WHERE email = ?')) {
        const email = params[0];
        return [users.filter(user => user.email === email && user.is_active !== false)];
      }

      if (query.includes('SET reset_password_token_hash = ?')) {
        const [tokenHash, expiresAt, userId] = params;
        const user = users.find(item => item.id === userId);
        if (user) {
          user.reset_password_token_hash = tokenHash;
          user.reset_password_expires = expiresAt;
        }
        return [{ affectedRows: user ? 1 : 0 }];
      }

      if (query.includes('WHERE reset_password_token_hash = ?')) {
        const tokenHash = params[0];
        const user = users.find(item => item.reset_password_token_hash === tokenHash);
        return [user ? [{
          id: user.id,
          email: user.email,
          reset_password_expires: user.reset_password_expires
        }] : []];
      }

      if (query.includes('SET password_hash = ?')) {
        assert.match(query, /session_version = session_version \+ 1/);
        assert.match(query, /WHERE id = \?\s+AND reset_password_token_hash = \?\s+AND reset_password_expires > \?/);
        const [passwordHash, userId, tokenHash, consumedAt] = params;
        await beforePasswordUpdate();
        // Model one atomic conditional UPDATE, with no yield between matching and mutation.
        const user = users.find(item => item.id === userId
          && item.reset_password_token_hash === tokenHash
          && item.reset_password_expires
          && new Date(item.reset_password_expires) > consumedAt);
        if (user) {
          user.password_hash = passwordHash;
          user.session_version += 1;
          user.reset_password_token_hash = null;
          user.reset_password_expires = null;
        }
        return [{ affectedRows: user ? 1 : 0 }];
      }

      throw new Error(`Unexpected query: ${query}`);
    }
  };
};

test('demo forgot-password does not generate a token or send email', async () => {
  const fakeDb = createFakeDb([{ id: 7, email: 'demo@plantplotter.com', is_active: true }]);
  const fail = () => assert.fail('Demo reset must not generate tokens or send email');
  const response = await requestPasswordReset({
    db: fakeDb, email: ' DEMO@PlantPlotter.COM ', generateToken: fail, sendEmail: fail
  });
  assert.deepEqual(response, { message: PASSWORD_RESET_SUCCESS_MESSAGE });
  assert.equal(fakeDb.calls.length, 1);
  assert.equal(fakeDb.users[0].reset_password_token_hash, undefined);
});

test('forgot password returns generic response for existing and non-existing email', async () => {
  const fakeDb = createFakeDb([
    { id: 1, email: 'user@example.com', is_active: true }
  ]);
  const sentEmails = [];

  const existingResponse = await requestPasswordReset({
    db: fakeDb,
    email: 'user@example.com',
    sendEmail: async (email) => sentEmails.push(email),
    generateToken: () => 'existing-token'
  });
  const missingResponse = await requestPasswordReset({
    db: fakeDb,
    email: 'missing@example.com',
    sendEmail: async (email) => sentEmails.push(email),
    generateToken: () => 'missing-token'
  });

  assert.equal(existingResponse.message, PASSWORD_RESET_SUCCESS_MESSAGE);
  assert.equal(missingResponse.message, PASSWORD_RESET_SUCCESS_MESSAGE);
  assert.equal(sentEmails.length, 1);
});

test('forgot password stores a hashed token and normalizes email casing', async () => {
  const fakeDb = createFakeDb([
    { id: 1, email: 'user@example.com', is_active: true }
  ]);

  await requestPasswordReset({
    db: fakeDb,
    email: ' USER@Example.COM ',
    sendEmail: async () => {},
    generateToken: () => 'plain-reset-token'
  });

  assert.equal(fakeDb.calls[0].params[0], 'user@example.com');
  assert.equal(fakeDb.users[0].reset_password_token_hash, hashResetToken('plain-reset-token'));
  assert.notEqual(fakeDb.users[0].reset_password_token_hash, 'plain-reset-token');
});

test('reset password rejects invalid and expired tokens', async () => {
  const fakeDb = createFakeDb([
    {
      id: 1,
      email: 'user@example.com',
      reset_password_token_hash: hashResetToken('expired-token'),
      reset_password_expires: new Date('2026-01-01T00:00:00.000Z')
    }
  ]);

  const invalidResult = await resetPassword({
    db: fakeDb,
    token: 'invalid-token',
    password: 'NewPass123',
    confirmPassword: 'NewPass123'
  });
  const expiredResult = await resetPassword({
    db: fakeDb,
    token: 'expired-token',
    password: 'NewPass123',
    confirmPassword: 'NewPass123',
    now: () => new Date('2026-01-01T00:01:00.000Z')
  });

  const invalidResponse = { status: 400, body: { message: 'Password reset link is invalid or expired.' } };
  assert.deepEqual(invalidResult, invalidResponse);
  assert.deepEqual(expiredResult, invalidResponse);
  assert.ok(fakeDb.calls.every(call => call.query.trim().startsWith('SELECT')));
});

test('reset password accepts valid token, clears token fields, and new password works', async () => {
  const oldPasswordHash = await bcrypt.hash('OldPass123', 10);
  const fakeDb = createFakeDb([
    {
      id: 1,
      email: 'user@example.com',
      password_hash: oldPasswordHash,
      session_version: 4,
      reset_password_token_hash: hashResetToken('valid-token'),
      reset_password_expires: new Date('2026-01-01T00:30:00.000Z')
    }
  ]);

  const result = await resetPassword({
    db: fakeDb,
    token: 'valid-token',
    password: 'NewPass123',
    confirmPassword: 'NewPass123',
    now: () => new Date('2026-01-01T00:01:00.000Z')
  });

  assert.equal(result.status, 200);
  assert.equal(fakeDb.users[0].session_version, 5);
  assert.equal(fakeDb.users[0].reset_password_token_hash, null);
  assert.equal(fakeDb.users[0].reset_password_expires, null);
  assert.equal(await bcrypt.compare('NewPass123', fakeDb.users[0].password_hash), true);
  assert.equal(await bcrypt.compare('OldPass123', fakeDb.users[0].password_hash), false);
});

const validResetUser = () => ({
  id: 1,
  email: 'user@example.com',
  is_active: true,
  password_hash: 'unchanged-password-hash',
  session_version: 0,
  reset_password_token_hash: hashResetToken('valid-token'),
  reset_password_expires: new Date('2026-01-01T00:30:00.000Z')
});
const resetRequest = (db, password = 'NewPass123') => ({
  db, token: 'valid-token', password, confirmPassword: password,
  now: () => new Date('2026-01-01T00:01:00.000Z')
});
const invalidResetResponse = {
  status: 400, body: { message: 'Password reset link is invalid or expired.' }
};

test('a consumed token cannot be reused to change the password again', async () => {
  const fakeDb = createFakeDb([validResetUser()]);
  assert.equal((await resetPassword(resetRequest(fakeDb))).status, 200);
  const savedUser = { ...fakeDb.users[0] };

  const result = await resetPassword(resetRequest(fakeDb, 'OtherPass456'));

  assert.deepEqual(result, invalidResetResponse);
  assert.deepEqual(fakeDb.users[0], savedUser);
  assert.equal(fakeDb.calls.filter(call => call.query.includes('SET password_hash = ?')).length, 1);
});

test('competing requests that both validate a token allow only one password change', { timeout: 5000 }, async () => {
  let attempts = 0;
  let releaseUpdates;
  const bothReady = new Promise(resolve => { releaseUpdates = resolve; });
  const fakeDb = createFakeDb([validResetUser()], {
    async beforePasswordUpdate() {
      attempts += 1;
      if (attempts === 2) releaseUpdates();
      // Neither UPDATE can consume the token until both requests read it as valid
      // and finish hashing. No sleeps or assumptions about bcrypt completion order.
      await bothReady;
    }
  });
  const passwords = ['FirstPass123', 'SecondPass456'];

  const results = await Promise.all(passwords.map(password => resetPassword(resetRequest(fakeDb, password))));

  assert.equal(attempts, 2);
  assert.equal(fakeDb.users[0].session_version, 1);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 400]);
  const winner = results.findIndex(result => result.status === 200);
  const loser = 1 - winner;
  assert.deepEqual(results[loser], invalidResetResponse);
  assert.equal(await bcrypt.compare(passwords[winner], fakeDb.users[0].password_hash), true);
  assert.equal(await bcrypt.compare(passwords[loser], fakeDb.users[0].password_hash), false);
  assert.equal(fakeDb.users[0].reset_password_token_hash, null);
  assert.equal(fakeDb.users[0].reset_password_expires, null);
});

for (const consumedAt of ['2026-01-01T00:30:00.000Z', '2026-01-01T00:31:00.000Z']) {
  test(`token expiring before consumption at ${consumedAt} cannot change the password`, async () => {
    const original = validResetUser();
    const fakeDb = createFakeDb([original]);
    let clockReads = 0;

    const result = await resetPassword({
      ...resetRequest(fakeDb),
      now: () => new Date(clockReads++ === 0 ? '2026-01-01T00:01:00.000Z' : consumedAt)
    });

    assert.deepEqual(result, invalidResetResponse);
    assert.equal(clockReads, 2);
    assert.deepEqual(fakeDb.users[0], original);
    assert.equal(fakeDb.calls.filter(call => call.query.includes('SET password_hash = ?')).length, 1);
  });
}

test('a newly issued token prevents an already validated older token from changing the password', async () => {
  const original = validResetUser();
  const fakeDb = createFakeDb([original], {
    async beforePasswordUpdate() {
      await requestPasswordReset({
        db: fakeDb, email: original.email, generateToken: () => 'replacement-token',
        sendEmail: async () => {}, now: () => new Date('2026-01-01T00:02:00.000Z')
      });
    }
  });

  const result = await resetPassword(resetRequest(fakeDb));

  assert.deepEqual(result, invalidResetResponse);
  assert.equal(fakeDb.users[0].password_hash, original.password_hash);
  assert.equal(fakeDb.users[0].session_version, original.session_version);
  assert.equal(fakeDb.users[0].reset_password_token_hash, hashResetToken('replacement-token'));
  assert.deepEqual(fakeDb.users[0].reset_password_expires, new Date('2026-01-01T00:32:00.000Z'));
});

test('password-update database failures propagate without consuming the token', async () => {
  const original = validResetUser();
  const error = Object.assign(new Error('Simulated database failure'), { code: 'ECONNRESET' });
  const fakeDb = createFakeDb([original], { beforePasswordUpdate: async () => { throw error; } });

  await assert.rejects(resetPassword(resetRequest(fakeDb)), failure => failure === error);

  assert.deepEqual(fakeDb.users[0], original);
});

for (const [password, confirmPassword, message] of [
  ['NewPass123', 'OtherPass123', 'Passwords do not match'],
  ['short', 'short', 'Password must be at least 8 characters long']
]) {
  test(`password validation preserves the token: ${message}`, async () => {
    const original = validResetUser();
    const fakeDb = createFakeDb([original]);

    const result = await resetPassword({ ...resetRequest(fakeDb), password, confirmPassword });

    assert.deepEqual(result, { status: 400, body: { message } });
    assert.deepEqual(fakeDb.calls, []);
    assert.deepEqual(fakeDb.users[0], original);
  });
}
