const { test } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
process.env.JWT_SECRET = 'test-only-signup-key';
const { createSignupService, codeVerifier, transaction } = require('../utils/signupService');
const signupDatabase = require('./helpers/signupDatabase');

function fixture(options = {}) {
  const db = signupDatabase();
  let time = Date.now();
  let counter = 0;
  const sent = [];
  const service = createSignupService({ db, now: () => time,
    generateCode: () => String(counter++).padStart(6, '0'),
    sendEmail: async email => { sent.push(email); return { sent: true }; }, ...options });
  const start = (overrides = {}) => service.start({ username: 'Gardener', email: 'garden@example.com', password: 'ValidPass123', ip: '127.0.0.1', ...overrides });
  const input = result => ({ ...result.body.pending, credential: result.credential, ip: '127.0.0.1' });
  return { db, service, start, input, sent, advance: ms => { time += ms; } };
}

test('signup stores only hashes, needs attempt possession, creates a verified user once and clears secrets', async () => {
  const f = fixture(); const pending = await f.start();
  assert.equal(pending.status, 202); assert.equal(f.db.state.users.length, 0);
  const stored = f.db.state.attempts[0];
  assert.ok(await bcrypt.compare('ValidPass123', stored.password_hash));
  assert.notEqual(stored.credential_hash, pending.credential);
  assert.equal(stored.code_verifier.length, 64);
  assert.notEqual(stored.code_verifier, require('node:crypto').createHash('sha256').update('000000').digest('hex'));
  assert.notEqual(codeVerifier({ ...stored, revision: 2 }, '000000'), stored.code_verifier);
  assert.notEqual(codeVerifier({ ...stored, email: 'other@example.com' }, '000000'), stored.code_verifier);
  assert.equal((await f.service.verify({ ...f.input(pending), credential: 'a'.repeat(64), code: '000000' })).status, 400);
  assert.equal((await f.service.verify({ ...f.input(pending), attemptId: 'wrong', code: '000000' })).status, 409);
  const outcomes = await Promise.all(Array.from({ length: 4 }, () => f.service.verify({ ...f.input(pending), code: '000000' })));
  assert.deepEqual(outcomes.map(x => x.status).sort(), [201, 400, 400, 400]);
  assert.equal(f.db.state.users.length, 1); assert.equal(f.db.state.users[0].email_verified, true);
  assert.equal(f.db.state.attempts[0].password_hash, null); assert.equal(f.db.state.attempts[0].code_verifier, null);
  assert.equal((await f.service.status(pending.credential)).body.completed, true);
});

test('five incorrect or malformed guesses invalidate a code, including concurrent guesses', async () => {
  const f = fixture(); const p = await f.start();
  for (const code of ['12345', 123456, '1234567', 'abcdef']) assert.equal((await f.service.verify({ ...f.input(p), code })).body.code, 'CODE_INVALID');
  const results = await Promise.all([f.service.verify({ ...f.input(p), code: '999999' }), f.service.verify({ ...f.input(p), code: '000000' })]);
  assert.ok(results.every(x => x.body.code === 'CODE_EXHAUSTED'));
  assert.equal(f.db.state.attempts[0].failed_guesses, 5); assert.equal(f.db.state.users.length, 0);
});

test('codes expire exactly at ten minutes; attempts expire after one day and cleanup is bounded', async () => {
  const f = fixture(); const p = await f.start();
  f.advance(600000);
  assert.equal((await f.service.verify({ ...f.input(p), code: '000000' })).body.code, 'CODE_EXPIRED');
  f.advance(86400000);
  assert.equal((await f.service.status(p.credential)).body.pending, null);
  assert.equal((await f.service.resend(f.input(p))).body.code, 'SIGNUP_EXPIRED');
  await f.start({ email: 'next@example.com' }); assert.equal(f.db.state.attempts.length, 1);
});

test('resend observes the exact cooldown, rotates codes, rejects stale revisions and changes pending email safely', async () => {
  const f = fixture(); const p = await f.start();
  f.advance(59999); assert.equal((await f.service.resend(f.input(p))).status, 429);
  f.advance(1); const next = await f.service.resend(f.input(p)); next.credential = p.credential;
  assert.equal(next.status, 202);
  assert.equal((await f.service.verify({ ...f.input(p), code: '000000' })).body.code, 'SIGNUP_CHANGED');
  assert.equal((await f.service.verify({ ...f.input(next), code: '000000' })).body.code, 'CODE_INVALID');
  f.advance(60000); const changed = await f.service.resend({ ...f.input(next), email: 'correct@example.com' }); changed.credential = p.credential;
  assert.equal(changed.body.pending.email, 'correct@example.com');
  assert.equal((await f.service.verify({ ...f.input(changed), code: '000001' })).status, 400);
  assert.equal((await f.service.verify({ ...f.input(changed), code: '000002' })).status, 201);
  assert.equal(f.db.state.users[0].email, 'correct@example.com');
});

test('new attempts and resends share email sending and guessing budgets', async () => {
  const f = fixture(); let p = await f.start();
  assert.equal((await f.start()).status, 429);
  for (let generation = 0; generation < 5; generation++) {
    for (let guess = 0; guess < 5; guess++) await f.service.verify({ ...f.input(p), code: '999999' });
    f.advance(60000);
    if (generation < 4) { const next = await f.service.resend(f.input(p)); next.credential = p.credential; p = next; }
  }
  assert.equal((await f.service.resend(f.input(p))).status, 429);
  assert.equal((await f.start({ ip: 'other-ip' })).status, 429);
  assert.equal(f.sent.length, 5);
  // Grant a code without resetting guessing buckets to isolate the guess budget.
  f.db.state.attempts[0].failed_guesses = 0;
  assert.equal((await f.service.verify({ ...f.input(p), code: '000004' })).status, 429);
});

