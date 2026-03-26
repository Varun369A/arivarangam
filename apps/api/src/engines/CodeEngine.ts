import { prisma } from '@arrivarangam/db';
import type { TaskEvent } from '@arrivarangam/types';
import { callClaudeSonnet, callClaudeHaiku } from '../connectors/claude';
import { taskService } from '../services/TaskService';

interface FileEntry {
  path: string;
  content: string;
}

interface FilePlan {
  files: { path: string; description: string; language: string }[];
  techStack: string[];
  notes: string;
}

// ─── CodeEngine ───────────────────────────────────────────────────────────────

export class CodeEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (event: TaskEvent) => {
      await onEvent(event);
    };

    // Update task to running
    await prisma.task.update({
      where: { id: task.id },
      data: { status: 'running' },
    });

    try {
      // Step 1: Plan file structure
      await emit({
        type: 'log',
        data: { message: 'Analyzing requirements and planning file structure...' },
        timestamp: new Date().toISOString(),
      });

      const plan = await this.planStructure(task.prompt, task.category);

      await emit({
        type: 'log',
        data: {
          message: `Planned ${plan.files.length} files. Tech stack: ${plan.techStack.join(', ')}`,
        },
        timestamp: new Date().toISOString(),
      });

      // Step 2: Generate each file
      const generatedFiles: FileEntry[] = [];

      for (let i = 0; i < plan.files.length; i++) {
        const fileMeta = plan.files[i];

        await emit({
          type: 'log',
          data: { message: `Generating ${fileMeta.path} (${i + 1}/${plan.files.length})...` },
          timestamp: new Date().toISOString(),
        });

        const content = await this.generateFile(
          task.prompt,
          fileMeta,
          generatedFiles,
          plan
        );

        generatedFiles.push({ path: fileMeta.path, content });

        await emit({
          type: 'file_created',
          data: {
            path: fileMeta.path,
            content,
            language: fileMeta.language,
            index: i + 1,
            total: plan.files.length,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Step 3: Auto-fix pass — review for common errors
      await emit({
        type: 'log',
        data: { message: 'Running auto-fix pass...' },
        timestamp: new Date().toISOString(),
      });

      const fixedFiles = await this.autoFix(task.prompt, generatedFiles);

      // Emit file_updated for any changed files
      for (const fixed of fixedFiles) {
        const original = generatedFiles.find(f => f.path === fixed.path);
        if (original && original.content !== fixed.content) {
          await emit({
            type: 'file_updated',
            data: {
              path: fixed.path,
              content: fixed.content,
              reason: 'Auto-fix applied',
            },
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Calculate credits used (20-60 based on file count and complexity)
      const creditsUsed = Math.min(60, Math.max(20, 15 + fixedFiles.length * 3));

      // Step 4: Complete the task
      const metadata = {
        files: fixedFiles,
        techStack: plan.techStack,
        fileCount: fixedFiles.length,
      };

      await taskService.completeTask(task.id, creditsUsed, metadata);

      await emit({
        type: 'completed',
        data: {
          files: fixedFiles,
          creditsUsed,
          fileCount: fixedFiles.length,
          message: `Successfully generated ${fixedFiles.length} files`,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({
        type: 'error',
        data: { message: err.message ?? 'Code generation failed' },
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  }

  // ─── Plan File Structure ──────────────────────────────────────────────────────

  private async planStructure(prompt: string, category: string): Promise<FilePlan> {
    const systemPrompt = `You are an expert software architect. Analyze the user's request and create a file structure plan.

Return ONLY a valid JSON object (no markdown, no comments) with this exact structure:
{
  "files": [
    {"path": "relative/path/to/file.ts", "description": "what this file does", "language": "typescript"}
  ],
  "techStack": ["list", "of", "technologies"],
  "notes": "any important architectural notes"
}

Rules:
- Keep file count reasonable (3-15 files max)
- Use relative paths from project root
- Include package.json, README.md for code projects
- For content tasks, use a single .md or .txt file`;

    const response = await callClaudeSonnet(
      `Create a file structure plan for this ${category} task:\n\n${prompt}`,
      systemPrompt,
      2048
    );

    return this.parseJSON<FilePlan>(response, {
      files: [{ path: 'output.txt', description: 'Main output', language: 'text' }],
      techStack: [],
      notes: '',
    });
  }

  // ─── Generate Single File ─────────────────────────────────────────────────────

  private async generateFile(
    userPrompt: string,
    fileMeta: { path: string; description: string; language: string },
    existingFiles: FileEntry[],
    plan: FilePlan
  ): Promise<string> {
    const contextSummary = existingFiles.length > 0
      ? `\n\nAlready generated files:\n${existingFiles.map(f =>
          `--- ${f.path} ---\n${f.content.slice(0, 500)}${f.content.length > 500 ? '\n...(truncated)' : ''}`
        ).join('\n\n')}`
      : '';

    const systemPrompt = `You are an expert developer. Generate complete, production-ready code for the requested file.

Rules:
- Output ONLY the file content, no explanations, no markdown fences
- Write complete, working code — no TODOs, no stubs
- Use proper error handling
- For JSON files: NO comments (JSON doesn't support comments)
- For TypeScript/JavaScript: include all necessary imports
- Follow best practices for the language/framework`;

    const filePrompt = `Task: ${userPrompt}

Full project plan:
Tech stack: ${plan.techStack.join(', ')}
Total files: ${plan.files.length}
${contextSummary}

Now generate the complete content for: ${fileMeta.path}
Description: ${fileMeta.description}
Language: ${fileMeta.language}`;

    const content = await callClaudeSonnet(filePrompt, systemPrompt, 8192);

    // Strip markdown fences if Claude wrapped the output
    return this.stripMarkdownFences(content, fileMeta.language);
  }

  // ─── Auto-Fix Pass ────────────────────────────────────────────────────────────

  private async autoFix(userPrompt: string, files: FileEntry[]): Promise<FileEntry[]> {
    if (files.length === 0) return files;

    const filesSummary = files
      .map(f => `=== ${f.path} ===\n${f.content}`)
      .join('\n\n');

    const systemPrompt = `You are a code reviewer. Review all files for common errors and return the corrected versions.

Return ONLY a valid JSON array (no markdown) with this structure:
[{"path": "file/path", "content": "complete file content", "fixed": true/false}]

Check for:
- Import/export mismatches
- Missing dependencies in package.json
- TypeScript type errors
- Invalid JSON syntax (NO comments in JSON files)
- Missing required configuration
- Broken references between files

Return ALL files, even unchanged ones.`;

    let response: string;
    try {
      response = await callClaudeSonnet(
        `Original task: ${userPrompt.slice(0, 200)}\n\nReview and fix these files:\n\n${filesSummary.slice(0, 12000)}`,
        systemPrompt,
        8192
      );
    } catch (err) {
      console.warn('[CodeEngine] Auto-fix pass failed, returning original files:', err);
      return files;
    }

    try {
      const parsed = this.parseJSON<FileEntry[]>(response, null);
      if (!parsed || !Array.isArray(parsed)) return files;

      // Validate structure
      const valid = parsed.every(f => typeof f.path === 'string' && typeof f.content === 'string');
      if (!valid) return files;

      return parsed.map(f => ({ path: f.path, content: f.content }));
    } catch {
      return files;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private parseJSON<T>(text: string, fallback: T): T {
    // Strip markdown fences
    let cleaned = text
      .replace(/^```[\w]*\n?/m, '')
      .replace(/```\s*$/m, '')
      .trim();

    // Remove JS-style comments from JSON (common Claude mistake)
    cleaned = cleaned
      .replace(/\/\/.*$/gm, '')   // single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // multi-line comments

    try {
      return JSON.parse(cleaned) as T;
    } catch (err) {
      console.warn('[CodeEngine] JSON parse failed, using fallback. Raw text:', text.slice(0, 200));
      return fallback;
    }
  }

  private stripMarkdownFences(content: string, language: string): string {
    // Remove leading ```lang or ```
    const stripped = content
      .replace(/^```[\w]*\n?/, '')
      .replace(/```\s*$/, '')
      .trim();
    return stripped;
  }
}
