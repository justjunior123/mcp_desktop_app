const webpack = require('webpack');
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['i.pravatar.cc'],
    unoptimized: process.env.NODE_ENV === 'development'
  },
  serverExternalPackages: ['electron'],
  experimental: {
    turbo: {
      resolveAlias: {
        // TypeScript extensions
        '.ts': '.js',
        '.tsx': '.jsx',
        // Node polyfills
        'crypto': require.resolve('crypto-browserify'),
        'stream': require.resolve('stream-browserify'),
        'url': require.resolve('url/'),
        'zlib': require.resolve('browserify-zlib'),
        'http': require.resolve('stream-http'),
        'https': require.resolve('https-browserify'),
        'assert': require.resolve('assert/'),
        'os': require.resolve('os-browserify/browser'),
        'path': require.resolve('path-browserify'),
        'process': require.resolve('process/browser'),
        'buffer': require.resolve('buffer/')
      }
    }
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `
              default-src 'self';
              script-src 'self' 'unsafe-eval' 'unsafe-inline';
              style-src 'self' 'unsafe-inline';
              img-src 'self' data: https:;
              font-src 'self';
              connect-src 'self' http://localhost:* ws://localhost:*;
              worker-src 'self' blob:;
            `.replace(/\s+/g, ' ').trim()
          }
        ]
      }
    ];
  },
  compress: process.env.NODE_ENV === 'production',
  poweredByHeader: false
};

module.exports = nextConfig; 