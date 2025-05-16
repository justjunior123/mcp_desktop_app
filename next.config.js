/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['i.pravatar.cc'],
    unoptimized: process.env.NODE_ENV === 'development'
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
          chunkIds: 'named'
        };
      }

      // Provide polyfills for browser environment
      config.resolve.fallback = {
        ...config.resolve.fallback,
        path: false,
        fs: false,
        crypto: false,
        stream: false,
        os: false
      };
    }
    
    return config;
  },
  // Add compression
  compress: true,
  // Add powered by header
  poweredByHeader: false,
  // Enable strict mode for better error catching
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  }
};

module.exports = nextConfig; 