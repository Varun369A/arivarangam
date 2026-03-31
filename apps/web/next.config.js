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
  // NOTE: API proxy rewrites are handled in src/middleware.ts (runtime env vars).
  // resolve.dedupe forces a single React instance in the client bundle so that
  // @react-three/fiber doesn't get its own copy, which caused the
  // "Cannot read properties of undefined (reading 'ReactCurrentBatchConfig')" crash.
  // Unlike resolve.alias this does NOT break react/jsx-runtime sub-path exports.
  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve.dedupe = [
        ...(config.resolve.dedupe || []),
        'react',
        'react-dom',
      ]
    }
    return config
  },
}
module.exports = nextConfig
