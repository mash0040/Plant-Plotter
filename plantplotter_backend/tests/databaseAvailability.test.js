const test = require('node:test');
const assert = require('node:assert/strict');
const {
  RETRY_AFTER_SECONDS,
  SERVICE_UNAVAILABLE_CODE,
  SERVICE_UNAVAILABLE_MESSAGE,
  isTemporaryDatabaseUnavailableError,
  sendDatabaseAwareErrorResponse,
  sendDatabaseUnavailableResponse
} = require('../utils/databaseAvailability');

const createFakeResponse = () => {
  const response = {
    body: null,
    headers: {},
    statusCode: null,
    headersSent: false,
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      this.headersSent = true;
      return this;
    }
  };

  return response;
};

test('classifies temporary database outage error codes', () => {
  const temporaryCodes = [
    'ENOTFOUND',
    'EAI_AGAIN',
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'PROTOCOL_CONNECTION_LOST'
  ];

  for (const code of temporaryCodes) {
    assert.equal(isTemporaryDatabaseUnavailableError({ code }), true, `${code} should be temporary`);
  }
});

test('does not classify SQL and application errors as temporary outages', () => {
  assert.equal(isTemporaryDatabaseUnavailableError({ code: 'ER_BAD_FIELD_ERROR' }), false);
  assert.equal(isTemporaryDatabaseUnavailableError({ code: 'ER_PARSE_ERROR' }), false);
});

test('classifies wrapped temporary database outage errors through cause', () => {
  const error = new Error('Database query failed', {
    cause: { code: 'ENOTFOUND' }
  });

  assert.equal(isTemporaryDatabaseUnavailableError(error), true);
});

test('does not classify wrapped SQL errors as temporary outages', () => {
  const error = new Error('Database query failed', {
    cause: { code: 'ER_BAD_FIELD_ERROR' }
  });

  assert.equal(isTemporaryDatabaseUnavailableError(error), false);
});

test('does not classify SQL errors as temporary outages even with a temporary cause', () => {
  assert.equal(
    isTemporaryDatabaseUnavailableError({
      code: 'ER_BAD_FIELD_ERROR',
      cause: { code: 'ECONNRESET' }
    }),
    false
  );
});

test('sends sanitized 503 response for temporary database outages', () => {
  const response = createFakeResponse();

  const wasHandled = sendDatabaseUnavailableResponse(response, { code: 'ETIMEDOUT' });

  assert.equal(wasHandled, true);
  assert.equal(response.statusCode, 503);
  assert.equal(response.headers['Retry-After'], RETRY_AFTER_SECONDS);
  assert.deepEqual(response.body, {
    message: SERVICE_UNAVAILABLE_MESSAGE,
    code: SERVICE_UNAVAILABLE_CODE
  });
});

test('database-aware error response keeps ordinary unexpected errors as 500', () => {
  const response = createFakeResponse();
  const fallbackBody = { message: 'Server error' };

  sendDatabaseAwareErrorResponse(response, new Error('Unexpected failure'), fallbackBody);

  assert.equal(response.statusCode, 500);
  assert.equal(response.headers['Retry-After'], undefined);
  assert.deepEqual(response.body, fallbackBody);
});

test('database-aware error response normalizes legacy fallback error bodies', () => {
  const response = createFakeResponse();

  sendDatabaseAwareErrorResponse(
    response,
    new Error('Unexpected failure'),
    { error: 'Failed to fetch tasks' }
  );

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, {
    message: 'Failed to fetch tasks'
  });
});
