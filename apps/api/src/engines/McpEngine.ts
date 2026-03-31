import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeSonnet, callClaudeHaiku } from '../connectors/claude';
import { taskService } from '../services/TaskService';
import { UsageMeter } from '../services/UsageMeter';

// ─── McpEngine ────────────────────────────────────────────────────────────────
//
// Generates complete, production-ready TypeScript MCP (Model Context Protocol)
// servers using @modelcontextprotocol/sdk v1.0+.
//
// Output files:
//   src/index.ts         — Server instantiation, transport, error handling
//   src/tools/index.ts   — All tool implementations with Zod validation
//   src/types.ts         — TypeScript interfaces for data structures
//   package.json         — Dependencies and scripts
//   tsconfig.json        — ES2022/NodeNext/strict config
//   .env.example         — All required environment variables
//   Dockerfile           — Multi-stage node:20-alpine build
//   README.md            — Installation, tool docs, Claude Desktop config

interface FileEntry {
  path: string;
  content: string;
}

interface McpPlan {
  serverName: string;
  tools: {
    name: string;
    description: string;
    inputSchema: object;
  }[];
  resources: {
    uri: string;
    description: string;
  }[];
  transport: 'stdio' | 'http';
  hasAuth: boolean;
}

// ─── MCP server generation system prompt ─────────────────────────────────────

const MCP_SYSTEM_PROMPT = `You are an expert MCP server developer. Generate production-ready TypeScript MCP servers using @modelcontextprotocol/sdk v1.0+.

MCP PATTERNS:
- Server: new Server({ name, version }, { capabilities: { tools: {}, resources: {} } })
- Tool registration: server.setRequestHandler(ListToolsRequestSchema, ...) and CallToolRequestSchema
- Input validation: always use Zod schemas, convert to JSON Schema for tool definitions
- Error handling: throw new McpError(ErrorCode.InternalError, message) for tool failures
- Transport: StdioServerTransport for CLI tools, StreamableHTTPServerTransport for API tools
- Resources: use server.setRequestHandler(ListResourcesRequestSchema, ...) for static/dynamic resources
- Always: async/await throughout, proper TypeScript types, no any types
- Tools must ACTUALLY work — no stub implementations

Output: raw TypeScript only, no fences.`;

// ─── McpEngine ────────────────────────────────────────────────────────────────

