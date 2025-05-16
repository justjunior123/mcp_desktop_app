/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  webpack: (config, { isServer }) => {
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
      config.target = 'electron-renderer';
    }
    
    return config;
  },

  // Disable image optimization since we're using Electron
  images: {
    unoptimized: true
  },

  // Ensure proper output for Electron
  output: 'standalone'
};

module.exports = nextConfig; 