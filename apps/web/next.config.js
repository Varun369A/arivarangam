/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@arivarangam/types', '@arivarangam/config'],
  images: {
    domains: ['avatars.githubusercontent.com', 'oaidalleapiprodscus.blob.core.windows.net'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ]
  },
}
module.exports = nextConfig
