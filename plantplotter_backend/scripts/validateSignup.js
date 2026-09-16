const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');

module.exports = async function validateSignup(db, env) {
  // Called only by the owner of the disposable container; no .env is loaded.
  process.env.JWT_SECRET = env.JWT_SECRET;
  const { createSignupService } = require('../utils/signupService');
  const pool = mysql.createPool({ host: env.DB_HOST, port: Number(env.DB_PORT), user: env.DB_USER,
    password: env.DB_PASSWORD, database: env.DB_NAME, connectionLimit: 12 });
  let timestamp = Date.now();
  let sequence = 0;
  const emails = [];
  const service = createSignupService({ db: pool, now: () => timestamp,
    generateCode: () => String(sequence++).padStart(6, '0'),
    sendEmail: async message => { emails.push(message); return { sent: true }; } });
  const start = (email, extra = {}) => service.start({ username: 'Concurrency check', email, password: 'ValidPass123', ip: 'validation-ip', ...extra });
  const input = p => ({ ...p.body.pending, credential: p.credential, ip: 'validation-ip' });
  const latest = () => emails.at(-1).code;
  try {
    const p = await start('concurrent-verify@example.com'); const code = latest();
    const results = await Promise.all(Array.from({ length: 8 }, () => service.verify({ ...input(p), code })));
    assert.equal(results.filter(r => r.status === 201).length, 1);
    assert.equal(results.filter(r => r.body.code === 'CODE_CONSUMED').length, 7);
    const [[users]] = await db.query("SELECT COUNT(*) AS count FROM garden_plotter.users WHERE email = 'concurrent-verify@example.com'");
    assert.equal(users.count, 1);

    const guesses = await start('concurrent-guesses@example.com'); const correct = latest();
    const failures = await Promise.all(Array.from({ length: 10 }, () => service.verify({ ...input(guesses), code: '999999' })));
    assert.ok(failures.every(r => r.status === 400));
    const [[attempt]] = await db.query('SELECT failed_guesses FROM garden_plotter.pending_signups WHERE id = ?', [guesses.body.pending.attemptId]);
    assert.equal(attempt.failed_guesses, 5);
    assert.equal((await service.verify({ ...input(guesses), code: correct })).body.code, 'CODE_EXHAUSTED');

    timestamp += 60000;
    const before = emails.length;
    const resends = await Promise.all(Array.from({ length: 6 }, () => service.resend(input(guesses))));
    assert.equal(resends.filter(r => r.status === 202).length, 1);
    assert.equal(emails.length, before + 1);
    const current = { ...resends.find(r => r.status === 202), credential: guesses.credential };
    assert.equal((await service.verify({ ...input(current), code: correct })).body.code, 'CODE_INVALID');

    // Distinct attempts sharing an email must serialize shared budgets as well.
    const starts = await Promise.all(Array.from({ length: 5 }, () => start('parallel-signup@example.com')));
    assert.equal(starts.filter(r => r.status === 202).length, 1);
    assert.equal(starts.filter(r => r.status === 429).length, 4);

    const race = await start('resend-verify-race@example.com'); const oldCode = latest(); timestamp += 60000;
    const [resend, verification] = await Promise.all([
      service.resend(input(race)), service.verify({ ...input(race), code: oldCode })
    ]);
    if (resend.status === 202) assert.equal(verification.body.code, 'SIGNUP_CHANGED');
    else { assert.equal(verification.status, 201); assert.equal(resend.status, 400); }

    const duplicate1 = await start('duplicate-race@example.com'); const code1 = latest(); timestamp += 60000;
    const duplicate2 = await start('duplicate-race@example.com'); const code2 = latest();
    const duplicates = await Promise.all([
      service.verify({ ...input(duplicate1), code: code1 }), service.verify({ ...input(duplicate2), code: code2 })
    ]);
    assert.equal(duplicates.filter(r => r.status === 201).length, 1);
    assert.equal(duplicates.filter(r => r.body.code === 'EMAIL_ALREADY_REGISTERED').length, 1);

    // Roll back both the account insert and token consumption on a DB failure.
    const rollback = await start('rollback-signup@example.com'); const rollbackCode = latest();
    await db.query(`CREATE TRIGGER garden_plotter.fail_signup_consume BEFORE UPDATE ON garden_plotter.pending_signups
      FOR EACH ROW BEGIN IF NEW.consumed_at IS NOT NULL AND OLD.email = 'rollback-signup@example.com'
      THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Validation rollback'; END IF; END`);
    try { await assert.rejects(service.verify({ ...input(rollback), code: rollbackCode })); }
    finally { await db.query('DROP TRIGGER garden_plotter.fail_signup_consume'); }
    const [[rolledBack]] = await db.query("SELECT COUNT(*) AS count FROM garden_plotter.users WHERE email = 'rollback-signup@example.com'");
    assert.equal(rolledBack.count, 0);
    assert.equal((await service.verify({ ...input(rollback), code: rollbackCode })).status, 201);
    console.log('PASS: MySQL signup concurrency, shared limits, resend/verify races, duplicate emails and rollback');
  } finally { await pool.end(); }
};
