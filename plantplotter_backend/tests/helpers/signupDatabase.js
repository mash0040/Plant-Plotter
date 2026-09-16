const assert = require('node:assert/strict');

// Transactional state double for fast service/route tests. Real lock behavior is
// covered separately by the disposable-MySQL validator.
function signupDatabase(initialUsers = []) {
  let state = { users: initialUsers, attempts: [], limits: [] };
  let queue = Promise.resolve();
  async function execute(target, sql, p = []) {
    const s = sql.replace(/\s+/g, ' ').trim();
    if (s.startsWith('SELECT id FROM users WHERE email')) return [target.users.filter(x => x.email === p[0])];
    if (s.startsWith('SELECT * FROM pending_signups')) return [target.attempts.filter(x => x.credential_hash === p[0]).map(x => ({ ...x }))];
    if (s.startsWith('DELETE FROM pending_signups WHERE expires_at')) { target.attempts = target.attempts.filter(x => x.expires_at > p[0]); return [{ affectedRows: 0 }]; }
    if (s.startsWith('DELETE FROM signup_limits')) { target.limits = target.limits.filter(x => x.expires_at > p[0]); return [{ affectedRows: 0 }]; }
    if (s.startsWith('DELETE FROM pending_signups WHERE id')) { target.attempts = target.attempts.filter(x => x.id !== p[0]); return [{ affectedRows: 1 }]; }
    if (s.startsWith('INSERT INTO signup_limits')) {
      if (!target.limits.some(x => x.bucket_key === p[0])) target.limits.push({ bucket_key: p[0], used: 0, expires_at: p[1] });
      return [{ affectedRows: 1 }];
    }
    if (s.startsWith('SELECT used, expires_at FROM signup_limits')) return [target.limits.filter(x => x.bucket_key === p[0])];
    if (s.startsWith('UPDATE signup_limits')) { Object.assign(target.limits.find(x => x.bucket_key === p[2]), { used: p[0], expires_at: p[1] }); return [{ affectedRows: 1 }]; }
    if (s.startsWith('INSERT INTO pending_signups')) {
      const [id, credential_hash, username, email, password_hash, revision, code_verifier, code_expires_at, resend_at, delivery_state, expires_at] = p;
      target.attempts.push({ id, credential_hash, username, email, password_hash, revision, code_verifier, code_expires_at, resend_at, delivery_state, expires_at, consumed_at: null, failed_guesses: 0 });
      return [{ affectedRows: 1 }];
    }
    if (s.startsWith('UPDATE pending_signups SET delivery_state')) {
      const row = target.attempts.find(x => x.id === p[1] && x.revision === p[2] && x.delivery_state === 'sending' && !x.consumed_at);
      if (row) row.delivery_state = p[0];
      return [{ affectedRows: Number(Boolean(row)) }];
    }
    if (s.startsWith('UPDATE pending_signups SET email')) {
      const [email, revision, code_verifier, code_expires_at, resend_at, id] = p;
      Object.assign(target.attempts.find(x => x.id === id), { email, revision, code_verifier, code_expires_at, resend_at, delivery_state: 'sending', failed_guesses: 0 });
      return [{ affectedRows: 1 }];
    }
    if (s.startsWith('UPDATE pending_signups SET failed_guesses')) { target.attempts.find(x => x.id === p[0]).failed_guesses += 1; return [{ affectedRows: 1 }]; }
    if (s.startsWith('INSERT INTO users')) {
      if (target.users.some(x => x.email === p[1])) throw Object.assign(new Error('Duplicate'), { code: 'ER_DUP_ENTRY' });
      const id = target.users.length + 1;
      target.users.push({ id, username: p[0], email: p[1], password_hash: p[2], is_active: true, email_verified: true, session_version: 0 });
      return [{ insertId: id }];
    }
    if (s.startsWith('UPDATE pending_signups SET consumed_at')) { Object.assign(target.attempts.find(x => x.id === p[1]), { consumed_at: p[0], password_hash: null, code_verifier: null }); return [{ affectedRows: 1 }]; }
    assert.fail(`Unexpected signup SQL: ${s}`);
  }
  return {
    get state() { return state; },
    execute: (sql, p) => execute(state, sql, p),
    async getConnection() {
      let working;
      let unlock;
      return {
        async beginTransaction() { const previous = queue; queue = new Promise(resolve => { unlock = resolve; }); await previous; working = structuredClone(state); },
        execute: (sql, p) => execute(working, sql, p),
        async commit() { state = working; }, async rollback() {}, release() { unlock(); }, destroy() { unlock(); }
      };
    }
  };
}
module.exports = signupDatabase;
