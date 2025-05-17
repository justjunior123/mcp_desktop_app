/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['i.pravatar.cc'],
    unoptimized: process.env.NODE_ENV === 'development'
  },
  experimental: {
    externalDir: true
  },
  webpack: (config, { isServer, dev }) => {
    // Handle ESM modules properly
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx']
    };
    
    // Ensure babel-loader ignores .cjs files
    if (config.module && config.module.rules) {
      const babelRule = config.module.rules.find((rule) => {
        return rule.test && rule.test.toString().includes('jsx');
      });
      
      if (babelRule) {
        babelRule.exclude = [/node_modules/, /\.cjs$/];
      }
    }

    // Handle native modules in Electron
    if (!isServer) {
      config.target = 'web';
      
      // Enable HMR in development
      if (dev) {
        config.optimization = {
          ...config.optimization,
          moduleIds: 'named',
          chunkIds: 'named',
          splitChunks: {
            ...config.optimization?.splitChunks,
            chunks: 'all',
            minSize: 20000,
            maxSize: 244000,
            hidePathInfo: true,
            automaticNameDelimiter: '~'
          }
        };

        config.watchOptions = {
          aggregateTimeout: 200,
          poll: 1000,
          ignored: ['**/node_modules', '**/.next']
        };
      }

      // Provide minimal fallbacks for browser environment
      config.resolve.fallback = {
        ...config.resolve.fallback,
        path: false,
        fs: false
      };
    }
    
    return config;
  },
  compress: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  }
};

module.exports = nextConfig; 