export class McpEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (event: TaskEvent) => { await onEvent(event); };
    const meter = new UsageMeter();

    await prisma.task.update({
      where: { id: task.id },
      data: { status: 'running' },
    });

    try {
      // Step 1: Plan MCP server structure
      await emit({
        type: 'log',
        data: { message: 'Analyzing requirements and planning MCP server structure...' },
        timestamp: new Date().toISOString(),
      });

      const plan = await this.planMcp(task.prompt, meter);

      await emit({
        type: 'log',
        data: {
          message: `MCP plan ready: server="${plan.serverName}", ${plan.tools.length} tools, ${plan.resources.length} resources, transport=${plan.transport}`,
        },
        timestamp: new Date().toISOString(),
      });

      // Step 2: Determine all files to generate
      const fileMetas = this.buildFileList(plan);

      await emit({
        type: 'log',
        data: { message: `Generating ${fileMetas.length} files for MCP server "${plan.serverName}"...` },
        timestamp: new Date().toISOString(),
      });

      const generatedFiles: FileEntry[] = [];

      for (let i = 0; i < fileMetas.length; i++) {
        const fileMeta = fileMetas[i];

        await emit({
          type: 'log',
          data: { message: `Building ${fileMeta.path} (${i + 1}/${fileMetas.length})...` },
          timestamp: new Date().toISOString(),
        });

        const content = await this.generateFile(task.prompt, fileMeta, generatedFiles, plan, meter);
        generatedFiles.push({ path: fileMeta.path, content });

        await emit({
          type: 'file_created',
          data: {
            path: fileMeta.path,
            content,
            language: fileMeta.language,
            index: i + 1,
            total: fileMetas.length,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Step 3: Consistency review pass
      await emit({
        type: 'log',
        data: { message: 'Running consistency and correctness review...' },
        timestamp: new Date().toISOString(),
      });

      const fixedFiles = await this.reviewPass(task.prompt, generatedFiles, plan, meter);

      for (const fixed of fixedFiles) {
        const original = generatedFiles.find(f => f.path === fixed.path);
        if (original && original.content !== fixed.content) {
          await emit({
            type: 'file_updated',
            data: { path: fixed.path, content: fixed.content, reason: 'Consistency fix applied' },
            timestamp: new Date().toISOString(),
          });
        }
      }

      const creditsUsed = meter.toCredits();
      const metadata = {
        files: fixedFiles,
        serverName: plan.serverName,
        tools: plan.tools.map(t => t.name),
        resources: plan.resources.map(r => r.uri),
        transport: plan.transport,
        hasAuth: plan.hasAuth,
        fileCount: fixedFiles.length,
        usage: meter.summary(),
      };

      await taskService.completeTask(task.id, creditsUsed, metadata);

      await emit({
        type: 'completed',
        data: {
          files: fixedFiles,
          creditsUsed,
          fileCount: fixedFiles.length,
          message: `MCP server "${plan.serverName}" generated — ${fixedFiles.length} files, ${plan.tools.length} tools, ${plan.transport} transport`,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({
        type: 'error',
        data: { message: err.message ?? 'MCP server generation failed' },
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  }

  // ─── Plan MCP Server ──────────────────────────────────────────────────────────

  private async planMcp(prompt: string, meter: UsageMeter): Promise<McpPlan> {
    const systemPrompt = `You are an expert MCP server architect. Analyze the user's request and return ONLY a valid JSON object describing the MCP server to generate.

Return ONLY this JSON structure (no markdown, no prose):
{
  "serverName": "my-mcp-server",
  "tools": [
    {
      "name": "tool_name",
      "description": "What this tool does",
      "inputSchema": {
        "type": "object",
        "properties": {
          "param": { "type": "string", "description": "..." }
        },
        "required": ["param"]
      }
    }
  ],
  "resources": [
    {
      "uri": "resource://type/identifier",
      "description": "What this resource provides"
    }
  ],
  "transport": "stdio",
  "hasAuth": false
}

Rules:
- serverName: kebab-case, descriptive (e.g. "github-mcp-server", "postgres-mcp-server")
- tools: 2-8 tools that actually make sense for the request — real functionality, not stubs
- resources: 0-3 resources (omit if not natural for the domain)
- transport: "stdio" for CLI/Claude Desktop usage, "http" for standalone API service
- hasAuth: true if the server needs API keys, OAuth tokens, or other authentication
- inputSchema: valid JSON Schema describing each tool's parameters`;

    try {
      const response = await callClaudeHaiku(prompt, systemPrompt, 512, meter);
      const plan = this.parseJSON<McpPlan>(response, this.defaultPlan(prompt));
      // Validate required fields
      if (!plan.serverName || !Array.isArray(plan.tools)) {
        return this.defaultPlan(prompt);
      }
      return plan;
    } catch {
      return this.defaultPlan(prompt);
    }
  }

  // ─── Default Plan Fallback ────────────────────────────────────────────────────

  private defaultPlan(prompt: string): McpPlan {
    const words = prompt.toLowerCase().split(/\s+/).slice(0, 3).join('-').replace(/[^a-z0-9-]/g, '');
    return {
      serverName: `${words || 'custom'}-mcp-server`,
      tools: [
        {
          name: 'execute',
          description: 'Execute the primary action',
          inputSchema: {
            type: 'object',
            properties: {
              input: { type: 'string', description: 'Input data' },
            },
            required: ['input'],
          },
        },
        {
          name: 'list',
          description: 'List available items',
          inputSchema: {
            type: 'object',
            properties: {
              filter: { type: 'string', description: 'Optional filter string' },
            },
          },
        },
      ],
      resources: [],
      transport: 'stdio',
      hasAuth: false,
    };
  }

  // ─── Build File List ──────────────────────────────────────────────────────────

  private buildFileList(plan: McpPlan): { path: string; description: string; language: string }[] {
    return [
      {
        path: 'src/index.ts',
        description: `Main MCP server entry: Server instantiation with name="${plan.serverName}", tool/resource registration, ${plan.transport} transport setup, error handling, graceful shutdown`,
        language: 'typescript',
      },
      {
        path: 'src/tools/index.ts',
        description: `All ${plan.tools.length} tool implementations (${plan.tools.map(t => t.name).join(', ')}) with Zod schemas, real logic, McpError error handling`,
        language: 'typescript',
      },
      {
        path: 'src/types.ts',
        description: 'TypeScript interfaces for all data structures used in tools and resources',
        language: 'typescript',
      },
      {
        path: 'package.json',
        description: `package.json with name="${plan.serverName}", type=module, @modelcontextprotocol/sdk ^1.0.0, zod ^3.22.0, dotenv ^16.0.0, build/start/dev scripts`,
        language: 'json',
      },
      {
        path: 'tsconfig.json',
        description: 'TypeScript config: ES2022 target, NodeNext module, strict mode, outDir dist',
        language: 'json',
      },
      {
        path: '.env.example',
        description: plan.hasAuth
          ? 'All required environment variables with descriptions (API keys, auth tokens, config)'
          : 'Environment variables template (port, log level, optional config)',
        language: 'text',
      },
      {
        path: 'Dockerfile',
        description: 'Multi-stage Docker build: node:20-alpine builder + node:20-alpine runner, COPY dist, ENV NODE_ENV=production, CMD',
        language: 'dockerfile',
      },
      {
        path: 'README.md',
        description: `Full documentation: installation, configuration, tool reference for ${plan.tools.map(t => t.name).join('/')} with example calls, Claude Desktop config snippet`,
        language: 'markdown',
      },
    ];
  }

  // ─── Generate Single File ─────────────────────────────────────────────────────

  private async generateFile(
    userPrompt: string,
    fileMeta: { path: string; description: string; language: string },
    existingFiles: FileEntry[],
    plan: McpPlan,
    meter: UsageMeter
  ): Promise<string> {
    const contextSummary = existingFiles.length > 0
      ? `\n\nAlready generated files:\n${existingFiles.map(f =>
          `--- ${f.path} ---\n${f.content.slice(0, 700)}${f.content.length > 700 ? '\n...(truncated)' : ''}`
        ).join('\n\n')}`
      : '';

    const toolsContext = `
MCP SERVER SPECIFICATION:
- Server name: ${plan.serverName}
- Transport: ${plan.transport}
- Has auth: ${plan.hasAuth}
- Tools (${plan.tools.length}):
${plan.tools.map(t => `  • ${t.name}: ${t.description}\n    Input: ${JSON.stringify(t.inputSchema)}`).join('\n')}
${plan.resources.length > 0 ? `- Resources (${plan.resources.length}):\n${plan.resources.map(r => `  • ${r.uri}: ${r.description}`).join('\n')}` : '- Resources: none'}`;

    const fileSpecificInstructions = this.getFileInstructions(fileMeta.path, plan);

    const systemPrompt = `${MCP_SYSTEM_PROMPT}

${toolsContext}

FILE-SPECIFIC REQUIREMENTS:
${fileSpecificInstructions}

QUALITY STANDARDS:
- No any types — use proper TypeScript throughout
- All tools must have complete, working implementations (not stubs)
- Zod schemas must match the inputSchema from the spec exactly
- Error handling: catch specific errors, wrap in McpError with descriptive messages
- Logging to stderr (never stdout for stdio transport — stdout is reserved for MCP protocol)
- Graceful shutdown: handle SIGINT/SIGTERM
- No console.log — use process.stderr.write or a logger that writes to stderr

Output raw file content only — no markdown fences, no explanations.`;

    const filePrompt = `User request: ${userPrompt}
${contextSummary}

Generate the complete content for: ${fileMeta.path}
Role: ${fileMeta.description}`;

    const content = await callClaudeSonnet(filePrompt, systemPrompt, 8192, undefined, meter);
    return this.stripFences(content);
  }

  // ─── File-Specific Instructions ───────────────────────────────────────────────

  private getFileInstructions(path: string, plan: McpPlan): string {
    if (path === 'src/index.ts') {
      return `
- Import Server from @modelcontextprotocol/sdk/server/index.js
- Import ${plan.transport === 'stdio' ? 'StdioServerTransport from @modelcontextprotocol/sdk/server/stdio.js' : 'StreamableHTTPServerTransport from @modelcontextprotocol/sdk/server/streamableHttp.js'}
- Import ListToolsRequestSchema, CallToolRequestSchema from @modelcontextprotocol/sdk/types.js
- Import all tool handlers from ./tools/index.js
- Create: const server = new Server({ name: "${plan.serverName}", version: "1.0.0" }, { capabilities: { tools: {}, resources: {} } })
- Register ListToolsRequestSchema handler returning all tool definitions with JSON Schema
- Register CallToolRequestSchema handler dispatching to tool implementations
${plan.resources.length > 0 ? '- Register ListResourcesRequestSchema and ReadResourceRequestSchema handlers' : ''}
- ${plan.transport === 'stdio' ? 'Use StdioServerTransport: const transport = new StdioServerTransport(); await server.connect(transport);' : 'Use HTTP: create express/http server, mount StreamableHTTPServerTransport, handle POST /mcp'}
- Handle process SIGINT/SIGTERM for graceful shutdown
- All errors logged to stderr`;
    }

    if (path === 'src/tools/index.ts') {
      return `
- Import McpError, ErrorCode from @modelcontextprotocol/sdk/types.js
- Import { z } from "zod"
- Import types from ../types.js
- For each tool (${plan.tools.map(t => t.name).join(', ')}):
  • Define a Zod schema matching the tool's inputSchema exactly
  • Export a handler function: async (args: unknown) => { ... }
  • Parse args with schema.parse(args) — let Zod throw on invalid input
  • Implement REAL logic — no TODOs, no stubs
  • Wrap errors: throw new McpError(ErrorCode.InternalError, err.message)
  • Return: { content: [{ type: "text", text: JSON.stringify(result) }] }
- Export a toolHandlers map: Record<string, (args: unknown) => Promise<CallToolResult>>
- Log operations to stderr only`;
    }

    if (path === 'src/types.ts') {
      return `
- Define TypeScript interfaces for all data structures used in tools and resources
- Include input types (matching Zod schemas) and output/result types
- Export all interfaces — they will be imported by tools/index.ts and index.ts
- Use strict types — no any, no unknown unless unavoidable
- Add JSDoc comments on each interface`;
    }

    if (path === 'package.json') {
      return `
- name: "${plan.serverName}"
- version: "1.0.0"
- type: "module"
- main: "dist/index.js"
- dependencies: { "@modelcontextprotocol/sdk": "^1.0.0", "zod": "^3.22.0", "dotenv": "^16.0.0"${plan.transport === 'http' ? ', "express": "^4.18.0"' : ''}${plan.hasAuth ? ', "jsonwebtoken": "^9.0.0"' : ''} }
- devDependencies: { "typescript": "^5.4.0", "@types/node": "^20.0.0", "tsx": "^4.0.0" }
- scripts: { "build": "tsc", "start": "node dist/index.js", "dev": "tsx watch src/index.ts" }
- NO comments in JSON`;
    }

    if (path === 'tsconfig.json') {
      return `
- target: "ES2022"
- module: "NodeNext"
- moduleResolution: "NodeNext"
- strict: true
- outDir: "dist"
- rootDir: "src"
- declaration: true
- esModuleInterop: true
- skipLibCheck: true
- NO comments in JSON`;
    }

    if (path === '.env.example') {
      return plan.hasAuth
        ? '- Include all API keys, auth tokens, secrets with descriptive comments\n- Include optional config: LOG_LEVEL, PORT (if HTTP transport)\n- Each var on its own line: VAR_NAME=example_value_or_description'
        : '- Include optional config: LOG_LEVEL=info\n- Include PORT if HTTP transport\n- Each var on its own line with comment above';
    }

    if (path === 'Dockerfile') {
      return `
- Stage 1 (builder): FROM node:20-alpine AS builder, WORKDIR /app, COPY package.json tsconfig.json, RUN npm install, COPY src/ ./src/, RUN npm run build
- Stage 2 (runner): FROM node:20-alpine AS runner, WORKDIR /app, COPY --from=builder /app/dist ./dist, COPY package.json, RUN npm install --production, ENV NODE_ENV=production, ${plan.transport === 'http' ? 'EXPOSE 3000, ' : ''}CMD ["node", "dist/index.js"]`;
    }

    if (path === 'README.md') {
      return `
- H1: ${plan.serverName}
- Brief description of what the server does
- ## Installation: npm install, npm run build
- ## Configuration: .env.example walkthrough
- ## Tools: table with columns Tool | Description | Parameters | Example
- ## Usage: ${plan.transport === 'stdio' ? 'Claude Desktop config JSON snippet (mcpServers section)' : 'HTTP endpoint examples with curl'}
- ## Docker: docker build and run commands
- ## Development: npm run dev`;
    }

    return '- Generate complete, production-ready content for this file.';
  }

  // ─── Review Pass ──────────────────────────────────────────────────────────────

  private async reviewPass(
    userPrompt: string,
    files: FileEntry[],
    plan: McpPlan,
    meter: UsageMeter
  ): Promise<FileEntry[]> {
    if (files.length === 0) return files;

    const summary = files
      .map(f => `=== ${f.path} ===\n${f.content}`)
      .join('\n\n');

    const systemPrompt = `You are an expert MCP server code reviewer. Review all files for correctness and consistency.

CHECK AND FIX:
- src/index.ts imports match what's exported from src/tools/index.ts
- Tool names in ListToolsRequestSchema handler match the tool handler keys in toolHandlers map
- Zod schemas in src/tools/index.ts match the inputSchema defined in src/index.ts tool definitions
- All imports use .js extensions (required for NodeNext ESM)
- package.json has ALL packages that are imported across all .ts files
- tsconfig.json is valid JSON (no comments)
- package.json is valid JSON (no comments)
- .env.example has all env vars referenced via process.env in the TypeScript files
- No stub implementations — all tool handlers have real logic
- Dockerfile references correct dist/index.js path
- README Claude Desktop config snippet uses correct server name: "${plan.serverName}"

Return ONLY a valid JSON array: [{"path": "...", "content": "...", "fixed": true/false}]
Return ALL files even if unchanged.`;

    try {
      const response = await callClaudeSonnet(
        `Original request: ${userPrompt.slice(0, 200)}\n\nReview these MCP server files:\n\n${summary.slice(0, 14000)}`,
        systemPrompt,
        8192,
        undefined,
        meter
      );
      const parsed = this.parseJSON<FileEntry[]>(response, []);
      if (!Array.isArray(parsed) || parsed.length === 0) return files;
      const valid = parsed.every(f => typeof f.path === 'string' && typeof f.content === 'string');
      return valid ? parsed.map(f => ({ path: f.path, content: f.content })) : files;
    } catch {
      return files;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private stripFences(content: string): string {
    return content
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/^```$/gm, '')
      .trim();
  }

  private parseJSON<T>(text: string, fallback: T): T {
    const isArray = Array.isArray(fallback);
    const open = isArray ? '[' : '{';
    const close = isArray ? ']' : '}';

    const cleaned = text
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/^```$/gm, '')
      .trim();

    // 1. Direct parse
    try { return JSON.parse(cleaned) as T; } catch { /* continue */ }

    // 2. Extract balanced block
    const start = cleaned.indexOf(open);
    if (start === -1) return fallback;

    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\' && inStr) { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === open) depth++;
      else if (ch === close && --depth === 0) {
        try { return JSON.parse(cleaned.slice(start, i + 1)) as T; } catch { return fallback; }
      }
    }

    return fallback;
  }
}
