const getRequiredEmailConfig = () => {
  const provider = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
  const from = (process.env.EMAIL_FROM || '').trim();

  if (!provider || !from) {
    return { provider, from, error: 'Email provider and from address are required' };
  }

  if (provider === 'resend') {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { provider, from, error: 'RESEND_API_KEY is required for Resend' };
    }
    return { provider, from, apiKey };
  }

  if (provider === 'sendgrid') {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      return { provider, from, error: 'SENDGRID_API_KEY is required for SendGrid' };
    }
    return { provider, from, apiKey };
  }

  return { provider, from, error: 'Unsupported email provider' };
};

const resetMessage = resetUrl => ({
  subject: 'Reset your PlantPlotter password',
  html: `<p>Use this link to reset your PlantPlotter password:</p><p><a href="${resetUrl}">Reset password</a></p><p>This link expires soon. If you did not request it, you can ignore this email.</p>`,
  text: `Use this link to reset your PlantPlotter password: ${resetUrl}`
});

const sendMessage = async ({ provider, apiKey, from }, to, message) => {
  const resend = provider === 'resend';
  const response = await fetch(resend ? 'https://api.resend.com/emails' : 'https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    signal: AbortSignal.timeout(10000),
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(resend ? { from, to, ...message } : {
      personalizations: [{ to: [{ email: to }] }], from: { email: from }, subject: message.subject,
      content: [{ type: 'text/plain', value: message.text }, { type: 'text/html', value: message.html }]
    })
  });
  if (!response.ok) throw new Error(`Email provider rejected request (${response.status})`);
  return { sent: true }; // Provider acceptance, not proof of inbox delivery.
};

const sendSignupCodeEmail = async ({ to, code }) => {
  const mode = (process.env.SIGNUP_EMAIL_MODE || 'email').trim().toLowerCase();
  if (mode === 'console') {
    // Explicit local-only delivery channel. Never activate from a missing
    // provider, a failed send, or an unset NODE_ENV.
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Console signup delivery requires NODE_ENV=development');
    }
    console.info(`[development] Signup verification code: ${code} (expires in 10 minutes; no email sent).`);
    return { sent: true };
  }
  if (mode !== 'email') throw new Error('Unsupported signup email mode');
  const config = getRequiredEmailConfig();
  if (config.error) throw new Error(config.error);
  return sendMessage(config, to, {
    subject: 'Verify your PlantPlotter email',
    text: `Your PlantPlotter verification code is ${code}. It expires in 10 minutes. If you did not request it, ignore this email.`,
    html: `<p>Your PlantPlotter verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. If you did not request it, ignore this email.</p>`
  });
};

const sendPasswordResetEmail = async ({ to, resetUrl }) => {
  const config = getRequiredEmailConfig();

  if (config.error) {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`Password reset email is not configured. Dev reset link: ${resetUrl}`);
      return { skipped: true };
    }

    throw new Error(config.error);
  }

  return sendMessage(config, to, resetMessage(resetUrl));
};

module.exports = {
  getRequiredEmailConfig,
  sendSignupCodeEmail,
  sendPasswordResetEmail
};
