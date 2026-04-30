const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePassword, MIN_LENGTH } = require('../utils/passwordValidation');

test('accepts a strong password with upper, lower, and number', () => {
  assert.equal(validatePassword('StrongPass1'), null);
  assert.equal(validatePassword('Aa1aaaaa'), null); // exactly MIN_LENGTH
});

test('rejects missing or empty password', () => {
  assert.match(validatePassword(undefined) || '', /required/i);
  assert.match(validatePassword(null) || '', /required/i);
  assert.match(validatePassword('') || '', /required/i);
});

test('rejects passwords shorter than the minimum length', () => {
  assert.match(validatePassword('Aa1aaaa') || '', new RegExp(`at least ${MIN_LENGTH} characters`, 'i'));
});

test('rejects passwords missing an uppercase letter', () => {
  assert.match(validatePassword('strongpass1') || '', /uppercase/i);
});

test('rejects passwords missing a lowercase letter', () => {
  assert.match(validatePassword('STRONGPASS1') || '', /lowercase/i);
});

test('rejects passwords missing a number', () => {
  assert.match(validatePassword('StrongPassword') || '', /number/i);
});
