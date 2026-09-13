// This address is reserved for the shared account in the seed data and README.
// Callers must pass a database user record, never request data or JWT identity fields.
const PROTECTED_DEMO_EMAIL = 'demo@plantplotter.com';

const isProtectedDemoAccount = (user) => (
  typeof user?.email === 'string'
  && user.email.trim().toLowerCase() === PROTECTED_DEMO_EMAIL
);

module.exports = { isProtectedDemoAccount };
