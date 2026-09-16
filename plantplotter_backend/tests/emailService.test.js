const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sendSignupCodeEmail, sendPasswordResetEmail } = require('../utils/emailService');

test('Resend accepts verification messages and keeps password-reset content intact', async t => {
  t.mock.method(global, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.headers.Authorization, 'Bearer test-only-key');
    assert.ok(options.signal);
    return { ok: true };
  });
  const original = { ...process.env };
  Object.assign(process.env, { SIGNUP_EMAIL_MODE: 'email', EMAIL_PROVIDER: 'resend', EMAIL_FROM: 'sender@example.com', RESEND_API_KEY: 'test-only-key' });
  try {
    assert.deepEqual(await sendSignupCodeEmail({ to: 'test@example.com', code: '000012' }), { sent: true });
    const signup = JSON.parse(fetch.mock.calls[0].arguments[1].body);
    assert.equal(signup.to, 'test@example.com'); assert.match(signup.text, /000012/); assert.match(signup.text, /10 minutes/);
    await sendPasswordResetEmail({ to: 'test@example.com', resetUrl: 'https://example.com/reset?token=test' });
    const reset = JSON.parse(fetch.mock.calls[1].arguments[1].body);
    assert.equal(reset.subject, 'Reset your PlantPlotter password'); assert.match(reset.text, /reset\?token=test/);
  } finally { process.env = original; }
});

test('verification rejects provider failures, timeouts and missing configuration without logging codes', async t => {
  const original = { ...process.env };
  const log = t.mock.method(console, 'info', () => assert.fail('Signup codes must never be logged'));
  const fetchMock = t.mock.method(global, 'fetch', async () => ({ ok: false, status: 429 }));
  Object.assign(process.env, { NODE_ENV: 'development', SIGNUP_EMAIL_MODE: 'email', EMAIL_PROVIDER: 'resend', EMAIL_FROM: 'sender@example.com', RESEND_API_KEY: 'test-only-key' });
  try {
    await assert.rejects(sendSignupCodeEmail({ to: 'test@example.com', code: '123456' }), /rejected/);
    fetchMock.mock.mockImplementation(async () => { throw Error('timeout'); });
    await assert.rejects(sendSignupCodeEmail({ to: 'test@example.com', code: '123456' }), /timeout/);
    process.env.EMAIL_PROVIDER = '';
    await assert.rejects(sendSignupCodeEmail({ to: 'test@example.com', code: '123456' }), /required/);
    assert.equal(log.mock.callCount(), 0);
  } finally { process.env = original; }
});

test('explicit local console delivery prints the code without contacting an email provider', async t => {
  const original = { ...process.env };
  const log = t.mock.method(console, 'info', () => {});
  t.mock.method(global, 'fetch', () => assert.fail('Console delivery must not contact a provider'));
  Object.assign(process.env, { NODE_ENV: 'development', SIGNUP_EMAIL_MODE: 'console', EMAIL_PROVIDER: '', EMAIL_FROM: '' });
  try {
    assert.deepEqual(await sendSignupCodeEmail({ to: 'local@example.com', code: '000012' }), { sent: true });
    assert.equal(log.mock.callCount(), 1);
    assert.equal(log.mock.calls[0].arguments[0], '[development] Signup verification code: 000012 (expires in 10 minutes; no email sent).');
  } finally { process.env = original; }
});

for (const environment of ['production', 'test', undefined]) {
  test(`console delivery fails closed without logging when NODE_ENV is ${environment}`, async t => {
    const original = { ...process.env };
    t.mock.method(console, 'info', () => assert.fail('Codes must not be printed outside explicit development mode'));
    t.mock.method(global, 'fetch', () => assert.fail('Rejected console mode must not send email'));
    process.env.SIGNUP_EMAIL_MODE = 'console';
    if (environment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = environment;
    try {
      await assert.rejects(sendSignupCodeEmail({ to: 'local@example.com', code: '000012' }), /requires NODE_ENV=development/);
    } finally { process.env = original; }
  });
}

test('missing or unknown delivery mode never enables console output implicitly', async t => {
  const original = { ...process.env };
  t.mock.method(console, 'info', () => assert.fail('Console mode requires explicit opt-in'));
  Object.assign(process.env, { NODE_ENV: 'development', EMAIL_PROVIDER: '', EMAIL_FROM: '' });
  try {
    delete process.env.SIGNUP_EMAIL_MODE;
    await assert.rejects(sendSignupCodeEmail({ to: 'local@example.com', code: '000012' }), /required/);
    process.env.SIGNUP_EMAIL_MODE = 'invalid';
    await assert.rejects(sendSignupCodeEmail({ to: 'local@example.com', code: '000012' }), /Unsupported signup email mode/);
  } finally { process.env = original; }
});
