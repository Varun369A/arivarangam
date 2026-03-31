import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeSonnet, callClaudeHaiku } from '../connectors/claude';
import { taskService } from '../services/TaskService';
import { UsageMeter } from '../services/UsageMeter';

// ─── WorkflowEngine ───────────────────────────────────────────────────────────
//
// Generates complete automation workflows:
//  - n8n workflows (importable JSON with all nodes configured)
//  - Make.com / Zapier equivalent designs (as structured JSON + docs)
//  - Shell/Python automation scripts
//  - GitHub Actions CI/CD pipelines
//  - Complete with: trigger setup, error handling, credential templates, docs

interface FileEntry { path: string; content: string; }

type WorkflowPlatform = 'n8n' | 'make' | 'python' | 'github-actions' | 'shell';

export class WorkflowEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (event: TaskEvent) => { await onEvent(event); };
    const meter = new UsageMeter();

    await prisma.task.update({ where: { id: task.id }, data: { status: 'running' } });

    try {
      await emit({ type: 'log', data: { message: '⚙️ Analyzing automation requirements...' }, timestamp: new Date().toISOString() });

      const plan = await this.planWorkflow(task.prompt, meter);

      await emit({ type: 'log', data: { message: `🔗 Platform: ${plan.platform} | ${plan.nodeCount} nodes | ${plan.files.length} files` }, timestamp: new Date().toISOString() });

      const generatedFiles: FileEntry[] = [];

      for (let i = 0; i < plan.files.length; i++) {
        const fileMeta = plan.files[i];
        await emit({ type: 'log', data: { message: `🔧 Building ${fileMeta.path} (${i + 1}/${plan.files.length})...` }, timestamp: new Date().toISOString() });

        const content = await this.generateFile(task.prompt, fileMeta, plan, meter);
        generatedFiles.push({ path: fileMeta.path, content });

        await emit({
          type: 'file_created',
          data: { path: fileMeta.path, content, language: fileMeta.language, index: i + 1, total: plan.files.length },
          timestamp: new Date().toISOString(),
        });
      }

      const creditsUsed = meter.toCredits();
      await taskService.completeTask(task.id, creditsUsed, {
        files: generatedFiles, platform: plan.platform, nodeCount: plan.nodeCount, usage: meter.summary(),
      });

      await emit({
        type: 'completed',
        data: { files: generatedFiles, creditsUsed, message: `✅ ${plan.platform} workflow ready — ${plan.nodeCount} nodes` },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({ type: 'error', data: { message: err.message ?? 'WorkflowEngine failed' }, timestamp: new Date().toISOString() });
      throw err;
    }
  }

  // ─── Plan Workflow ────────────────────────────────────────────────────────────

  private async planWorkflow(prompt: string, meter: UsageMeter): Promise<{
    platform: WorkflowPlatform;
    nodeCount: number;
    triggers: string[];
    files: { path: string; description: string; language: string }[];
  }> {
    const systemPrompt = `You are an automation architect. Analyze the request and return ONLY valid JSON:
{
  "platform": "n8n",
  "nodeCount": 8,
  "triggers": ["Webhook", "Schedule: daily 9am"],
  "files": [
    {"path": "workflow.json", "description": "Complete n8n workflow", "language": "json"},
    {"path": "setup.md", "description": "Import and config guide", "language": "markdown"},
    {"path": "credentials-template.json", "description": "Credential structure", "language": "json"},
    {"path": "README.md", "description": "Full documentation", "language": "markdown"}
  ]
}

Platform selection:
- n8n: automation with webhooks, APIs, databases, AI nodes
- make: visual automation (return as documented JSON scenario)
- python: complex automation requiring code logic
- github-actions: CI/CD, deployment, testing workflows
- shell: simple cron/bash automation`;

    try {
      const response = await callClaudeHaiku(prompt, systemPrompt, 1024, meter);
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1) return JSON.parse(cleaned.slice(start, end + 1));
    } catch { /* fallback */ }

    return {
      platform: 'n8n',
      nodeCount: 8,
      triggers: ['Webhook'],
      files: [
        { path: 'workflow.json', description: 'n8n workflow', language: 'json' },
        { path: 'setup.md', description: 'Setup guide', language: 'markdown' },
        { path: 'credentials-template.json', description: 'Credentials', language: 'json' },
        { path: 'README.md', description: 'Documentation', language: 'markdown' },
      ],
    };
  }

  // ─── Generate File ────────────────────────────────────────────────────────────

  private async generateFile(
    userPrompt: string,
    fileMeta: { path: string; description: string; language: string },
    plan: { platform: WorkflowPlatform; nodeCount: number; triggers: string[] },
    meter: UsageMeter
  ): Promise<string> {
    const platformInstructions: Record<WorkflowPlatform, string> = {
      n8n: `Generate a complete, importable n8n workflow JSON.

n8n workflow JSON structure:
{
  "name": "...",
  "nodes": [
    {
      "id": "uuid",
      "name": "Node Name",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [250, 300],
      "parameters": { ... all params filled ... }
    }
  ],
  "connections": {
    "NodeName": {
      "main": [[{"node": "NextNode", "type": "main", "index": 0}]]
    }
  },
  "settings": {"executionOrder": "v1"}
}

NODE TYPES to use:
- n8n-nodes-base.webhook (Webhook trigger)
- n8n-nodes-base.scheduleTrigger (Cron)
- n8n-nodes-base.httpRequest (HTTP API calls)
- n8n-nodes-base.set (Set/transform data)
- n8n-nodes-base.if (Conditional branching)
- n8n-nodes-base.code (JavaScript code)
- n8n-nodes-base.emailSend (Send emails)
- n8n-nodes-base.slack (Slack messages)
- n8n-nodes-base.noOp (Error handler endpoint)
- n8n-nodes-langchain.openAi (AI node)

RULES:
- ALL node parameters must be filled with real values
- Positions must be logical (left to right, branching goes up/down)
- Include error handling: connect error output of key nodes to a noOp or emailSend error node
- Use expressions like ={{$json["field"]}} for data passing between nodes
- Output valid JSON — NO comments in JSON`,

      make: `Document a Make.com scenario as structured JSON with clear module descriptions.
Include: trigger module, all action modules with mapped fields, filters/routers, error handlers.
Also include setup instructions since Make.com doesn't have a direct JSON import like n8n.`,

      python: `Write a production Python automation script.
Use: schedule library for cron, requests for HTTP, python-dotenv for env vars.
Include: CLI args with argparse, rich for output, proper logging, retry logic, dry-run mode.`,

      'github-actions': `Write a complete GitHub Actions workflow YAML.
Use: ubuntu-latest, proper caching for dependencies, secrets for credentials.
Include: on: triggers (push, PR, schedule), jobs with steps, status badge in README.`,

      shell: `Write a robust bash automation script.
Include: set -euo pipefail, error handling with trap, color output, logging to file, lockfile for cron safety.`,
    };

    const systemPrompt = `You are an expert automation engineer. Build a complete, production-ready ${plan.platform} workflow.

PLATFORM: ${plan.platform}
TRIGGERS: ${plan.triggers.join(', ')}
TARGET NODES/STEPS: ~${plan.nodeCount}

${platformInstructions[plan.platform]}

QUALITY STANDARDS:
- ZERO placeholder values — all parameters/credentials must use real field names
- Error handling on every external API call
- Data transformation clearly documented
- Include realistic test data in comments or test section
- Output ONLY the raw file content — no preamble, no markdown fences`;

    return await callClaudeSonnet(
      `Automation request: ${userPrompt}\nPlatform: ${plan.platform}\nTriggers: ${plan.triggers.join(', ')}\n\nGenerate: ${fileMeta.path}\nRole: ${fileMeta.description}`,
      systemPrompt, 8192, undefined, meter
    );
  }
}
