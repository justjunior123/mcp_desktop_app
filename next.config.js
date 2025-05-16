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

      // Add loaders to remove React DevTools message
      config.module.rules.push(
        {
          test: /react-dom\.development\.js$/,
          loader: 'string-replace-loader',
          options: {
            search: 'Download the React DevTools[^"]*',
            replace: '',
            flags: 'g'
          }
        },
        {
          // More specific rule for the exact file
          test: /next\/dist\/compiled\/react-dom\/cjs\/react-dom\.development\.js$/,
          loader: 'string-replace-loader',
          options: {
            multiple: [
              {
                search: 'Download the React DevTools for a better development experience',
                replace: ''
              },
              {
                search: 'https://reactjs.org/link/react-devtools',
                replace: ''
              },
              {
                // Remove the entire console.log statement
                search: /console\.[a-z]+\(\s*(['"])%cDownload the React DevTools[^;]+;/g,
                replace: ''
              }
            ]
          }
        }
      );
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