const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-verify-token-secret';
process.env.NODE_ENV = 'development';

const jwt = require('jsonwebtoken');
const verifyToken = require('../middleware/verifyToken');
const { getAuthCookieName } = require('../utils/authCookie');

const createResponse = () => ({
  body: null,
  clearedCookies: [],
  statusCode: null,
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

test('authenticates a protected request from the session cookie', () => {
  const token = jwt.sign({
    id: 12,
    email: 'garden@example.com',
    username: 'Garden User',
    role: 'user'
  }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const request = {
    cookies: { [getAuthCookieName()]: token }
  };
  const response = createResponse();
  let nextCalled = false;

  verifyToken(request, response, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
  assert.deepEqual(request.user, {
    id: 12,
    email: 'garden@example.com',
    username: 'Garden User',
    role: 'user'
  });
});

test('does not accept a bearer token without the session cookie', () => {
  const response = createResponse();

  verifyToken({ cookies: {}, headers: { authorization: 'Bearer old-token' } }, response, () => {
    throw new Error('next should not be called');
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.code, 'AUTH_REQUIRED');
});

test('clears an expired session cookie and returns an expiry code', () => {
  const expiredToken = jwt.sign(
    { id: 12, email: 'garden@example.com' },
    process.env.JWT_SECRET,
    { expiresIn: -1 }
  );
  const response = createResponse();

  verifyToken({
    cookies: { [getAuthCookieName()]: expiredToken }
  }, response, () => {
    throw new Error('next should not be called');
  });

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.code, 'TOKEN_EXPIRED');
  assert.equal(response.clearedCookies[0][0], getAuthCookieName());
});
