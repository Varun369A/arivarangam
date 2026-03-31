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
  // Deduplicate React so @react-three/fiber uses the same instance as Next.js.
  // Fixes: TypeError: Cannot read properties of undefined (reading 'ReactCurrentBatchConfig')
  // Key differences from previous broken attempt:
  //   1. require.resolve finds the actual installed path (works hoisted or local)
  //   2. ...config.resolve.alias preserves Next.js's existing aliases
  //   3. Both react AND react-dom are aliased
  //   4. Only applied to the client bundle (isServer guard)
  webpack(config, { isServer }) {
    if (!isServer) {
      const reactPath = path.dirname(require.resolve('react/package.json'))
      const reactDomPath = path.dirname(require.resolve('react-dom/package.json'))
      config.resolve.alias = {
        ...config.resolve.alias,
        react: reactPath,
        'react-dom': reactDomPath,
      }
    }
    return config
  },
}
module.exports = nextConfig
