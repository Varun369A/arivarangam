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
  ],
  images: {
    domains: ['avatars.githubusercontent.com', 'oaidalleapiprodscus.blob.core.windows.net'],
  },
  // NOTE: API proxy rewrites are handled in src/middleware.ts (runtime env vars).
  // NOTE: No webpack alias — any React alias breaks Next.js hydration (blank page).
  // NOTE: three/R3F/drei NOT in transpilePackages — they are ESM but loaded client-side
  //       only (ssr:false dynamic import). Adding them to transpilePackages creates a
  //       duplicate React module scope → ReactCurrentBatchConfig crash in the arena.
}
module.exports = nextConfig
