const jwt = require('jsonwebtoken');
const db = require('../config/db');
const JWT_SECRET = require('../config/jwtSecret');
const { createSignupService } = require('../utils/signupService');
const { getSignupCookieName, setSignupCookie, setAuthCookie } = require('../utils/authCookie');
const { validateEmail } = require('../utils/emailValidation');
const { sendErrorResponse } = require('../utils/apiErrorResponse');
const { sendDatabaseAwareErrorResponse } = require('../utils/databaseAvailability');
const { rateLimitKeyGenerator } = require('../middleware/rateLimiters');
const { isProtectedDemoAccount } = require('../utils/protectedDemoAccount');

const service = createSignupService({ db });
const input = req => ({ ...req.body, credential: req.cookies?.[getSignupCookieName()], ip: rateLimitKeyGenerator(req) });

function respond(res, result) {
  res.set('Cache-Control', 'no-store');
  if (result.body.retryAfter) res.set('Retry-After', String(result.body.retryAfter));
  if (result.body.user) {
    const user = result.body.user;
    const token = jwt.sign({ id: user.id, email: user.email, username: user.username, sessionVersion: 0 },
      JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '24h' });
    setAuthCookie(res, token);
    user.isProtectedDemo = isProtectedDemoAccount(user);
  }
  return res.status(result.status).json(result.body);
}
const handle = operation => async (req, res) => {
  try { return respond(res, await operation(req, res)); } catch (error) {
    // SQL errors can include bound password hashes/verifiers. Do not log them.
    return sendDatabaseAwareErrorResponse(res, error, { message: 'Signup could not be completed. Please try again.' });
  }
};
const startSignup = handle((req, res) => service.start({ ...input(req),
  username: req.body.username.trim(), email: req.body.email.trim().toLowerCase(),
  onReserved: credential => setSignupCookie(res, credential) }));
const signupStatus = handle(req => service.status(req.cookies?.[getSignupCookieName()]));
const verifySignup = handle(req => service.verify(input(req)));
const resendSignup = handle(req => service.resend({ ...input(req), email: undefined }));
const changeSignupEmail = async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const message = validateEmail(email);
  if (message) return sendErrorResponse(res, 400, message, { code: 'VALIDATION_ERROR', errors: { email: message } });
  return handle(() => service.resend({ ...input(req), email }))(req, res);
};

module.exports = { startSignup, signupStatus, verifySignup, resendSignup, changeSignupEmail };
