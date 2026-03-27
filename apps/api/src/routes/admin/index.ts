import { FastifyInstance } from 'fastify';
import { requireAdmin } from '../../middleware/auth';
import { adminUsersRoutes } from './users';
import { adminTasksRoutes } from './tasks';
import { adminPlatformRoutes } from './platform';
import { adminBillingRoutes } from './billing';
import { adminSecurityRoutes } from './security';
import { adminQueueRoutes } from './queue';

// ─── Admin Routes Index ───────────────────────────────────────────────────────
// All admin routes are protected by requireAdmin middleware.

export async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  // Apply admin auth to all routes in this plugin
  fastify.addHook('preHandler', requireAdmin);

  // Register sub-route groups
  await fastify.register(adminUsersRoutes, { prefix: '/users' });
  await fastify.register(adminTasksRoutes, { prefix: '/tasks' });
  await fastify.register(adminPlatformRoutes, { prefix: '/platform' });
  await fastify.register(adminBillingRoutes, { prefix: '/billing' });
  await fastify.register(adminSecurityRoutes, { prefix: '/security' });
  await fastify.register(adminQueueRoutes, { prefix: '/queue' });
}
