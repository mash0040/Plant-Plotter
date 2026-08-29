const DEFAULT_ERROR_MESSAGE = 'Request failed';

const normalizeErrors = (errors) => {
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) {
    return errors;
  }

  const normalizedEntries = Object.entries(errors)
    .filter(([, value]) => value !== undefined);

  return Object.fromEntries(normalizedEntries);
};

const buildErrorResponse = (messageOrBody, options = {}) => {
  const body = {};
  const source = typeof messageOrBody === 'object' && messageOrBody !== null
    ? messageOrBody
    : { message: messageOrBody };

  const message = source.message || source.error || DEFAULT_ERROR_MESSAGE;
  body.message = message;

  const code = options.code || source.code;
  if (code) {
    body.code = code;
  }

  const errors = normalizeErrors(options.errors || source.errors);
  if (errors && (!Array.isArray(errors) || errors.length > 0)) {
    if (typeof errors !== 'object' || Object.keys(errors).length > 0) {
      body.errors = errors;
    }
  }

  return body;
};

const sendErrorResponse = (res, statusCode, messageOrBody, options = {}) => (
  res.status(statusCode).json(buildErrorResponse(messageOrBody, options))
);

module.exports = {
  buildErrorResponse,
  sendErrorResponse
};
