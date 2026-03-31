const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
  reactStrictMode: true,
  transpilePackages: [
    '@arivarangam/types',
    '@arivarangam/config',
    'three',
    '@react-three/fiber',
    '@react-three/drei',
  ],
  images: {
    domains: ['avatars.githubusercontent.com', 'oaidalleapiprodscus.blob.core.windows.net'],
  },
  webpack(config) {
    // Force all packages to share a single React instance.
    // Prevents "Cannot read properties of undefined (reading 'ReactCurrentBatchConfig')"
    // which happens when @react-three/fiber or other libs bundle their own React copy.
    config.resolve.alias = {
      ...config.resolve.alias,
      react: require.resolve('react'),
      'react-dom': require.resolve('react-dom'),
    }
    return config
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
