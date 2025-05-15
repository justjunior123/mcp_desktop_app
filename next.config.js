/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  webpack: (config) => {
    // Handle ESM modules properly
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx']
    };
    
    return config;
  },
  
  // Remove output: export since we want to use API routes in development
  // output: 'export',
  
  // Add API route config
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/models/:path*',
          destination: 'http://localhost:3100/api/models/:path*'
        },
        {
          source: '/api/health',
          destination: 'http://localhost:3100/api/health'
        },
        {
          source: '/api/ws',
          destination: 'http://localhost:3100/ws'
        }
      ];
    }
    return [];
  },
  
  // Disable image optimization since we're using Electron
  images: {
    unoptimized: true
  }
};

export default nextConfig; 