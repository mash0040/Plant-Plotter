module.exports = {
    output: 'standalone',
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