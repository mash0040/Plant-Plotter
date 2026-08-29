const { isIP } = require('node:net');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { buildErrorResponse } = require('../utils/apiErrorResponse');

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const TOO_MANY_REQUESTS_RESPONSE = {
  ...buildErrorResponse('Too many requests. Please try again later.', {
    code: 'RATE_LIMITED'
  })
};

const isTest = process.env.NODE_ENV === 'test';

const normalizeIpForRateLimit = (ip) => {
  if (!ip) return '';

  const value = ip.toString().trim();
  if (isIP(value)) return value;

  const bracketedIpv6WithPort = value.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketedIpv6WithPort && isIP(bracketedIpv6WithPort[1])) {
    return bracketedIpv6WithPort[1];
  }

  const ipv4WithPort = value.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort && isIP(ipv4WithPort[1])) {
    return ipv4WithPort[1];
  }

  return value;
};

const rateLimitKeyGenerator = (req) => (
  ipKeyGenerator(normalizeIpForRateLimit(req.ip))
);

const createLimiter = ({ windowMs, max }) => (
  rateLimit({
    windowMs,
    max,
    keyGenerator: rateLimitKeyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTest,
    handler: (req, res) => {
      res.status(429).json(TOO_MANY_REQUESTS_RESPONSE);
    }
  })
);

const generalApiLimiter = createLimiter({
  windowMs: FIFTEEN_MINUTES,
  max: 300
});

const authLimiter = createLimiter({
  windowMs: FIFTEEN_MINUTES,
  max: 10
});

const passwordResetLimiter = createLimiter({
  windowMs: FIFTEEN_MINUTES,
  max: 5
});

module.exports = {
  generalApiLimiter,
  authLimiter,
  passwordResetLimiter,
  normalizeIpForRateLimit,
  rateLimitKeyGenerator
};
