import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeSonnet, callClaudeHaiku } from '../connectors/claude';
import { taskService } from '../services/TaskService';
import { UsageMeter } from '../services/UsageMeter';

// ─── AgentEngine ──────────────────────────────────────────────────────────────
//
// Generates production-ready AI agents and automation scripts:
//  - LangChain agents (Python) with custom tools
//  - CrewAI multi-agent workflows
//  - LlamaIndex RAG pipelines
//  - Simple Python scripts with AI capabilities
//  - FastAPI microservices wrapping AI logic
//
// All output includes: working code, tests, Docker config, .env template, README

interface FileEntry { path: string; content: string; }

type AgentFramework =
  | 'langchain'   // LangChain agents with tools
  | 'crewai'      // CrewAI multi-agent
  | 'llamaindex'  // LlamaIndex RAG
  | 'fastapi'     // FastAPI + AI service
  | 'script';     // Simple Python script

export class AgentEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (event: TaskEvent) => { await onEvent(event); };
    const meter = new UsageMeter();

    await prisma.task.update({ where: { id: task.id }, data: { status: 'running' } });

    try {
      await emit({ type: 'log', data: { message: '🤖 Analyzing agent requirements and selecting framework...' }, timestamp: new Date().toISOString() });

      const plan = await this.planAgent(task.prompt, meter);

      await emit({ type: 'log', data: { message: `🔧 Framework: ${plan.framework} | ${plan.files.length} files` }, timestamp: new Date().toISOString() });

      const generatedFiles: FileEntry[] = [];

      for (let i = 0; i < plan.files.length; i++) {
        const fileMeta = plan.files[i];
        await emit({ type: 'log', data: { message: `⚙️ Building ${fileMeta.path} (${i + 1}/${plan.files.length})...` }, timestamp: new Date().toISOString() });

        const content = await this.generateFile(task.prompt, fileMeta, generatedFiles, plan, meter);
        generatedFiles.push({ path: fileMeta.path, content });

        await emit({
          type: 'file_created',
          data: { path: fileMeta.path, content, language: fileMeta.language, index: i + 1, total: plan.files.length },
          timestamp: new Date().toISOString(),
        });
      }

      // Consistency review pass
      await emit({ type: 'log', data: { message: '🔍 Running consistency and correctness check...' }, timestamp: new Date().toISOString() });
      const fixedFiles = await this.reviewPass(task.prompt, generatedFiles, plan, meter);

      for (const fixed of fixedFiles) {
        const original = generatedFiles.find(f => f.path === fixed.path);
        if (original && original.content !== fixed.content) {
          await emit({ type: 'file_updated', data: { path: fixed.path, content: fixed.content, reason: 'Consistency fix' }, timestamp: new Date().toISOString() });
        }
      }

      const creditsUsed = meter.toCredits();
      await taskService.completeTask(task.id, creditsUsed, {
        files: fixedFiles, framework: plan.framework, fileCount: fixedFiles.length, usage: meter.summary(),
      });

      await emit({
        type: 'completed',
        data: { files: fixedFiles, creditsUsed, message: `✅ ${plan.framework} agent ready — ${fixedFiles.length} files` },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({ type: 'error', data: { message: err.message ?? 'AgentEngine failed' }, timestamp: new Date().toISOString() });
      throw err;
    }
  }

  // ─── Plan Agent ───────────────────────────────────────────────────────────────

  private async planAgent(prompt: string, meter: UsageMeter): Promise<{
    framework: AgentFramework;
    tools: string[];
    files: { path: string; description: string; language: string }[];
  }> {
    const systemPrompt = `You are an AI agent architect. Analyze the request and return ONLY valid JSON:
{
  "framework": "langchain",
  "tools": ["web_search", "code_executor", "file_reader"],
  "files": [
    {"path": "agent.py", "description": "Main agent with tools", "language": "python"},
    {"path": "tools.py", "description": "Custom tool implementations", "language": "python"},
    {"path": "config.py", "description": "Pydantic settings", "language": "python"},
    {"path": "requirements.txt", "description": "Pinned dependencies", "language": "text"},
    {"path": ".env.example", "description": "Required env vars", "language": "text"},
    {"path": "tests/test_agent.py", "description": "Unit tests", "language": "python"},
    {"path": "README.md", "description": "Setup and usage", "language": "markdown"}
  ]
}

Framework selection:
- langchain: general AI agents with tools (web search, code execution, APIs)
- crewai: multi-agent collaboration with defined roles
- llamaindex: document/knowledge base Q&A, RAG pipelines
- fastapi: expose AI as a REST API service
- script: simple standalone Python script with AI capabilities`;

    try {
      const response = await callClaudeHaiku(prompt, systemPrompt, 1024, meter);
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1) return JSON.parse(cleaned.slice(start, end + 1));
    } catch { /* fallback */ }

    return {
      framework: 'langchain',
      tools: ['web_search', 'calculator'],
      files: [
        { path: 'agent.py', description: 'Main agent', language: 'python' },
        { path: 'tools.py', description: 'Tool implementations', language: 'python' },
        { path: 'config.py', description: 'Configuration', language: 'python' },
        { path: 'requirements.txt', description: 'Dependencies', language: 'text' },
        { path: '.env.example', description: 'Env vars template', language: 'text' },
        { path: 'tests/test_agent.py', description: 'Tests', language: 'python' },
        { path: 'README.md', description: 'Documentation', language: 'markdown' },
      ],
    };
  }

  // ─── Generate File ────────────────────────────────────────────────────────────

  private async generateFile(
    userPrompt: string,
    fileMeta: { path: string; description: string; language: string },
    existingFiles: FileEntry[],
    plan: { framework: AgentFramework; tools: string[] },
    meter: UsageMeter
  ): Promise<string> {
    const ctx = existingFiles.length > 0
      ? `\n\nExisting files:\n${existingFiles.map(f => `--- ${f.path} ---\n${f.content.slice(0, 600)}`).join('\n\n')}`
      : '';

    const frameworkGuides: Record<AgentFramework, string> = {
      langchain: `LangChain v0.2+ patterns:
- Use langchain_anthropic.ChatAnthropic or langchain_openai.ChatOpenAI
- Tools: @tool decorator or BaseTool subclass with async _arun
- Agent: create_react_agent + AgentExecutor
- Memory: ConversationBufferMemory or ConversationSummaryMemory
- Callbacks: StreamingStdOutCallbackHandler for verbose output
- Retry: RetryOutputParser for robust parsing
- pinned: langchain==0.2.0 langchain-anthropic==0.1.13`,

      crewai: `CrewAI patterns:
- Agent: Agent(role, goal, backstory, tools, llm, verbose=True)
- Task: Task(description, expected_output, agent)
- Crew: Crew(agents, tasks, process=Process.sequential)
- Tools: inherit from crewai_tools or define with @tool
- LLM: use ChatAnthropic or ChatOpenAI
- pinned: crewai==0.28.8 crewai-tools==0.1.6`,

      llamaindex: `LlamaIndex v0.10+ patterns:
- VectorStoreIndex.from_documents for building index
- SimpleDirectoryReader for document loading
- QueryEngine for Q&A
- ResponseSynthesizer for custom response formatting
- Use Anthropic LLM: Anthropic(model="claude-haiku-4-5-20251001")
- pinned: llama-index==0.10.0 llama-index-llms-anthropic==0.1.3`,

      fastapi: `FastAPI patterns:
- Use Pydantic v2 for request/response models
- Async endpoints with async def
- Background tasks for long AI operations
- SSE streaming endpoint using StreamingResponse
- CORS middleware for browser access
- Health check endpoint at /health
- OpenAPI docs auto-generated at /docs`,

      script: `Python script patterns:
- argparse for CLI arguments
- Rich for beautiful terminal output
- Proper logging with structlog or logging module
- Type hints throughout
- Error handling with retry decorator
- __main__ guard`,
    };

    const systemPrompt = `You are a senior Python engineer specializing in AI/LLM systems. Build production-quality agent code.

FRAMEWORK: ${plan.framework}
TOOLS NEEDED: ${plan.tools.join(', ')}

${frameworkGuides[plan.framework]}

QUALITY STANDARDS:
- Type hints on all functions and class methods
- Docstrings on all public methods
- Proper error handling with specific exception types (not bare except)
- Retry logic for API calls (tenacity library)
- Environment variables via python-dotenv / pydantic BaseSettings
- Logging with level control (DEBUG/INFO/ERROR)
- ZERO stub implementations — all tool functions must actually work
- requirements.txt must include ALL imported packages with pinned versions

Output ONLY the raw file content — no markdown fences, no explanations.`;

    return await callClaudeSonnet(
      `Task: ${userPrompt}\nFramework: ${plan.framework}\nTools: ${plan.tools.join(', ')}${ctx}\n\nGenerate: ${fileMeta.path}\nRole: ${fileMeta.description}`,
      systemPrompt, 8192, undefined, meter
    );
  }

  // ─── Review Pass ──────────────────────────────────────────────────────────────

  private async reviewPass(
    userPrompt: string,
    files: FileEntry[],
    plan: { framework: AgentFramework },
    meter: UsageMeter
  ): Promise<FileEntry[]> {
    if (files.length === 0) return files;
    const summary = files.map(f => `=== ${f.path} ===\n${f.content}`).join('\n\n');

    const systemPrompt = `You are a Python code reviewer specializing in ${plan.framework}. Review and fix the agent codebase.

CHECK:
- requirements.txt includes ALL packages imported across all .py files (with pinned versions)
- .env.example has ALL env vars referenced in config.py / os.environ calls
- Agent imports match what's in tools.py
- Type hints consistent across files
- No undefined variables or missing imports
- Tests import from correct module paths
- README setup instructions are accurate

Return ONLY valid JSON array: [{"path":"...","content":"...","fixed":true/false}]
Return ALL files even if unchanged.`;

    try {
      const response = await callClaudeSonnet(
        `Prompt: ${userPrompt.slice(0, 200)}\n\nReview:\n${summary.slice(0, 12000)}`,
        systemPrompt, 8192, undefined, meter
      );
      const cleaned = response.replace(/^```[\w]*\n?/gm, '').replace(/```\s*$/gm, '').trim();
      const start = cleaned.indexOf('[');
      const end = cleaned.lastIndexOf(']');
      if (start === -1 || end === -1) return files;
      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as FileEntry[];
      if (!Array.isArray(parsed) || parsed.length === 0) return files;
      return parsed.map(f => ({ path: f.path, content: f.content }));
    } catch {
      return files;
    }
  }
}
