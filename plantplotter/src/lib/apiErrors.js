export const API_ERROR_CODES = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  FORBIDDEN: 'FORBIDDEN',
  NETWORK_ERROR: 'NETWORK_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
};

export const SERVICE_UNAVAILABLE_MESSAGE = 'Service temporarily unavailable. Please try again shortly.';
export const NETWORK_ERROR_MESSAGE = 'Cannot connect to the server. Please check your connection and try again.';
export const SERVER_ERROR_MESSAGE = 'Server error. Please try again later.';
export const UNEXPECTED_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export class ApiError extends Error {
  constructor(message, {
    status = null,
    code = API_ERROR_CODES.UNEXPECTED_ERROR,
    errors = null,
    retryAfter = null,
    cause = null
  } = {}) {
    super(message || UNEXPECTED_ERROR_MESSAGE);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors || undefined;
    this.fieldErrors = errors || undefined;
    this.retryAfter = retryAfter || undefined;

    if (cause) {
      this.cause = cause;
    }
  }
}

export const getUserFacingErrorMessage = (error, fallbackMessage = UNEXPECTED_ERROR_MESSAGE) => (
  error?.message || fallbackMessage
);

export const isAuthenticationError = (error) => error?.status === 401;

export const isValidationError = (error) => (
  error?.status === 400 || error?.code === API_ERROR_CODES.VALIDATION_ERROR || Boolean(error?.errors)
);

export const isServiceUnavailableError = (error) => (
  error?.status === 503 || error?.code === API_ERROR_CODES.SERVICE_UNAVAILABLE
);

export const isNetworkError = (error) => (
  error?.code === API_ERROR_CODES.NETWORK_ERROR
);

export const isServerError = (error) => (
  error?.status >= 500 && !isServiceUnavailableError(error)
);

export const shouldUseLocalReadFallback = (error) => (
  isNetworkError(error) || isServerError(error)
);

export const shouldUseLocalWriteFallback = (error) => (
  isNetworkError(error) || isServerError(error)
);
