const db = require('../config/db');
const { isProtectedDemoAccount } = require('./protectedDemoAccount');
const { sendErrorResponse } = require('./apiErrorResponse');
const { sendDatabaseAwareErrorResponse } = require('./databaseAvailability');

const DEMO_DATA_MESSAGE = 'This showcase record cannot be deleted. You can create and delete your own demo records.';
const TABLES = new Set(['gardens', 'garden_tasks', 'garden_activities']);

// Only persisted keys and the stored account identity determine protection.
// Public responses expose a capability, never the internal seed key.
const withDemoProtection = async (records, userId) => {
  const isList = Array.isArray(records);
  const rows = isList ? records : [records];
  let protectedAccount = false;
  if (rows.some(row => row?.demo_showcase_key != null)) {
    const [users] = await db.execute('SELECT id, email FROM users WHERE id = ?', [userId]);
    if (!users.length) throw new Error('Demo permissions could not be checked');
    protectedAccount = isProtectedDemoAccount(users[0]);
  }
  const result = rows.map(({ demo_showcase_key, ...row }) => ({
    ...row,
    isDeletionProtected: protectedAccount && demo_showcase_key != null
  }));
  return isList ? result : result[0];
};

const requireDeletableDemoRecord = (table) => {
  if (!TABLES.has(table)) throw new Error('Unsupported demo record table');
  return async (req, res, next) => {
    try {
      const [records] = await db.execute(
        `SELECT record.demo_showcase_key, owner.email
         FROM ${table} record JOIN users owner ON owner.id = record.user_id
         WHERE record.id = ? AND record.user_id = ?`,
        [req.params.id, req.user.id]
      );
      if (records.some(record => record.demo_showcase_key != null && isProtectedDemoAccount(record))) {
        return sendErrorResponse(res, 403, DEMO_DATA_MESSAGE, { code: 'DEMO_DATA_PROTECTED' });
      }
      // Existing handlers retain their ownership/not-found responses.
      next();
    } catch (error) {
      sendDatabaseAwareErrorResponse(res, error, { message: 'Deletion permissions could not be checked.' });
    }
  };
};

module.exports = { withDemoProtection, requireDeletableDemoRecord, DEMO_DATA_MESSAGE };
