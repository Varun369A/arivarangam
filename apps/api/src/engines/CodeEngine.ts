import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
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
    const emit = async (event: TaskEvent) => { await onEvent(event); };

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
        data: { message: `Planned ${plan.files.length} files. Tech stack: ${plan.techStack.join(', ')}` },
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

        const content = await this.generateFile(task.prompt, fileMeta, generatedFiles, plan);
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

      // Step 3: Auto-fix pass
      await emit({
        type: 'log',
        data: { message: 'Running auto-fix pass...' },
        timestamp: new Date().toISOString(),
      });

      const fixedFiles = await this.autoFix(task.prompt, generatedFiles);

      for (const fixed of fixedFiles) {
        const original = generatedFiles.find(f => f.path === fixed.path);
        if (original && original.content !== fixed.content) {
          await emit({
            type: 'file_updated',
            data: { path: fixed.path, content: fixed.content, reason: 'Auto-fix applied' },
            timestamp: new Date().toISOString(),
          });
        }
      }

      const creditsUsed = Math.min(60, Math.max(20, 15 + fixedFiles.length * 3));
      const metadata = { files: fixedFiles, techStack: plan.techStack, fileCount: fixedFiles.length };

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

  // ─── Refine (in-place follow-up) ─────────────────────────────────────────────

  async refine(
    task: any,
    followUpPrompt: string,
    previousFiles: FileEntry[],
    onEvent: (e: TaskEvent) => void
  ): Promise<void> {
    const emit = async (event: TaskEvent) => { await onEvent(event); };

    await prisma.task.update({
      where: { id: task.id },
      data: { status: 'running', completedAt: null, startedAt: new Date() },
    });

    try {
      await emit({
        type: 'log',
        data: { message: `Refining project: "${followUpPrompt.slice(0, 80)}${followUpPrompt.length > 80 ? '...' : ''}"` },
        timestamp: new Date().toISOString(),
      });

      // Build combined context
      const combinedPrompt = `Original project: ${task.prompt}\n\nRefinement request: ${followUpPrompt}`;

      const previousFileSummary = previousFiles.length > 0
        ? `\n\nExisting project files:\n${previousFiles.map(f =>
            `=== ${f.path} ===\n${f.content.slice(0, 600)}${f.content.length > 600 ? '\n...(truncated)' : ''}`
          ).join('\n\n').slice(0, 10000)}`
        : '';

      // Ask Claude what needs to change
      const planSystemPrompt = `You are an expert developer refining an existing codebase based on user feedback.

Analyze the refinement request and return ONLY a valid JSON object listing which files to modify and what new files to add:
{
  "modify": [{"path": "file/path", "description": "what to change and why"}],
  "create": [{"path": "file/path", "description": "what this new file does", "language": "typescript"}],
  "techStack": ["existing", "tech", "stack"]
}

Rules:
- Only include files that actually need changes based on the request
- Keep the existing file structure — don't restructure unless asked
- Return empty arrays if nothing of that type needs changing`;

      const planResponse = await callClaudeSonnet(
        `${combinedPrompt}${previousFileSummary}\n\nWhat files need to be created or modified?`,
        planSystemPrompt,
        2048
      );

      const plan = this.parseJSON<{ modify: any[]; create: any[]; techStack: string[] }>(
        planResponse,
        { modify: [], create: [], techStack: [] }
      );

      const totalChanges = plan.modify.length + plan.create.length;

      if (totalChanges === 0) {
        // No changes needed — still emit completion
        await emit({
          type: 'log',
          data: { message: 'No file changes needed for this request.' },
          timestamp: new Date().toISOString(),
        });
      }

      await emit({
        type: 'log',
        data: { message: `${plan.modify.length} files to update, ${plan.create.length} new files to create` },
        timestamp: new Date().toISOString(),
      });

      const updatedFiles = [...previousFiles];
      let i = 0;

      // Modify existing files
      for (const fileMeta of plan.modify) {
        i++;
        await emit({
          type: 'log',
          data: { message: `Updating ${fileMeta.path} (${i}/${totalChanges})...` },
          timestamp: new Date().toISOString(),
        });

        const existing = previousFiles.find(f => f.path === fileMeta.path);
        const systemPrompt = `You are an expert developer. Update the following file based on the refinement request.
Output ONLY the complete updated file content — no explanations, no markdown fences.
Keep all existing functionality unless explicitly asked to change it.`;

        const filePrompt = `${combinedPrompt}

File to update: ${fileMeta.path}
What to change: ${fileMeta.description}

Current content:
${existing?.content ?? '(new file)'}`;

        const newContent = await callClaudeSonnet(filePrompt, systemPrompt, 8192);
        const cleaned = this.stripMarkdownFences(newContent, fileMeta.path.split('.').pop() ?? '');

        const idx = updatedFiles.findIndex(f => f.path === fileMeta.path);
        if (idx >= 0) {
          updatedFiles[idx] = { path: fileMeta.path, content: cleaned };
        } else {
          updatedFiles.push({ path: fileMeta.path, content: cleaned });
        }

        await emit({
          type: 'file_updated',
          data: { path: fileMeta.path, content: cleaned, reason: fileMeta.description },
          timestamp: new Date().toISOString(),
        });
      }

      // Create new files
      for (const fileMeta of plan.create) {
        i++;
        await emit({
          type: 'log',
          data: { message: `Creating ${fileMeta.path} (${i}/${totalChanges})...` },
          timestamp: new Date().toISOString(),
        });

        const fullPlan = {
          files: [fileMeta],
          techStack: plan.techStack,
          notes: '',
        };
        const content = await this.generateFile(combinedPrompt, fileMeta, updatedFiles, fullPlan);
        updatedFiles.push({ path: fileMeta.path, content });

        await emit({
          type: 'file_created',
          data: { path: fileMeta.path, content, language: fileMeta.language },
          timestamp: new Date().toISOString(),
        });
      }

      const creditsUsed = Math.min(30, Math.max(10, 8 + totalChanges * 2));
      const metadata = { files: updatedFiles, techStack: plan.techStack, fileCount: updatedFiles.length };

      await taskService.completeTask(task.id, creditsUsed, metadata);

      await emit({
        type: 'completed',
        data: {
          files: updatedFiles,
          creditsUsed,
          fileCount: updatedFiles.length,
          message: `Refinement complete — ${plan.modify.length} updated, ${plan.create.length} created`,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({
        type: 'error',
        data: { message: err.message ?? 'Refinement failed' },
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  }

  // ─── Plan File Structure ──────────────────────────────────────────────────────

  private async planStructure(prompt: string, category: string): Promise<FilePlan> {
    const systemPrompt = `You are an expert software architect. Analyze the user's request and create a file structure plan.

Return ONLY a valid JSON object (no markdown, no comments, no prose) with this exact structure:
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
- For content tasks, use a single .md or .txt file
- Return ONLY the JSON — no text before or after`;

    const response = await callClaudeSonnet(
      `Create a file structure plan for this ${category} task:\n\n${prompt}`,
      systemPrompt,
      2048
    );

    const parsed = this.parseJSON<FilePlan>(response, {
      files: [{ path: 'output.txt', description: 'Main output', language: 'text' }],
      techStack: [],
      notes: '',
    });

    // Validate — if Claude returned garbage, use a sensible default
    if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
      console.warn('[CodeEngine] planStructure returned empty files, using default');
      return {
        files: [{ path: 'output.txt', description: 'Main output', language: 'text' }],
        techStack: [],
        notes: '',
      };
    }

    return parsed;
  }

  // ─── Generate Single File ──────────────────────────────────────────────────

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
    return this.stripMarkdownFences(content, fileMeta.language);
  }

  // ─── Auto-Fix Pass ────────────────────────────────────────────────────────────

  private async autoFix(userPrompt: string, files: FileEntry[]): Promise<FileEntry[]> {
    if (files.length === 0) return files;

    const filesSummary = files
      .map(f => `=== ${f.path} ===\n${f.content}`)
      .join('\n\n');

    const systemPrompt = `You are a code reviewer. Review all files for common errors and return the corrected versions.

Return ONLY a valid JSON array (no markdown, no prose before or after) with this structure:
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
      const parsed = this.parseJSON<FileEntry[]>(response, []);
      if (!parsed || !Array.isArray(parsed) || parsed.length === 0) return files;

      const valid = parsed.every(f => typeof f.path === 'string' && typeof f.content === 'string');
      if (!valid) return files;

      return parsed.map(f => ({ path: f.path, content: f.content }));
    } catch {
      return files;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  // Extract balanced JSON block (handles prose around JSON)
  private extractJsonBlock(text: string, expectArray: boolean): string | null {
    const openChar = expectArray ? '[' : '{';
    const closeChar = expectArray ? ']' : '}';
    const start = text.indexOf(openChar);
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\' && inString) { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === openChar) depth++;
      else if (ch === closeChar) {
        depth--;
        if (depth === 0) return text.slice(start, i + 1);
      }
    }
    return null;
  }

  private parseJSON<T>(text: string, fallback: T): T {
    const expectArray = Array.isArray(fallback);

    // Strip markdown fences only (NOT comments yet — comment regex corrupts URLs in strings)
    const cleaned = text
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/```\s*$/gm, '')
      .trim();

    // 1. Try direct parse (Claude returned clean JSON)
    try { return JSON.parse(cleaned) as T; } catch { /* continue */ }

    // 2. Extract JSON block from surrounding prose (most common case)
    const block = this.extractJsonBlock(cleaned, expectArray)
      ?? this.extractJsonBlock(cleaned, !expectArray);
    if (block) {
      try { return JSON.parse(block) as T; } catch { /* continue */ }
    }

    // 3. Strip JS comments then try again (Claude added comments to JSON)
    const stripped = cleaned
      .replace(/\/\/(?![^\n]*"[^\n]*(?:"[^\n]*"[^\n]*)*$)[^\n]*/gm, '') // single-line, not inside strings
      .replace(/\/\*[\s\S]*?\*\//g, '');
    try { return JSON.parse(stripped) as T; } catch { /* continue */ }
    const blockStripped = this.extractJsonBlock(stripped, expectArray)
      ?? this.extractJsonBlock(stripped, !expectArray);
    if (blockStripped) {
      try { return JSON.parse(blockStripped) as T; } catch { /* continue */ }
    }

    console.warn('[CodeEngine] JSON parse failed. Raw:', text.slice(0, 400));
    return fallback;
  }

  private stripMarkdownFences(content: string, language: string): string {
    return content
      .replace(/^```[\w]*\n?/, '')
      .replace(/```\s*$/, '')
      .trim();
  }
}
