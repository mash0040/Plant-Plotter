module.exports = {
    webpack: (config, { buildId, isServer }) => {
    if (isServer) {
        config.plugins.push(
        new Webpack.IgnorePlugin({
            resourceRegExp: /utf-8-validate|bufferutil/,
        })
        );
    }
    return config;
    },
};