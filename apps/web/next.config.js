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
  webpack(config, { isServer }) {
    // Force all packages to share a single React instance — CLIENT ONLY.
    // Prevents "Cannot read properties of undefined (reading 'ReactCurrentBatchConfig')"
    // Must NOT apply to server bundle: React.cache is server-only and lives in the
    // react-server entry point; aliasing to the browser directory breaks it with
    // "TypeError: (0, d.cache) is not a function".
    if (!isServer) {
      const reactDir = path.dirname(require.resolve('react/package.json'))
      const reactDomDir = path.dirname(require.resolve('react-dom/package.json'))
      config.resolve.alias = {
        ...config.resolve.alias,
        react: reactDir,
        'react-dom': reactDomDir,
      }
    }
    return config
  },
  // NOTE: API proxy rewrites are intentionally NOT here.
  // They're handled in src/middleware.ts so that process.env.API_URL
  // is read at runtime (not baked at build time into a standalone bundle).
}
module.exports = nextConfig
