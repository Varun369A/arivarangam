import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@arrivarangam/db';
import { requireAuth } from '../middleware/auth';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createRepoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  taskId: z.string().optional(),
  isPublic: z.boolean().default(false),
});

const updateRepoSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  isPublic: z.boolean().optional(),
  deployUrl: z.string().url().optional().nullable(),
});

const saveVersionSchema = z.object({
  message: z.string().max(200).default('Version saved'),
  taskId: z.string().optional(),
});

const listReposSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Route Plugin ─────────────────────────────────────────────────────────────

export async function repoRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', requireAuth);

  // GET / — list user repos
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    const queryParse = listReposSchema.safeParse(request.query);
    if (!queryParse.success) {
      return reply.code(400).send({ success: false, error: 'Invalid query parameters' });
    }

    const { page, limit } = queryParse.data;
    const skip = (page - 1) * limit;

    const [repos, total] = await Promise.all([
      prisma.repo.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          description: true,
          taskId: true,
          currentVersion: true,
          isPublic: true,
          deployUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.repo.count({ where: { userId: user.id } }),
    ]);

    return reply.send({
      success: true,
      data: { repos, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  // GET /:id — get repo with files
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const repo = await prisma.repo.findFirst({
      where: { id, userId: user.id },
    });

    if (!repo) {
      return reply.code(404).send({ success: false, error: 'Repo not found' });
    }

    return reply.send({ success: true, data: { repo } });
  });

  // POST / — create repo manually
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    const parseResult = createRepoSchema.safeParse(request.body);
    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      parseResult.error.errors.forEach(e => { errors[e.path.join('.')] = e.message; });
      return reply.code(400).send({ success: false, error: 'Validation failed', details: errors });
    }

    const { name, description, taskId, isPublic } = parseResult.data;

    // If taskId provided, verify ownership and get files
    let initialFiles: any[] = [];
    if (taskId) {
      const task = await prisma.task.findFirst({
        where: { id: taskId, userId: user.id, status: 'completed' },
        select: { metadata: true },
      });
      if (task) {
        initialFiles = (task.metadata as any)?.files ?? [];
      }
    }

    const repo = await prisma.repo.create({
      data: {
        userId: user.id,
        name: name.trim(),
        description: description?.trim(),
        taskId: taskId ?? null,
        isPublic,
        files: initialFiles,
        versions: initialFiles.length > 0
          ? [{ version: 1, files: initialFiles, savedAt: new Date().toISOString(), message: 'Initial version' }]
          : [],
        currentVersion: 1,
      },
    });

    // Link task to repo if provided
    if (taskId) {
      await prisma.task.update({
        where: { id: taskId },
        data: { repoId: repo.id },
      }).catch(() => {}); // Non-fatal
    }

    return reply.code(201).send({ success: true, data: { repo } });
  });

  // PATCH /:id — update repo
  fastify.patch('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const parseResult = updateRepoSchema.safeParse(request.body);
    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      parseResult.error.errors.forEach(e => { errors[e.path.join('.')] = e.message; });
      return reply.code(400).send({ success: false, error: 'Validation failed', details: errors });
    }

    const existing = await prisma.repo.findFirst({ where: { id, userId: user.id } });
    if (!existing) {
      return reply.code(404).send({ success: false, error: 'Repo not found' });
    }

    const repo = await prisma.repo.update({
      where: { id },
      data: {
        ...(parseResult.data.name !== undefined ? { name: parseResult.data.name.trim() } : {}),
        ...(parseResult.data.description !== undefined ? { description: parseResult.data.description } : {}),
        ...(parseResult.data.isPublic !== undefined ? { isPublic: parseResult.data.isPublic } : {}),
        ...(parseResult.data.deployUrl !== undefined ? { deployUrl: parseResult.data.deployUrl } : {}),
      },
    });

    return reply.send({ success: true, data: { repo } });
  });

  // POST /:id/save — save new version from task files
  fastify.post('/:id/save', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const parseResult = saveVersionSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ success: false, error: 'Invalid request' });
    }

    const { message, taskId } = parseResult.data;

    const repo = await prisma.repo.findFirst({ where: { id, userId: user.id } });
    if (!repo) {
      return reply.code(404).send({ success: false, error: 'Repo not found' });
    }

    let newFiles = repo.files as any[];

    // If taskId provided, update files from task
    if (taskId) {
      const task = await prisma.task.findFirst({
        where: { id: taskId, userId: user.id, status: 'completed' },
        select: { metadata: true },
      });
      if (task) {
        newFiles = (task.metadata as any)?.files ?? newFiles;
      }
    }

    const newVersion = repo.currentVersion + 1;
    const newVersionEntry = {
      version: newVersion,
      files: newFiles,
      savedAt: new Date().toISOString(),
      message,
    };

    const versions = [...(repo.versions as any[]), newVersionEntry];

    const updatedRepo = await prisma.repo.update({
      where: { id },
      data: {
        files: newFiles,
        versions,
        currentVersion: newVersion,
      },
    });

    return reply.send({
      success: true,
      data: {
        repo: updatedRepo,
        version: newVersion,
        message: `Version ${newVersion} saved`,
      },
    });
  });

  // DELETE /:id — delete repo (soft delete via status, or hard delete)
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const repo = await prisma.repo.findFirst({ where: { id, userId: user.id } });
    if (!repo) {
      return reply.code(404).send({ success: false, error: 'Repo not found' });
    }

    await prisma.repo.delete({ where: { id } });

    return reply.send({ success: true, data: { message: 'Repo deleted' } });
  });
}
