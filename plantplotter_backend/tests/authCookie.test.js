const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-auth-cookie-secret';

const jwt = require('jsonwebtoken');
const {
  DEVELOPMENT_AUTH_COOKIE_NAME,
  PRODUCTION_AUTH_COOKIE_NAME,
  clearAuthCookie,
  getAuthCookieName,
  getAuthCookieOptions,
  getTokenMaxAge,
  setAuthCookie
} = require('../utils/authCookie');

const originalNodeEnv = process.env.NODE_ENV;

test.afterEach(() => {
  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test('uses a host-only, httpOnly cookie with local development settings', () => {
  process.env.NODE_ENV = 'development';

  assert.equal(getAuthCookieName(), DEVELOPMENT_AUTH_COOKIE_NAME);
  assert.deepEqual(getAuthCookieOptions(), {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/'
  });
  assert.equal(Object.hasOwn(getAuthCookieOptions(), 'domain'), false);
});

test('uses a Secure __Host cookie in production', () => {
  process.env.NODE_ENV = 'production';

  assert.equal(getAuthCookieName(), PRODUCTION_AUTH_COOKIE_NAME);
  assert.deepEqual(getAuthCookieOptions(), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/'
  });
});

test('sets an httpOnly cookie expiry from the JWT expiry', () => {
  process.env.NODE_ENV = 'development';
  const token = jwt.sign(
    { id: 7, email: 'user@example.com' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
  const response = {
    cookieCalls: [],
    cookie(...args) {
      this.cookieCalls.push(args);
    }
  };

  setAuthCookie(response, token);

  assert.equal(response.cookieCalls.length, 1);
  assert.equal(response.cookieCalls[0][0], DEVELOPMENT_AUTH_COOKIE_NAME);
  assert.equal(response.cookieCalls[0][1], token);
  assert.equal(response.cookieCalls[0][2].httpOnly, true);
  assert.ok(response.cookieCalls[0][2].maxAge > 3_500_000);
  assert.ok(getTokenMaxAge(token) <= 3_600_000);
});

test('clears the cookie with the same security attributes', () => {
  process.env.NODE_ENV = 'production';
  const response = {
    clearCalls: [],
    clearCookie(...args) {
      this.clearCalls.push(args);
    }
  };

  clearAuthCookie(response);

  assert.deepEqual(response.clearCalls, [[
    PRODUCTION_AUTH_COOKIE_NAME,
    {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/'
    }
  ]]);
});
