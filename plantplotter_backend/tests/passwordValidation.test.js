const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePassword, MIN_LENGTH, MAX_BYTES } = require('../utils/passwordValidation');

test('accepts passwords just below and at the 72-byte UTF-8 boundary', () => {
  assert.equal(MAX_BYTES, 72);
  for (const password of [
    'Aa1' + 'x'.repeat(68), 'Aa1' + 'x'.repeat(69),
    'Aa1' + '\u00e9'.repeat(34), 'Aa1x' + '\u00e9'.repeat(34),
    'Aa1' + '\ud83c\udf31'.repeat(17), 'Aa1x' + '\ud83c\udf31'.repeat(17)
  ]) {
    assert.ok([71, 72].includes(Buffer.byteLength(password, 'utf8')));
    assert.equal(validatePassword(password), null);
  }
});

test('rejects over-limit ASCII and Unicode, including identical 72-byte prefixes', () => {
  const prefix = 'Aa1' + 'x'.repeat(69);
  for (const password of [
    prefix + 'a', prefix + 'b', 'Aa1' + '\u00e9'.repeat(35),
    'Aa1xx' + '\ud83c\udf31'.repeat(17), 'Aa1' + '\ud83c\udf31'.repeat(18)
  ]) {
    assert.ok(Buffer.byteLength(password, 'utf8') > 72);
    assert.equal(validatePassword(password), 'Password is too long. Try a shorter password.');
  }
});

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
