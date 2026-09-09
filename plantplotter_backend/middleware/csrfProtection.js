const { sendErrorResponse } = require('../utils/apiErrorResponse');

const CSRF_HEADER_NAME = 'X-CSRF-Protection';
const CSRF_HEADER_VALUE = '1';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const requireCsrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  if (req.get(CSRF_HEADER_NAME) !== CSRF_HEADER_VALUE) {
    return sendErrorResponse(res, 403, 'This request could not be verified. Please refresh and try again.', {
      code: 'CSRF_VALIDATION_FAILED'
    });
  }

  return next();
};

module.exports = {
  CSRF_HEADER_NAME,
  CSRF_HEADER_VALUE,
  requireCsrfProtection
};
