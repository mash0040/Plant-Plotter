const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildErrorResponse,
  sendErrorResponse
} = require('../utils/apiErrorResponse');

const createFakeResponse = () => ({
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

test('builds standard error response from a message', () => {
  assert.deepEqual(buildErrorResponse('Invalid request'), {
    message: 'Invalid request'
  });
});

test('converts legacy error field into message field', () => {
  assert.deepEqual(buildErrorResponse({ error: 'Failed to fetch tasks' }), {
    message: 'Failed to fetch tasks'
  });
});

test('includes optional code and validation errors', () => {
  assert.deepEqual(
    buildErrorResponse('Validation failed', {
      code: 'VALIDATION_ERROR',
      errors: {
        name: 'Name is required',
        width: undefined
      }
    }),
    {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: {
        name: 'Name is required'
      }
    }
  );
});

test('omits empty validation error objects', () => {
  assert.deepEqual(
    buildErrorResponse('Validation failed', {
      code: 'VALIDATION_ERROR',
      errors: {
        name: undefined
      }
    }),
    {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR'
    }
  );
});

test('sends standard error response with status code', () => {
  const response = createFakeResponse();

  sendErrorResponse(response, 409, 'Email already registered', {
    code: 'EMAIL_ALREADY_REGISTERED'
  });

  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.body, {
    message: 'Email already registered',
    code: 'EMAIL_ALREADY_REGISTERED'
  });
});
