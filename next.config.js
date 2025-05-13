/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Ensure Next.js knows it's running in Electron
  experimental: {
    nodeCompat: true,
  },
}
