/** @type {import('next').NextConfig} */
const webpack = require('webpack');

const nextConfig = {
  webpack: (config, { isServer }) => {
    // Handle .md files
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source',
    });

    // Handle Node.js modules in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: require.resolve('stream-browserify'),
        child_process: false,
        worker_threads: false,
        util: require.resolve('util/'),
        buffer: require.resolve('buffer/'),
        process: require.resolve('process/browser'),
      };
      
      config.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
        })
      );
    }

    // Ignore problematic modules during build
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^extract-zip$/,
      })
    );

    return config;
  },
  // Exclude problematic packages from being processed during build
  serverExternalPackages: [
    'prettier',
    '@aws-sdk/client-s3',
    '@aws-sdk/lib-storage'
  ],
};

module.exports = nextConfig;