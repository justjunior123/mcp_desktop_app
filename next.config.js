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
  
  // Add API route config if needed
  async rewrites() {
    return process.env.NODE_ENV === 'development' 
      ? [
          {
            source: '/api/models/:path*',
            destination: 'http://localhost:3100/api/models/:path*',
          },
          {
            source: '/api/:path*',
            destination: 'http://localhost:3100/api/:path*',
          }
        ]
      : [];
  },
  
  // Output configuration for Electron
  output: 'export',
  
  // Disable server-side features not needed in Electron
  images: {
    unoptimized: true,
  }
};

export default nextConfig; 