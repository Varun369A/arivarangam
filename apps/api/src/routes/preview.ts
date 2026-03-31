// ─── Preview Route ────────────────────────────────────────────────────────────
// Layer 1: Serve generated HTML from task metadata as a real URL
// Layer 2: Permanent after completion — no blob URLs, no CSP issues

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@arivarangam/db';

export async function previewRoutes(fastify: FastifyInstance): Promise<void> {
  // GET /api/v1/preview/:taskId
  // Returns the generated index.html (or other renderable file) for a task
  fastify.get('/:taskId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { taskId } = request.params as { taskId: string };

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { metadata: true, status: true, isPublic: true, userId: true },
    });

    if (!task) {
      return reply.code(404).send('Task not found');
    }

    const metadata = task.metadata as any;
    const files: Array<{ path: string; content: string }> = metadata?.files ?? [];

    if (files.length === 0) {
      return reply
        .code(200)
        .header('Content-Type', 'text/html; charset=utf-8')
        .send(`<!DOCTYPE html><html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0a0a0f;color:#94a3b8">
          <p>⏳ Task is still running — preview will appear when complete.</p>
        </body></html>`);
    }

    // Find the best file to preview
    const html = findPreviewFile(files, task.metadata as any);

    return reply
      .code(200)
      .header('Content-Type', 'text/html; charset=utf-8')
      .header('X-Frame-Options', 'SAMEORIGIN')
      .header('Cache-Control', 'no-store')
      .send(html);
  });

  // GET /api/v1/preview/:taskId/file?path=...
  // Returns a specific file (for multi-file navigation)
  fastify.get('/:taskId/file', async (request: FastifyRequest, reply: FastifyReply) => {
    const { taskId } = request.params as { taskId: string };
    const { path: filePath } = request.query as { path?: string };

    if (!filePath) {
      return reply.code(400).send('Missing path query parameter');
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { metadata: true },
    });

    if (!task) return reply.code(404).send('Task not found');

    const files: Array<{ path: string; content: string }> = (task.metadata as any)?.files ?? [];
    const file = files.find(f => f.path === filePath);

    if (!file) return reply.code(404).send('File not found');

    const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
    const contentType = getContentType(ext);

    return reply
      .code(200)
      .header('Content-Type', contentType)
      .header('X-Frame-Options', 'SAMEORIGIN')
      .send(file.content);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findPreviewFile(files: Array<{ path: string; content: string }>, metadata: any): string {
  // Priority order for preview
  const priorities = [
    'index.html',
    'brand-preview.html',
    'preview.html',
  ];

  for (const priority of priorities) {
    const f = files.find(f => f.path === priority);
    if (f?.content) return inlineLocalAssets(f.content, files);
  }

  // Find any HTML file
  const anyHtml = files.find(f => f.path.endsWith('.html'));
  if (anyHtml?.content) return inlineLocalAssets(anyHtml.content, files);

  // Fallback: show file listing
  return buildFileListing(files);
}

function inlineLocalAssets(html: string, files: Array<{ path: string; content: string }>): string {
  const fileMap = new Map<string, string>();
  for (const f of files) {
    fileMap.set(f.path, f.content);
    fileMap.set(f.path.split('/').pop() ?? f.path, f.content);
  }

  // Inline local CSS
  html = html.replace(/<link([^>]+)rel=["']stylesheet["']([^>]*)>/gi, (tag) => {
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1] ?? '';
    if (href.startsWith('http') || href.startsWith('//')) return tag;
    const content = fileMap.get(href) ?? fileMap.get(href.split('/').pop() ?? '');
    return content ? `<style>${content}</style>` : tag;
  });

  // Inline local JS
  html = html.replace(/<script([^>]*)src=["']([^"']+)["']([^>]*)><\/script>/gi, (tag, _b, src) => {
    if (src.startsWith('http') || src.startsWith('//') || src.includes('node_modules')) return tag;
    const content = fileMap.get(src) ?? fileMap.get(src.split('/').pop() ?? '');
    return content ? `<script>\n${content}\n</script>` : tag;
  });

  return html;
}

function buildFileListing(files: Array<{ path: string; content: string }>): string {
  const items = files.map(f =>
    `<li style="padding:8px 0;border-bottom:1px solid #1e293b">
      <code style="color:#818cf8">${f.path}</code>
      <span style="color:#64748b;margin-left:12px;font-size:12px">${f.content.length} chars</span>
     </li>`
  ).join('');

  return `<!DOCTYPE html><html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Generated Files</title></head>
<body style="font-family:sans-serif;background:#0a0a0f;color:#e2e8f0;padding:2rem;max-width:800px;margin:0 auto">
  <h2 style="color:#818cf8">Generated Files</h2>
  <ul style="list-style:none;padding:0">${items}</ul>
</body></html>`;
}

function getContentType(ext: string): string {
  const map: Record<string, string> = {
    html: 'text/html; charset=utf-8',
    css:  'text/css; charset=utf-8',
    js:   'application/javascript; charset=utf-8',
    json: 'application/json; charset=utf-8',
    svg:  'image/svg+xml',
    md:   'text/plain; charset=utf-8',
    ts:   'text/plain; charset=utf-8',
    py:   'text/plain; charset=utf-8',
  };
  return map[ext] ?? 'text/plain; charset=utf-8';
}
