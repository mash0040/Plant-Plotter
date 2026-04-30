const test = require('node:test');
const assert = require('node:assert/strict');
const { isValidEmail, validateEmail, EMAIL_VALIDATION_MESSAGE } = require('../utils/emailValidation');

test('accepts practical valid email addresses', () => {
  const validEmails = [
    'user@example.com',
    'garden.planner@example.co',
    'test.user@outlook.ca'
  ];

  for (const email of validEmails) {
    assert.equal(isValidEmail(email), true, `expected ${email} to be valid`);
    assert.equal(validateEmail(email), null);
  }
});

test('rejects invalid email addresses', () => {
  const invalidEmails = [
    'user',
    'user@',
    'user@567',
    'user@example',
    'user@example.',
    'test user@example.com'
  ];

  for (const email of invalidEmails) {
    assert.equal(isValidEmail(email), false, `expected ${email} to be invalid`);
    assert.equal(validateEmail(email), EMAIL_VALIDATION_MESSAGE);
  }
});

test('rejects empty email values with required message', () => {
  assert.equal(validateEmail(''), 'Email is required');
  assert.equal(validateEmail('   '), 'Email is required');
  assert.equal(validateEmail(undefined), 'Email is required');
});