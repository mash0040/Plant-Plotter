const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const {
  PASSWORD_RESET_SUCCESS_MESSAGE,
  hashResetToken,
  requestPasswordReset,
  resetPassword
} = require('../utils/passwordResetService');

const createFakeDb = (initialUsers = []) => {
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
          reset_password_expires: user.reset_password_expires
        }] : []];
      }

      if (query.includes('SET password_hash = ?')) {
        const [passwordHash, userId] = params;
        const user = users.find(item => item.id === userId);
        if (user) {
          user.password_hash = passwordHash;
          user.reset_password_token_hash = null;
          user.reset_password_expires = null;
        }
        return [{ affectedRows: user ? 1 : 0 }];
      }

      throw new Error(`Unexpected query: ${query}`);
    }
  };
};

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

  assert.equal(invalidResult.status, 400);
  assert.equal(expiredResult.status, 400);
});

test('reset password accepts valid token, clears token fields, and new password works', async () => {
  const oldPasswordHash = await bcrypt.hash('OldPass123', 10);
  const fakeDb = createFakeDb([
    {
      id: 1,
      email: 'user@example.com',
      password_hash: oldPasswordHash,
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
  assert.equal(fakeDb.users[0].reset_password_token_hash, null);
  assert.equal(fakeDb.users[0].reset_password_expires, null);
  assert.equal(await bcrypt.compare('NewPass123', fakeDb.users[0].password_hash), true);
  assert.equal(await bcrypt.compare('OldPass123', fakeDb.users[0].password_hash), false);
});
