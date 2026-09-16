const crypto = require('node:crypto');
const bcrypt = require('bcrypt');
const JWT_SECRET = require('../config/jwtSecret');
const { sendSignupCodeEmail } = require('./emailService');

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const hashCredential = value => crypto.createHash('sha256').update(value).digest('hex');
const verifierKey = crypto.createHmac('sha256', JWT_SECRET).update('plantplotter/signup-code/v1').digest();
const codeVerifier = (attempt, code) => crypto.createHmac('sha256', verifierKey)
  .update(JSON.stringify([attempt.id, attempt.email, attempt.revision, code])).digest('hex');
const failure = (status, code, message, extra = {}) => ({ status, body: { code, message, ...extra } });
const unavailable = () => failure(400, 'SIGNUP_EXPIRED', 'This signup has expired. Start again to create your account.');
const duplicate = () => failure(409, 'EMAIL_ALREADY_REGISTERED', 'Email already registered. Sign in or use another email address.');

async function transaction(db, operation) {
  const connection = await db.getConnection();
  let destroyed = false;
  try {
    await connection.beginTransaction();
    const result = await operation(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try { await connection.rollback(); } catch {
      destroyed = true;
      connection.destroy();
    }
    throw error;
  } finally {
    if (!destroyed) connection.release();
  }
}

// Lock every bucket in a stable order. Limits live in MySQL, shared across API
// instances, restarts, new attempts and resends. Only expired buckets are reset.
async function takeBudget(connection, specifications, now) {
  const buckets = [];
  for (const [kind, identity, duration, maximum] of specifications
    .map(([kind, identity, duration, maximum]) => [kind, hashCredential(identity), duration, maximum])
    .sort((a, b) => `${a[0]}:${a[1]}`.localeCompare(`${b[0]}:${b[1]}`))) {
    const key = `${kind}:${identity}`;
    await connection.execute(`INSERT INTO signup_limits (bucket_key, used, expires_at) VALUES (?, 0, ?)
      ON DUPLICATE KEY UPDATE bucket_key = bucket_key`, [key, new Date(now + duration)]);
    const [[bucket]] = await connection.execute('SELECT used, expires_at FROM signup_limits WHERE bucket_key = ? FOR UPDATE', [key]);
    const expired = new Date(bucket.expires_at).getTime() <= now;
    if (!expired && bucket.used >= maximum) {
      return failure(429, 'RATE_LIMITED', 'Too many requests. Please wait before trying again.', {
        retryAfter: Math.max(1, Math.ceil((new Date(bucket.expires_at).getTime() - now) / 1000))
      });
    }
    buckets.push({ key, used: expired ? 0 : bucket.used, expires: expired ? new Date(now + duration) : bucket.expires_at });
  }
  for (const bucket of buckets) {
    await connection.execute('UPDATE signup_limits SET used = ?, expires_at = ? WHERE bucket_key = ?', [bucket.used + 1, bucket.expires, bucket.key]);
  }
  return null;
}

const sendBudgets = (email, ip) => [
  ['send-email-cooldown', email, MINUTE, 1], ['send-email-hour', email, HOUR, 5],
  ['send-email-day', email, DAY, 10], ['send-ip-hour', ip, HOUR, 20], ['send-ip-day', ip, DAY, 100]
];
const publicAttempt = (attempt, now) => ({
  attemptId: attempt.id, revision: attempt.revision, email: attempt.email,
  delivery: attempt.delivery_state,
  expiresAt: attempt.code_expires_at,
  resendAfter: Math.max(0, Math.ceil((new Date(attempt.resend_at).getTime() - now) / 1000)),
  exhausted: attempt.failed_guesses >= 5
});

function createSignupService({ db, sendEmail = sendSignupCodeEmail, now = Date.now,
  generateCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0') }) {
  async function load(connection, credential, lock = false) {
    if (typeof credential !== 'string' || !/^[a-f0-9]{64}$/.test(credential)) return null;
    const [rows] = await connection.execute(`SELECT * FROM pending_signups WHERE credential_hash = ?${lock ? ' FOR UPDATE' : ''}`, [hashCredential(credential)]);
    return rows[0] || null;
  }
  const usable = attempt => attempt && new Date(attempt.expires_at).getTime() > now();
  const matches = (attempt, input) => attempt.id === input.attemptId && attempt.revision === input.revision;
  async function cleanup() {
    await db.execute('DELETE FROM pending_signups WHERE expires_at <= ? LIMIT 100', [new Date(now())]);
    await db.execute('DELETE FROM signup_limits WHERE expires_at <= ? LIMIT 100', [new Date(now())]);
  }
  async function deliver(attempt, code) {
    let accepted = false;
    try {
      const result = await sendEmail({ to: attempt.email, code });
      accepted = result?.sent === true;
    } catch { /* Never log provider errors: they may contain message bodies. */ }
    // A slow provider response cannot reactivate a changed/consumed generation.
    const [result] = await db.execute(`UPDATE pending_signups SET delivery_state = ?
      WHERE id = ? AND revision = ? AND delivery_state = 'sending' AND consumed_at IS NULL`,
    [accepted ? 'sent' : 'failed', attempt.id, attempt.revision]);
    if (result.affectedRows !== 1) return failure(409, 'SIGNUP_CHANGED', 'Your signup changed. Reload to continue with the latest details.');
    attempt.delivery_state = accepted ? 'sent' : 'failed';
    return { status: 202, body: { pending: publicAttempt(attempt, now()),
      message: accepted ? 'Check your inbox for your verification code.' : 'We could not send your code. Use Resend code to try again.' } };
  }
  function prepare(attempt, email = attempt.email) {
    let code;
    // Even an accidental random collision must not make the previous email's
    // six digits valid after a resend or address correction.
    do { code = generateCode(); } while (attempt.code_verifier && codeVerifier(attempt, code) === attempt.code_verifier);
    const timestamp = now();
    Object.assign(attempt, { email, revision: attempt.revision + 1, failed_guesses: 0,
      code_expires_at: new Date(timestamp + 10 * MINUTE), resend_at: new Date(timestamp + MINUTE), delivery_state: 'sending' });
    attempt.code_verifier = codeVerifier(attempt, code);
    return code;
  }
  async function existing(connection, email) {
    const [users] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
    return users.length > 0;
  }
  return {
    async start({ username, email, password, ip, credential: previousCredential, onReserved = () => {} }) {
      if (await existing(db, email)) return duplicate();
      await cleanup();
      const credential = crypto.randomBytes(32).toString('hex');
      const attempt = { id: crypto.randomUUID(), credential_hash: hashCredential(credential), username, email,
        password_hash: await bcrypt.hash(password, 10), revision: 0, expires_at: new Date(now() + DAY) };
      const code = prepare(attempt);
      const reserved = await transaction(db, async connection => {
        const previous = await load(connection, previousCredential, true);
        const limited = await takeBudget(connection, sendBudgets(email, ip), now());
        if (limited) return limited;
        if (previous && !previous.consumed_at) {
          await connection.execute('DELETE FROM pending_signups WHERE id = ?', [previous.id]);
        }
        await connection.execute(`INSERT INTO pending_signups
          (id, credential_hash, username, email, password_hash, revision, code_verifier,
           code_expires_at, resend_at, delivery_state, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [attempt.id, attempt.credential_hash, username, email, attempt.password_hash, attempt.revision,
          attempt.code_verifier, attempt.code_expires_at, attempt.resend_at, attempt.delivery_state, attempt.expires_at]);
        return null;
      });
      if (reserved) return reserved;
      onReserved(credential);
      return { ...await deliver(attempt, code), credential };
    },
    async status(credential) {
      const attempt = await load(db, credential);
      if (!usable(attempt)) return { status: 200, body: { pending: null } };
      if (attempt.consumed_at) return { status: 200, body: { pending: null, completed: true } };
      return { status: 200, body: { pending: publicAttempt(attempt, now()) } };
    },
    async resend({ credential, ip, email, ...input }) {
      let attempt;
      let code;
      const reserved = await transaction(db, async connection => {
        attempt = await load(connection, credential, true);
        if (!usable(attempt) || attempt.consumed_at) return unavailable();
        if (!matches(attempt, input)) return failure(409, 'SIGNUP_CHANGED', 'Your signup changed. Reload to continue with the latest details.');
        const remaining = Math.ceil((new Date(attempt.resend_at).getTime() - now()) / 1000);
        if (remaining > 0) return failure(429, 'RATE_LIMITED', 'Please wait before requesting another code.', { retryAfter: remaining });
        const destination = email || attempt.email;
        if (await existing(connection, destination)) return duplicate();
        const limited = await takeBudget(connection, sendBudgets(destination, ip), now());
        if (limited) return limited;
        code = prepare(attempt, destination);
        await connection.execute(`UPDATE pending_signups SET email = ?, revision = ?, code_verifier = ?,
          code_expires_at = ?, resend_at = ?, delivery_state = 'sending', failed_guesses = 0 WHERE id = ?`,
        [attempt.email, attempt.revision, attempt.code_verifier, attempt.code_expires_at, attempt.resend_at, attempt.id]);
        return null;
      });
      return reserved || deliver(attempt, code);
    },
    async verify({ credential, ip, code, ...input }) {
      return transaction(db, async connection => {
        const attempt = await load(connection, credential, true);
        if (!usable(attempt)) return unavailable();
        if (attempt.consumed_at) return failure(400, 'CODE_CONSUMED', 'This code has already been used. Sign in to your account.');
        if (!matches(attempt, input)) return failure(409, 'SIGNUP_CHANGED', 'Your signup changed. Reload to continue with the latest details.');
        if (attempt.failed_guesses >= 5) return failure(400, 'CODE_EXHAUSTED', 'Too many incorrect codes. Request a new code.');
        if (new Date(attempt.code_expires_at).getTime() <= now()) return failure(400, 'CODE_EXPIRED', 'This code has expired. Request a new code.');
        if (attempt.delivery_state !== 'sent') return failure(400, 'CODE_NOT_SENT', 'Your code is not ready. Wait a moment or resend it.');
        const limited = await takeBudget(connection, [
          ['guess-email-hour', attempt.email, HOUR, 25], ['guess-ip-hour', ip, HOUR, 100]
        ], now());
        if (limited) return limited;
        const valid = typeof code === 'string' && /^\d{6}$/.test(code)
          && crypto.timingSafeEqual(Buffer.from(codeVerifier(attempt, code), 'hex'), Buffer.from(attempt.code_verifier, 'hex'));
        if (!valid) {
          await connection.execute('UPDATE pending_signups SET failed_guesses = failed_guesses + 1 WHERE id = ?', [attempt.id]);
          const message = attempt.failed_guesses >= 4 ? 'Too many incorrect codes. Request a new code.' : 'Enter the six-digit code from your latest email.';
          return failure(400, attempt.failed_guesses >= 4 ? 'CODE_EXHAUSTED' : 'CODE_INVALID', message, { errors: { code: message } });
        }
        let result;
        try {
          [result] = await connection.execute(`INSERT INTO users
            (username, email, password_hash, is_active, email_verified, session_version, created_at, updated_at)
            VALUES (?, ?, ?, TRUE, TRUE, 0, NOW(), NOW())`, [attempt.username, attempt.email, attempt.password_hash]);
        } catch (error) {
          if (error.code === 'ER_DUP_ENTRY') return duplicate();
          throw error;
        }
        await connection.execute(`UPDATE pending_signups SET consumed_at = ?, password_hash = NULL, code_verifier = NULL WHERE id = ?`, [new Date(now()), attempt.id]);
        return { status: 201, body: { user: { id: result.insertId, username: attempt.username, email: attempt.email } } };
      });
    }
  };
}

module.exports = { createSignupService, codeVerifier, hashCredential, transaction };
