const { sendErrorResponse } = require('./apiErrorResponse');

const SERVICE_UNAVAILABLE_MESSAGE = 'Service temporarily unavailable. Please try again shortly.';
const SERVICE_UNAVAILABLE_CODE = 'SERVICE_UNAVAILABLE';
const RETRY_AFTER_SECONDS = '60';

const TEMPORARY_DATABASE_ERROR_CODES = new Set([
  'ENOTFOUND',
  'EAI_AGAIN',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'PROTOCOL_CONNECTION_LOST'
]);

const getErrorChain = (error) => {
  const chain = [];
  const seen = new Set();
  let currentError = error;

  while (currentError && typeof currentError === 'object' && !seen.has(currentError)) {
    chain.push(currentError);
    seen.add(currentError);
    currentError = currentError.cause;
  }

  return chain;
};

const isTemporaryDatabaseUnavailableError = (error) => {
  const errorChain = getErrorChain(error);
  const hasSqlApplicationError = errorChain.some((currentError) => (
    typeof currentError.code === 'string' &&
    currentError.code.startsWith('ER_')
  ));

  if (hasSqlApplicationError) {
    return false;
  }

  return errorChain.some((currentError) => (
    typeof currentError.code === 'string' &&
    TEMPORARY_DATABASE_ERROR_CODES.has(currentError.code)
  ));
};

const sendDatabaseUnavailableResponse = (res, error) => {
  if (!isTemporaryDatabaseUnavailableError(error) || res.headersSent) {
    return false;
  }

  res.set('Retry-After', RETRY_AFTER_SECONDS);
  sendErrorResponse(res, 503, SERVICE_UNAVAILABLE_MESSAGE, {
    code: SERVICE_UNAVAILABLE_CODE
  });

  return true;
};

const sendDatabaseAwareErrorResponse = (res, error, fallbackBody) => {
  if (res.headersSent) {
    return false;
  }

  if (sendDatabaseUnavailableResponse(res, error)) {
    return true;
  }

  sendErrorResponse(res, 500, fallbackBody);
  return true;
};

module.exports = {
  RETRY_AFTER_SECONDS,
  SERVICE_UNAVAILABLE_CODE,
  SERVICE_UNAVAILABLE_MESSAGE,
  TEMPORARY_DATABASE_ERROR_CODES,
  isTemporaryDatabaseUnavailableError,
  sendDatabaseAwareErrorResponse,
  sendDatabaseUnavailableResponse
};
