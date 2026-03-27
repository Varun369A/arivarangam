import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@arivarangam/db';
import { requireAuth } from '../middleware/auth';
import crypto from 'crypto';

// ─── Shared decrypt (same algo as envVars.ts) ─────────────────────────────────

function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-encryption-key-32-chars!!';
  return crypto.createHash('sha256').update(raw).digest();
}

function decryptEnvVar(encoded: string): string {
  try {
    const [ivHex, tagHex, ctHex] = encoded.split(':');
    if (!ivHex || !tagHex || !ctHex) throw new Error('Invalid format');
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const ct = Buffer.from(ctHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ct).toString('utf8') + decipher.final('utf8');
  } catch {
    return '';
  }
}

async function getUserToken(userId: string, key: string, fallback?: string): Promise<string | null> {
  const envVar = await prisma.userEnvVar.findFirst({ where: { userId, key } });
  if (envVar?.value) {
    const decrypted = decryptEnvVar(envVar.value);
    if (decrypted) return decrypted;
  }
  return fallback ?? null;
}

// ─── Framework detection ──────────────────────────────────────────────────────

function detectFramework(files: { path: string }[]): string | null {
  const paths = files.map(f => f.path);
  if (paths.some(p => p.includes('next.config'))) return 'nextjs';
  if (paths.some(p => p === 'vite.config.js' || p === 'vite.config.ts')) return 'vite';
  if (paths.some(p => p.includes('angular.json'))) return 'angular';
  if (paths.some(p => p.includes('nuxt.config'))) return 'nuxtjs';
  if (paths.some(p => p.includes('svelte.config'))) return 'svelte';
  return null;
}

// ─── Get task files helper ────────────────────────────────────────────────────

async function getTaskFiles(taskId: string, userId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { id: true, prompt: true, metadata: true, status: true, category: true },
  });
  return task;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const deployVercelSchema = z.object({ taskId: z.string() });
const deployGitHubSchema = z.object({
  taskId: z.string(),
  repoName: z.string().min(1).max(100).optional(),
  isPrivate: z.boolean().optional().default(false),
});
const deployRailwaySchema = z.object({ taskId: z.string() });
const deployCloudflareSchema = z.object({ taskId: z.string(), workerName: z.string().min(1).max(50).optional() });

// ─── Route Plugin ─────────────────────────────────────────────────────────────

