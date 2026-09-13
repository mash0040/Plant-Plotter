const db = require('../config/db');
const { isProtectedDemoAccount } = require('../utils/protectedDemoAccount');
const { sendErrorResponse } = require('../utils/apiErrorResponse');
const { sendDatabaseAwareErrorResponse } = require('../utils/databaseAvailability');
const { clearAuthCookie } = require('../utils/authCookie');

// Run after authentication and before any account-level mutation or transaction.
module.exports = async (req, res, next) => {
  try {
    const [users] = await db.execute('SELECT id, email FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      if (req.method === 'DELETE') clearAuthCookie(res);
      return sendErrorResponse(res, 404, 'User not found', { code: 'USER_NOT_FOUND' });
    }
    if (isProtectedDemoAccount(users[0])) {
      return sendErrorResponse(res, 403, 'The shared demo account cannot be changed or deleted.', {
        code: 'DEMO_ACCOUNT_PROTECTED'
      });
    }
    next();
  } catch (error) {
    sendDatabaseAwareErrorResponse(res, error, { message: 'Account permissions could not be checked.' });
  }
};
