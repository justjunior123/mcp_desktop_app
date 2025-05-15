/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Configure webpack to handle certain file types and babel config
  webpack: (config, { isServer }) => {
    // Ensure babel-loader ignores .cjs files
    if (config.module && config.module.rules) {
      const babelRule = config.module.rules.find((rule) => {
        return rule.test && rule.test.toString().includes('jsx');
      });
      
      if (babelRule) {
        babelRule.exclude = [/node_modules/, /\.cjs$/];
      }
    }
    
    return config;
  },
  
  // Add API route config if needed
  async rewrites() {
    return [
      // Forward API requests to our Express backend if necessary
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      }
    ];
  }
};

export default nextConfig; 