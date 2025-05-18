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
        'crypto': 'crypto-browserify',
        'stream': 'stream-browserify',
        'url': 'url/',
        'zlib': 'browserify-zlib',
        'http': 'stream-http',
        'https': 'https-browserify',
        'assert': 'assert',
        'os': 'os-browserify/browser',
        'path': 'path-browserify',
        'process': 'process/browser',
        'buffer': 'buffer'
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