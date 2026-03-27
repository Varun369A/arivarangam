/**
 * Worker process stub — delegates to the API worker entry point.
 *
 * The actual worker logic lives in apps/api/src/worker.ts
 * This package provides a separate Docker build context for Railway deployment.
 *
 * In Railway: deploy TWO services from the same repo
 *   Service 1 (api):    cd apps/api && node dist/server.js
 *   Service 2 (worker): cd apps/api && node dist/worker.js
 *
 * Or run directly:
 *   npm run dev:worker  (from apps/api/)
 */

// This file intentionally left minimal — run apps/api/src/worker.ts directly
require('../../api/src/worker');
