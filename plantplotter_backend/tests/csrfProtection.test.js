const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CSRF_HEADER_NAME,
  CSRF_HEADER_VALUE,
  requireCsrfProtection
} = require('../middleware/csrfProtection');

const createRequest = (method, headers = {}) => ({
  method,
  get(name) {
    return headers[name.toLowerCase()];
  }
});

const createResponse = () => ({
  body: null,
  statusCode: null,
  status(statusCode) {
    this.statusCode = statusCode;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  }
});

test('allows safe requests without a CSRF header', () => {
  for (const method of ['GET', 'HEAD', 'OPTIONS']) {
    let nextCalled = false;
    requireCsrfProtection(createRequest(method), createResponse(), () => {
      nextCalled = true;
    });
    assert.equal(nextCalled, true, `${method} should be allowed`);
  }
});

test('allows unsafe requests with the expected custom header', () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    let nextCalled = false;
    requireCsrfProtection(
      createRequest(method, { [CSRF_HEADER_NAME.toLowerCase()]: CSRF_HEADER_VALUE }),
      createResponse(),
      () => {
        nextCalled = true;
      }
    );
    assert.equal(nextCalled, true, `${method} should be allowed`);
  }
});

test('rejects unsafe requests without the CSRF header', () => {
  const response = createResponse();

  requireCsrfProtection(createRequest('DELETE'), response, () => {
    throw new Error('next should not be called');
  });

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, {
    message: 'This request could not be verified. Please refresh and try again.',
    code: 'CSRF_VALIDATION_FAILED'
  });
});
