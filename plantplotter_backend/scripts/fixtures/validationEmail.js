// Loaded explicitly with --require by the disposable validator only. No API or
// environment switch enables this in the application. Codes stay in IPC memory.
if (process.env.NODE_ENV !== 'test' || typeof process.send !== 'function') {
  throw new Error('Validation email fixture requires the isolated test process');
}
require('../../utils/emailService').sendSignupCodeEmail = async ({ to, code }) => {
  process.send({ type: 'signup-email', to, code });
  return { sent: true };
};