test('IP sending limits span email addresses, and daily email limits outlive hourly resets', async () => {
  const f = fixture();
  for (let i = 0; i < 20; i++) assert.equal((await f.start({ email: `garden${i}@example.com` })).status, 202);
  assert.equal((await f.start({ email: 'last@example.com' })).status, 429);
  assert.equal(f.sent.length, 20);
  const g = fixture();
  for (let i = 0; i < 10; i++) { assert.equal((await g.start()).status, 202); g.advance(3600001); }
  assert.equal((await g.start()).status, 429);
});

test('failed/skipped sends cannot verify and retain a recoverable pending attempt', async () => {
  for (const sendEmail of [async () => { throw new Error('provider failed'); }, async () => ({ skipped: true })]) {
    const f = fixture({ sendEmail }); const p = await f.start();
    assert.equal(p.body.pending.delivery, 'failed'); assert.equal(f.db.state.users.length, 0);
    assert.equal((await f.service.verify({ ...f.input(p), code: '000000' })).body.code, 'CODE_NOT_SENT');
    f.advance(60000);
    const recovering = createSignupService({ db: f.db, now: () => Date.now() + 61000, sendEmail: async () => ({ sent: true }) });
    assert.equal((await recovering.resend(f.input(p))).body.pending.delivery, 'sent');
  }
});

test('a late send cannot reactivate an older generation or authorize verification during send', async () => {
  let finish; let entered;
  const sending = new Promise(resolve => { entered = resolve; });
  const f = fixture({ sendEmail: async () => { entered(); return new Promise(resolve => { finish = resolve; }); } });
  let credential;
  const start = f.start({ onReserved: value => { credential = value; } }); await sending;
  const p = { ...(await f.service.status(credential)), credential };
  assert.equal((await f.service.verify({ ...f.input(p), code: '000000' })).body.code, 'CODE_NOT_SENT');
  f.db.state.attempts[0].revision += 1;
  finish({ sent: true });
  assert.equal((await start).body.code, 'SIGNUP_CHANGED');
  assert.equal(f.db.state.attempts[0].delivery_state, 'sending');
});

test('pending emails do not reserve accounts; duplicate account insertion preserves the existing account', async () => {
  const f = fixture(); const first = await f.start(); f.advance(60000); const second = await f.start();
  assert.equal(second.status, 202);
  assert.equal((await f.service.verify({ ...f.input(first), code: '000000' })).status, 201);
  const existing = structuredClone(f.db.state.users);
  assert.equal((await f.service.verify({ ...f.input(second), code: '000001' })).body.code, 'EMAIL_ALREADY_REGISTERED');
  assert.equal((await f.start()).body.code, 'EMAIL_ALREADY_REGISTERED');
  assert.deepEqual(f.db.state.users, existing);
});

test('transaction rollback failure destroys the connection instead of returning it to the pool', async () => {
  let destroyed = false;
  const db = { getConnection: async () => ({ beginTransaction: async () => {}, rollback: async () => { throw Error('rollback'); },
    destroy: () => { destroyed = true; }, release: () => assert.fail('Destroyed connection must not be released') }) };
  await assert.rejects(transaction(db, async () => { throw Error('operation'); }), /operation/);
  assert.equal(destroyed, true);
});

test('resend rejects a randomly repeated code, including when changing the address', async () => {
  const codes = ['000001', '000001', '000002'];
  const f = fixture({ generateCode: () => codes.shift() });
  const p = await f.start(); f.advance(60000);
  const changed = await f.service.resend({ ...f.input(p), email: 'correct@example.com' }); changed.credential = p.credential;
  assert.equal(f.sent.at(-1).code, '000002');
  assert.equal((await f.service.verify({ ...f.input(changed), code: '000001' })).body.code, 'CODE_INVALID');
  assert.equal((await f.service.verify({ ...f.input(changed), code: '000002' })).status, 201);
});

test('the actual local console sender makes a pending signup verifiable and preserves resend limits', async t => {
  const original = { ...process.env };
  const log = t.mock.method(console, 'info', () => {});
  t.mock.method(global, 'fetch', () => assert.fail('Local console mode must not send email'));
  Object.assign(process.env, { NODE_ENV: 'development', SIGNUP_EMAIL_MODE: 'console' });
  try {
    const f = fixture({ sendEmail: require('../utils/emailService').sendSignupCodeEmail });
    const p = await f.start();
    assert.equal(p.body.pending.delivery, 'sent');
    assert.equal(f.db.state.users.length, 0);
    const code = log.mock.calls[0].arguments[0].match(/code: (\d{6})/)[1];
    assert.equal((await f.service.resend(f.input(p))).status, 429);
    assert.equal(log.mock.callCount(), 1);
    assert.equal((await f.service.verify({ ...f.input(p), code })).status, 201);
    assert.equal((await f.service.verify({ ...f.input(p), code })).body.code, 'CODE_CONSUMED');
    assert.equal(f.db.state.users.length, 1);
  } finally { process.env = original; }
});
