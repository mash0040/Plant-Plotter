function getApiOrigin() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    if (!apiUrl) {
        return null;
    }

    try {
        return new URL(apiUrl).origin;
    } catch {
        throw new Error('NEXT_PUBLIC_API_URL must be a valid absolute URL.');
    }
}

function createContentSecurityPolicy() {
    const apiOrigin = getApiOrigin();
    const isDevelopment = process.env.NODE_ENV === 'development';
    const connectSources = [
        "'self'",
        apiOrigin,
        'https://api.open-meteo.com',
        isDevelopment ? 'ws:' : null,
    ].filter(Boolean);

    const directives = [
        "default-src 'self'",
        `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
        "script-src-attr 'none'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data:",
        "font-src 'self'",
        `connect-src ${connectSources.join(' ')}`,
        "media-src 'self'",
        "worker-src 'self' blob:",
        "manifest-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-src 'none'",
        "frame-ancestors 'none'",
    ];

    if (!isDevelopment) {
        directives.push('upgrade-insecure-requests');
    }

    return `${directives.join('; ')};`;
}

const SECURITY_HEADERS = [
    {
        key: 'Content-Security-Policy',
        value: createContentSecurityPolicy(),
    },
    {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(self)',
    },
    {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
    },
    {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
    },
    {
        key: 'X-Frame-Options',
        value: 'DENY',
    },
];

module.exports = {
    output: 'standalone',
    async headers() {
        return [
            {
                source: '/:path*',
                headers: SECURITY_HEADERS,
            },
        ];
    },
    webpack: (config, { buildId, isServer, webpack }) => {
        if (isServer) {
            config.plugins.push(
                new webpack.IgnorePlugin({
                    resourceRegExp: /utf-8-validate|bufferutil/,
                })
            );
        }
        return config;
    },
};
