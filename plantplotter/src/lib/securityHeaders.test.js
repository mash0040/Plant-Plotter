import nextConfig from '../../next.config.js';

async function getSecurityHeaders() {
  const routes = await nextConfig.headers();
  return Object.fromEntries(
    routes[0].headers.map(({ key, value }) => [key, value])
  );
}

describe('frontend security headers', () => {
  it('applies the baseline to every route', async () => {
    const routes = await nextConfig.headers();

    expect(routes).toHaveLength(1);
    expect(routes[0].source).toBe('/:path*');
  });

  it('limits browser connections to the app dependencies', async () => {
    const headers = await getSecurityHeaders();
    const policy = headers['Content-Security-Policy'];

    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain(
      "connect-src 'self' http://localhost:5001 https://api.open-meteo.com"
    );
    expect(policy).toContain("script-src-attr 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("frame-ancestors 'none'");
  });

  it('preserves same-origin location while disabling unused device access', async () => {
    const headers = await getSecurityHeaders();

    expect(headers['Permissions-Policy']).toBe(
      'camera=(), microphone=(), geolocation=(self)'
    );
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
  });
});
