const webpack = require('webpack');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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

    // Add polyfills
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
        url: require.resolve('url/'),
        zlib: require.resolve('browserify-zlib'),
        http: require.resolve('stream-http'),
        https: require.resolve('https-browserify'),
        assert: require.resolve('assert/'),
        os: require.resolve('os-browserify/browser'),
        path: require.resolve('path-browserify'),
        process: require.resolve('process/browser'),
        buffer: require.resolve('buffer/'),
      };

      config.plugins.push(
        new webpack.ProvidePlugin({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
        })
      );
    }

    // Handle native modules in Electron
    if (!isServer) {
      config.target = 'electron-renderer';
      
      // Configure hot reload for Electron
      if (dev) {
        config.plugins.push(new webpack.HotModuleReplacementPlugin());
      }
      
      // Disable Next.js polyfills that conflict with Electron
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false
      };
    }

    // Optimize chunks for Electron
    if (!isServer && !dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'named',
        chunkIds: 'named',
        splitChunks: {
          ...config.optimization?.splitChunks,
          chunks: 'all',
          minSize: 20000,
          hidePathInfo: true,
          automaticNameDelimiter: '~'
        },
        removeAvailableModules: false,
        removeEmptyChunks: false,
        mergeDuplicateChunks: false
      };

      config.watchOptions = {
        aggregateTimeout: 200,
        poll: 1000,
        ignored: ['**/node_modules', '**/.next']
      };
    }

    // Add path aliases
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, './src'),
      '@components': require('path').resolve(__dirname, './src/components'),
      '@lib': require('path').resolve(__dirname, './src/lib'),
      '@services': require('path').resolve(__dirname, './src/services'),
      '@utils': require('path').resolve(__dirname, './src/utils'),
      '@hooks': require('path').resolve(__dirname, './src/hooks'),
      '@models': require('path').resolve(__dirname, './src/models'),
      '@api': require('path').resolve(__dirname, './src/api')
    };
    
    return config;
  },
  compress: process.env.NODE_ENV === 'production',
  poweredByHeader: false
};

module.exports = nextConfig; 