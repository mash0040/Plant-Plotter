const rateLimit = require('express-rate-limit');

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const TOO_MANY_REQUESTS_RESPONSE = {
  message: 'Too many requests. Please try again later.'
};

const isTest = process.env.NODE_ENV === 'test';

const createLimiter = ({ windowMs, max }) => (
  rateLimit({
    windowMs,
    max,
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
  passwordResetLimiter
};
