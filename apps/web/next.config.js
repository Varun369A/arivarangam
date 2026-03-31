const path = require('path')

// Monorepo root (two levels up from apps/web/)
const monorepoRoot = path.join(__dirname, '../../')

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: monorepoRoot,
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
    // require.resolve gives the file path — use path.dirname on package.json to get
    // the directory so sub-paths like react/jsx-runtime still resolve correctly.
    const reactDir = path.dirname(require.resolve('react/package.json'))
    const reactDomDir = path.dirname(require.resolve('react-dom/package.json'))
    config.resolve.alias = {
      ...config.resolve.alias,
      react: reactDir,
      'react-dom': reactDomDir,
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