export async function deployRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', requireAuth);

  // ─── POST /vercel — deploy static/Next.js/React app to Vercel ─────────────

  fastify.post('/vercel', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const parse = deployVercelSchema.safeParse(request.body);
    if (!parse.success) return reply.code(400).send({ success: false, error: 'taskId is required' });
    const { taskId } = parse.data;

    const token = await getUserToken(user.id, 'VERCEL_TOKEN', process.env.VERCEL_TOKEN);
    if (!token) {
      return reply.code(400).send({
        success: false,
        error: 'Vercel token not found. Add VERCEL_TOKEN in Settings → API Keys.',
        code: 'NO_VERCEL_TOKEN',
      });
    }

    const task = await getTaskFiles(taskId, user.id);
    if (!task) return reply.code(404).send({ success: false, error: 'Task not found' });
    if (task.status !== 'completed') return reply.code(400).send({ success: false, error: 'Task must be completed first' });

    const files: { path: string; content: string }[] = (task.metadata as any)?.files ?? [];
    if (!files.length) return reply.code(400).send({ success: false, error: 'No files to deploy' });

    const projectName = task.prompt.split('\n')[0]
      .slice(0, 40).replace(/[^a-z0-9]/gi, '-').toLowerCase()
      .replace(/-+/g, '-').replace(/^-|-$/g, '') || `app-${Date.now()}`;

    try {
      const deployPayload = {
        name: projectName,
        files: files.map(f => ({ file: f.path, data: f.content, encoding: 'utf8' })),
        projectSettings: { framework: detectFramework(files) },
        target: 'production',
      };

      const res = await fetch('https://api.vercel.com/v13/deployments', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(deployPayload),
      });

      const data = await res.json() as any;
      if (!res.ok) {
        return reply.code(400).send({ success: false, error: data?.error?.message ?? 'Vercel deployment failed' });
      }

      const deployUrl = `https://${data.url}`;
      await prisma.task.update({ where: { id: taskId }, data: { previewUrl: deployUrl, deployUrl } });

      return reply.send({ success: true, data: { deployUrl, deploymentId: data.id, status: data.readyState ?? 'BUILDING' } });
    } catch (err: any) {
      return reply.code(500).send({ success: false, error: err.message ?? 'Deployment failed' });
    }
  });

  // ─── POST /github — push to GitHub ────────────────────────────────────────

  fastify.post('/github', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const parse = deployGitHubSchema.safeParse(request.body);
    if (!parse.success) return reply.code(400).send({ success: false, error: 'taskId is required' });
    const { taskId, repoName: reqRepoName, isPrivate } = parse.data;

    const token = await getUserToken(user.id, 'GITHUB_TOKEN', process.env.GITHUB_TOKEN);
    if (!token) {
      return reply.code(400).send({
        success: false,
        error: 'GitHub token not found. Add GITHUB_TOKEN in Settings → API Keys.',
        code: 'NO_GITHUB_TOKEN',
      });
    }

    const task = await getTaskFiles(taskId, user.id);
    if (!task) return reply.code(404).send({ success: false, error: 'Task not found' });
    if (task.status !== 'completed') return reply.code(400).send({ success: false, error: 'Task must be completed first' });

    const files: { path: string; content: string }[] = (task.metadata as any)?.files ?? [];
    if (!files.length) return reply.code(400).send({ success: false, error: 'No files to push' });

    const safeRepoName = (reqRepoName ?? task.prompt.split('\n')[0].slice(0, 40))
      .replace(/[^a-z0-9-_]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase()
      || `app-${Date.now()}`;

    try {
      // Get GitHub username
      const meRes = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
      });
      if (!meRes.ok) return reply.code(401).send({ success: false, error: 'Invalid GitHub token' });
      const me = await meRes.json() as any;
      const owner = me.login;

      // Create repo
      const createRes = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/vnd.github.v3+json' },
        body: JSON.stringify({ name: safeRepoName, private: isPrivate, auto_init: false, description: task.prompt.slice(0, 100) }),
      });
      const repo = await createRes.json() as any;
      if (!createRes.ok) {
        return reply.code(400).send({ success: false, error: repo.message ?? 'Failed to create GitHub repo' });
      }

      // Push files sequentially via Contents API (needs base64)
      let pushed = 0;
      for (const file of files.slice(0, 50)) { // max 50 files
        try {
          await fetch(`https://api.github.com/repos/${owner}/${repo.name}/contents/${encodeURIComponent(file.path)}`, {
            method: 'PUT',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `Add ${file.path}`,
              content: Buffer.from(file.content ?? '').toString('base64'),
            }),
          });
          pushed++;
        } catch {
          // Skip individual file errors — push as many as possible
        }
      }

      const repoUrl = repo.html_url;
      await prisma.task.update({ where: { id: taskId }, data: { deployUrl: repoUrl } });

      return reply.send({ success: true, data: { repoUrl, cloneUrl: repo.clone_url, owner, repoName: repo.name, filesPushed: pushed } });
    } catch (err: any) {
      return reply.code(500).send({ success: false, error: err.message ?? 'GitHub push failed' });
    }
  });

  // ─── POST /railway — create Railway project for backend deploy ─────────────

  fastify.post('/railway', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const parse = deployRailwaySchema.safeParse(request.body);
    if (!parse.success) return reply.code(400).send({ success: false, error: 'taskId is required' });
    const { taskId } = parse.data;

    const token = await getUserToken(user.id, 'RAILWAY_TOKEN', process.env.RAILWAY_TOKEN);
    if (!token) {
      return reply.code(400).send({
        success: false,
        error: 'Railway token not found. Add RAILWAY_TOKEN in Settings → API Keys.',
        code: 'NO_RAILWAY_TOKEN',
      });
    }

    const task = await getTaskFiles(taskId, user.id);
    if (!task) return reply.code(404).send({ success: false, error: 'Task not found' });
    if (task.status !== 'completed') return reply.code(400).send({ success: false, error: 'Task must be completed first' });

    const projectName = task.prompt.split('\n')[0].slice(0, 40)
      .replace(/[^a-z0-9-]/gi, '-').toLowerCase().replace(/-+/g, '-') || 'api-project';

    try {
      const res = await fetch('https://backboard.railway.app/graphql/v2', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `mutation { projectCreate(input: { name: "${projectName}" }) { id name } }`,
        }),
      });

      const data = await res.json() as any;
      if (data.errors?.length) {
        return reply.code(400).send({ success: false, error: data.errors[0]?.message ?? 'Railway failed' });
      }

      const projectId = data.data?.projectCreate?.id;
      const railwayUrl = `https://railway.app/project/${projectId}`;
      await prisma.task.update({ where: { id: taskId }, data: { deployUrl: railwayUrl } });

      return reply.send({ success: true, data: { projectId, railwayUrl, message: 'Railway project created. Connect your GitHub repo to complete deployment.' } });
    } catch (err: any) {
      return reply.code(500).send({ success: false, error: err.message ?? 'Railway failed' });
    }
  });

  // ─── POST /cloudflare — deploy agent/worker to Cloudflare ─────────────────

  fastify.post('/cloudflare', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const parse = deployCloudflareSchema.safeParse(request.body);
    if (!parse.success) return reply.code(400).send({ success: false, error: 'taskId is required' });
    const { taskId, workerName: reqWorkerName } = parse.data;

    const token = await getUserToken(user.id, 'CLOUDFLARE_API_TOKEN', process.env.CLOUDFLARE_API_TOKEN);
    const accountId = await getUserToken(user.id, 'CLOUDFLARE_ACCOUNT_ID', process.env.CLOUDFLARE_ACCOUNT_ID);
    if (!token || !accountId) {
      return reply.code(400).send({
        success: false,
        error: 'Cloudflare token not found. Add CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in Settings → API Keys.',
        code: 'NO_CLOUDFLARE_TOKEN',
      });
    }

    const task = await getTaskFiles(taskId, user.id);
    if (!task) return reply.code(404).send({ success: false, error: 'Task not found' });
    if (task.status !== 'completed') return reply.code(400).send({ success: false, error: 'Task must be completed first' });

    const files: { path: string; content: string }[] = (task.metadata as any)?.files ?? [];
    const workerFile = files.find(f => f.path.endsWith('worker.js') || f.path.endsWith('index.js') || f.path === 'src/index.ts');
    if (!workerFile) return reply.code(400).send({ success: false, error: 'No worker entry file found (worker.js or index.js)' });

    const workerName = (reqWorkerName ?? task.prompt.split('\n')[0].slice(0, 30))
      .replace(/[^a-z0-9-]/gi, '-').toLowerCase().replace(/-+/g, '-') || `worker-${Date.now()}`;

    try {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/javascript' },
        body: workerFile.content,
      });

      const data = await res.json() as any;
      if (!data.success) {
        return reply.code(400).send({ success: false, error: data.errors?.[0]?.message ?? 'Cloudflare deploy failed' });
      }

      const workerUrl = `https://${workerName}.workers.dev`;
      await prisma.task.update({ where: { id: taskId }, data: { deployUrl: workerUrl, previewUrl: workerUrl } });

      return reply.send({ success: true, data: { workerUrl, workerName, message: `Worker deployed at ${workerUrl}` } });
    } catch (err: any) {
      return reply.code(500).send({ success: false, error: err.message ?? 'Cloudflare deploy failed' });
    }
  });

  // ─── POST /supabase — provision Supabase project ──────────────────────────

  fastify.post('/supabase', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { taskId, orgId } = request.body as any;

    const token = await getUserToken(user.id, 'SUPABASE_ACCESS_TOKEN', process.env.SUPABASE_ACCESS_TOKEN);
    if (!token) {
      return reply.code(400).send({
        success: false,
        error: 'Supabase access token not found. Add SUPABASE_ACCESS_TOKEN in Settings → API Keys.',
        code: 'NO_SUPABASE_TOKEN',
      });
    }

    const task = await getTaskFiles(taskId, user.id);
    if (!task) return reply.code(404).send({ success: false, error: 'Task not found' });

    const projectName = task.prompt.split('\n')[0].slice(0, 30)
      .replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'my-project';

    try {
      // List orgs to get orgId if not provided
      let resolvedOrgId = orgId;
      if (!resolvedOrgId) {
        const orgsRes = await fetch('https://api.supabase.com/v1/organizations', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const orgs = await orgsRes.json() as any[];
        if (!orgs?.length) return reply.code(400).send({ success: false, error: 'No Supabase organizations found' });
        resolvedOrgId = orgs[0].id;
      }

      // Create project
      const createRes = await fetch('https://api.supabase.com/v1/projects', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: projectName,
          organization_id: resolvedOrgId,
          plan: 'free',
          region: 'ap-south-1', // India region
          db_pass: crypto.randomBytes(16).toString('hex'),
        }),
      });

      const project = await createRes.json() as any;
      if (!createRes.ok) {
        return reply.code(400).send({ success: false, error: project.message ?? 'Supabase project creation failed' });
      }

      return reply.send({
        success: true,
        data: {
          projectId: project.id,
          projectUrl: `https://${project.id}.supabase.co`,
          projectName: project.name,
          region: project.region,
          message: 'Supabase project provisioned. Check your Supabase dashboard for connection strings.',
        },
      });
    } catch (err: any) {
      return reply.code(500).send({ success: false, error: err.message ?? 'Supabase provisioning failed' });
    }
  });

  // ─── GET /status/:taskId — check deploy URL for a task ────────────────────

  fastify.get('/status/:taskId', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { taskId } = request.params as { taskId: string };

    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: user.id },
      select: { id: true, deployUrl: true, previewUrl: true, status: true },
    });

    if (!task) return reply.code(404).send({ success: false, error: 'Task not found' });

    return reply.send({ success: true, data: { deployUrl: task.deployUrl, previewUrl: task.previewUrl, status: task.status } });
  });
}
