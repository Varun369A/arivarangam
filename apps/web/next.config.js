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
  // NOTE: No webpack React alias here — it was causing React to fail during
  //       client-side hydration (blank white page). The ReactCurrentBatchConfig
  //       error in the arena is handled separately via the error.tsx boundary.
}
module.exports = nextConfig
