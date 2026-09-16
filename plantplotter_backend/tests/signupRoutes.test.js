const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const cookieParser = require('cookie-parser');
process.env.JWT_SECRET = 'test-only-signup-routes';
process.env.NODE_ENV = 'test';
const signupDatabase = require('./helpers/signupDatabase');
let db;
let messages;
let failSend;
const dbPath = require.resolve('../config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: {
  execute: (...args) => db.execute(...args), getConnection: () => db.getConnection()
} };
const emailPath = require.resolve('../utils/emailService');
require.cache[emailPath] = { id: emailPath, filename: emailPath, loaded: true, exports: {
  sendSignupCodeEmail: async message => { if (failSend) throw Error('Simulated provider failure'); messages.push(message); return { sent: true }; }
} };
const router = require('../routes/auth');
const { requireCsrfProtection } = require('../middleware/csrfProtection');
let server;
let baseUrl;
before(async () => {
  const app = express(); app.use(express.json(), cookieParser(), requireCsrfProtection); app.use('/auth', router);
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/auth/register`;
});
after(async () => { await new Promise(resolve => server.close(resolve)); });
beforeEach(() => { db = signupDatabase(); messages = []; failSend = false; });
const details = { username: 'Gardener', email: '  GARDEN@example.com ', password: 'ValidPass123' };
async function request(path = '', body = details, cookie, csrf = true) {
  const response = await fetch(`${baseUrl}${path}`, { method: body === null ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', ...(csrf && { 'X-CSRF-Protection': '1' }), ...(cookie && { Cookie: cookie }) },
    ...(body !== null && { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json(), headers: response.headers, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

test('all signup writes require CSRF before persistence or delivery', async () => {
  for (const path of ['', '/verify', '/resend', '/change-email']) {
    const response = await request(path, details, undefined, false);
    assert.equal(response.status, 403); assert.equal(response.body.code, 'CSRF_VALIDATION_FAILED');
  }
  assert.equal(db.state.attempts.length, 0); assert.equal(messages.length, 0);
});
test('normalized signup uses a separate httpOnly cookie and status exposes no credentials', async () => {
  const response = await request();
  assert.equal(response.status, 202); assert.equal(response.body.user, undefined);
  assert.equal(response.body.pending.email, 'garden@example.com');
  assert.match(response.headers.get('set-cookie'), /^plantplotter_signup=[a-f0-9]{64};.*HttpOnly; SameSite=Lax/);
  assert.equal(db.state.users.length, 0);
  assert.equal((await request('/pending', null)).body.pending, null);
  const status = await request('/pending', null, response.cookie);
  assert.equal(status.headers.get('cache-control'), 'no-store');
  assert.doesNotMatch(JSON.stringify(status.body), /password|credential|verifier|000000/);
  assert.equal((await request('', { ...details, email: 'garden@example.com' })).status, 429);
  const denied = await request('/resend', response.body.pending, response.cookie);
  assert.equal(denied.status, 429); assert.ok(Number(denied.headers.get('retry-after')) > 0);
});
test('send failure returns honest pending state and an explicit resend can recover', async () => {
  failSend = true;
  const response = await request();
  assert.equal(response.status, 202); assert.equal(response.body.pending.delivery, 'failed');
  assert.match(response.body.message, /could not send/); assert.ok(response.cookie);
  assert.equal(db.state.users.length, 0);
  failSend = false;
  db.state.attempts[0].resend_at = new Date(0);
  for (const limit of db.state.limits) limit.expires_at = new Date(0);
  const resent = await request('/resend', response.body.pending, response.cookie);
  assert.equal(resent.body.pending.delivery, 'sent');
  const verified = await request('/verify', { ...resent.body.pending, code: messages[0].code }, response.cookie);
  assert.equal(verified.status, 201); assert.match(verified.cookie, /^plantplotter_session=/);
  assert.equal(db.state.users[0].email_verified, true);
  assert.equal((await request('/verify', { ...resent.body.pending, code: messages[0].code }, response.cookie)).body.code, 'CODE_CONSUMED');
});
test('email correction validates before mutation and refuses a missing or wrong attempt', async () => {
  const response = await request();
  const original = structuredClone(db.state.attempts);
  const invalid = await request('/change-email', { ...response.body.pending, email: 'bad@' }, response.cookie);
  assert.equal(invalid.status, 400); assert.ok(invalid.body.errors.email);
  assert.equal((await request('/change-email', { ...response.body.pending, email: 'other@example.com' })).status, 400);
  assert.equal((await request('/verify', { ...response.body.pending, attemptId: 'another', code: messages[0].code }, response.cookie)).status, 409);
  assert.deepEqual(db.state.attempts, original);
});
