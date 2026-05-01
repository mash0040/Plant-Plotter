const test = require('node:test');
const assert = require('node:assert/strict');
const { ipKeyGenerator } = require('express-rate-limit');
const {
  normalizeIpForRateLimit,
  rateLimitKeyGenerator
} = require('../middleware/rateLimiters');

test('normalizes Azure IPv4 request IP values that include a port', () => {
  assert.equal(normalizeIpForRateLimit('184.147.145.238:60100'), '184.147.145.238');
  assert.equal(rateLimitKeyGenerator({ ip: '184.147.145.238:60100' }), '184.147.145.238');
});

test('keeps plain IPv4 values unchanged', () => {
  assert.equal(normalizeIpForRateLimit('184.147.145.238'), '184.147.145.238');
  assert.equal(rateLimitKeyGenerator({ ip: '184.147.145.238' }), '184.147.145.238');
});

test('normalizes bracketed IPv6 request IP values that include a port', () => {
  const normalized = normalizeIpForRateLimit('[2001:db8::1]:60100');

  assert.equal(normalized, '2001:db8::1');
  assert.equal(rateLimitKeyGenerator({ ip: '[2001:db8::1]:60100' }), ipKeyGenerator('2001:db8::1'));
});

test('uses express-rate-limit ipKeyGenerator behavior for plain IPv6 values', () => {
  assert.equal(rateLimitKeyGenerator({ ip: '2001:db8::1' }), ipKeyGenerator('2001:db8::1'));
});
