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

const sendWithResend = async ({ apiKey, from, to, resetUrl }) => {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      subject: 'Reset your PlantPlotter password',
      html: `
        <p>Use this link to reset your PlantPlotter password:</p>
        <p><a href="${resetUrl}">Reset password</a></p>
        <p>This link expires soon. If you did not request it, you can ignore this email.</p>
      `,
      text: `Use this link to reset your PlantPlotter password: ${resetUrl}`
    })
  });

  if (!response.ok) {
    throw new Error(`Resend email failed with status ${response.status}`);
  }
};

const sendWithSendGrid = async ({ apiKey, from, to, resetUrl }) => {
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject: 'Reset your PlantPlotter password',
      content: [
        {
          type: 'text/plain',
          value: `Use this link to reset your PlantPlotter password: ${resetUrl}`
        },
        {
          type: 'text/html',
          value: `
            <p>Use this link to reset your PlantPlotter password:</p>
            <p><a href="${resetUrl}">Reset password</a></p>
            <p>This link expires soon. If you did not request it, you can ignore this email.</p>
          `
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`SendGrid email failed with status ${response.status}`);
  }
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

  if (config.provider === 'resend') {
    await sendWithResend({ ...config, to, resetUrl });
    return { sent: true };
  }

  if (config.provider === 'sendgrid') {
    await sendWithSendGrid({ ...config, to, resetUrl });
    return { sent: true };
  }

  throw new Error('Unsupported email provider');
};

module.exports = {
  getRequiredEmailConfig,
  sendPasswordResetEmail
};
