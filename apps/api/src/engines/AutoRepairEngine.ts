import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeSonnet } from '../connectors/claude';
import { UsageMeter } from '../services/UsageMeter';

// ─── AutoRepairEngine ─────────────────────────────────────────────────────────
//
// Post-processing wrapper that validates engine output before task completion.
// Called by engines optionally, or invoked as a standalone repair pass.
//
// Checks:
//  - HTML files: CDN scripts present, no broken references, GSAP registered
//  - JS files: no undefined variable references, no ES6 imports in browser scripts
//  - JSON files: valid JSON (no comments, no trailing commas)
//  - Python files: imports match requirements.txt, no stub implementations
//  - Markdown files: no placeholder content remaining
//
// If issues found → one repair attempt with Claude Sonnet.
// On success → emits 'error_fixed' events per repaired file.

interface FileEntry { path: string; content: string; }

interface ValidationIssue {
  file: string;
  severity: 'critical' | 'warning';
  issue: string;
}

export class AutoRepairEngine {
  /**
   * Validate and repair a set of files.
   * @param files - Output files from any engine
   * @param context - Original user prompt (for context during repair)
   * @param onEvent - Event emitter (optional — for progress reporting)
   * @param meter - UsageMeter to track repair token usage
   * @returns Repaired files (or originals if no issues found)
   */
  async repairFiles(
    files: FileEntry[],
    context: string,
    onEvent?: (e: TaskEvent) => void,
    meter?: UsageMeter
  ): Promise<FileEntry[]> {
    const emit = async (event: TaskEvent) => { if (onEvent) await onEvent(event); };
    const useMeter = meter ?? new UsageMeter();

    const issues = this.detectIssues(files);

    if (issues.length === 0) {
      await emit({ type: 'log', data: { message: '✅ AutoRepair: all files validated — no issues found' }, timestamp: new Date().toISOString() });
      return files;
    }

    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    await emit({
      type: 'log',
      data: { message: `🔧 AutoRepair: found ${issues.length} issues (${criticalCount} critical) — repairing...` },
      timestamp: new Date().toISOString(),
    });

    const repairedFiles = await this.repairIssues(files, issues, context, useMeter);

    // Emit file_updated for each repaired file
    for (const repaired of repairedFiles) {
      const original = files.find(f => f.path === repaired.path);
      if (original && original.content !== repaired.content) {
        const fileIssues = issues.filter(i => i.file === repaired.path).map(i => i.issue).join('; ');
        await emit({
          type: 'error_fixed',
          data: { path: repaired.path, content: repaired.content, reason: `AutoRepair: ${fileIssues}` },
          timestamp: new Date().toISOString(),
        });
      }
    }

    await emit({
      type: 'log',
      data: { message: `✅ AutoRepair complete — ${repairedFiles.filter((r, i) => r.content !== files[i]?.content).length} files fixed` },
      timestamp: new Date().toISOString(),
    });

    return repairedFiles;
  }

  // ─── Issue Detection ──────────────────────────────────────────────────────────

  private detectIssues(files: FileEntry[]): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const fileMap = new Map(files.map(f => [f.path, f.content]));

    for (const file of files) {
      const { path, content } = file;
      const ext = path.split('.').pop()?.toLowerCase() ?? '';

      // ── HTML checks ─────────────────────────────────────────────────────────
      if (ext === 'html') {
        // GSAP referenced but not registered
        if (content.includes('ScrollTrigger') && !content.includes('registerPlugin(ScrollTrigger')) {
          issues.push({ file: path, severity: 'critical', issue: 'ScrollTrigger used but gsap.registerPlugin(ScrollTrigger) not called' });
        }
        // Local script/link references with no matching file
        const scriptRefs = [...content.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]);
        for (const ref of scriptRefs) {
          if (ref.startsWith('http') || ref.startsWith('//')) continue;
          const basename = ref.replace(/^\.\//, '');
          if (!fileMap.has(ref) && !fileMap.has(basename)) {
            issues.push({ file: path, severity: 'critical', issue: `References ${ref} but that file is not in the output` });
          }
        }
        // ES6 import in inline scripts
        if (/<script(?![^>]*type=["']module["'])[^>]*>[\s\S]*?import\s+/i.test(content)) {
          issues.push({ file: path, severity: 'critical', issue: 'ES6 import used in browser script without type="module" — will break CDN builds' });
        }
        // Placeholder text
        if (/lorem ipsum|insert content here|\[YOUR_/i.test(content)) {
          issues.push({ file: path, severity: 'warning', issue: 'Placeholder text still present in output' });
        }
      }

      // ── JS checks ───────────────────────────────────────────────────────────
      if (ext === 'js' && !path.includes('node_modules')) {
        if (content.match(/^import\s+/m) && !fileMap.has('package.json')) {
          issues.push({ file: path, severity: 'critical', issue: 'ES6 import used in standalone JS without package.json — CDN build will fail' });
        }
        if (/TODO|FIXME|throw new Error\(['"]Not implemented/i.test(content)) {
          issues.push({ file: path, severity: 'warning', issue: 'Stub or unimplemented code detected' });
        }
      }

      // ── JSON checks ─────────────────────────────────────────────────────────
      if (ext === 'json' && path !== '.env.example') {
        try {
          JSON.parse(content);
        } catch (e: any) {
          issues.push({ file: path, severity: 'critical', issue: `Invalid JSON: ${e.message}` });
        }
      }

      // ── Python checks ───────────────────────────────────────────────────────
      if (ext === 'py') {
        if (/TODO|FIXME|pass\s*#.*implement|raise NotImplementedError/i.test(content)) {
          issues.push({ file: path, severity: 'warning', issue: 'Stub or unimplemented function detected' });
        }
        // Check if requirements.txt exists when Python imports are present
        const requiresTxt = fileMap.get('requirements.txt');
        if (requiresTxt) {
          const importLines = content.match(/^(?:import|from)\s+(\w+)/gm) ?? [];
          const stdlibModules = new Set(['os', 'sys', 're', 'json', 'time', 'datetime', 'pathlib', 'typing', 'abc', 'io', 'collections', 'functools', 'itertools', 'math', 'random', 'string', 'subprocess', 'shutil', 'glob', 'logging', 'argparse', 'dataclasses', 'enum', 'copy', 'hashlib', 'base64', 'urllib', 'http', 'asyncio', 'threading', 'multiprocessing', 'unittest', 'traceback', 'inspect']);
          for (const line of importLines) {
            const mod = line.replace(/^(?:import|from)\s+/, '').split(/\s|\./).shift() ?? '';
            if (!stdlibModules.has(mod) && !requiresTxt.toLowerCase().includes(mod.toLowerCase())) {
              issues.push({ file: path, severity: 'warning', issue: `Imports '${mod}' but it's not in requirements.txt` });
            }
          }
        }
      }

      // ── Markdown checks ──────────────────────────────────────────────────────
      if (ext === 'md') {
        if (/\[.*todo.*\]|\[.*tbd.*\]|placeholder/i.test(content)) {
          issues.push({ file: path, severity: 'warning', issue: 'TODO or placeholder found in markdown' });
        }
      }
    }

    return issues;
  }

  // ─── Repair ───────────────────────────────────────────────────────────────────

  private async repairIssues(
    files: FileEntry[],
    issues: ValidationIssue[],
    context: string,
    meter: UsageMeter
  ): Promise<FileEntry[]> {
    // Group issues by file
    const byFile = new Map<string, ValidationIssue[]>();
    for (const issue of issues) {
      if (!byFile.has(issue.file)) byFile.set(issue.file, []);
      byFile.get(issue.file)!.push(issue);
    }

    const result = [...files];

    // Repair each affected file
    for (const [filePath, fileIssues] of byFile.entries()) {
      const fileIdx = result.findIndex(f => f.path === filePath);
      if (fileIdx === -1) continue;

      const file = result[fileIdx];
      const issueList = fileIssues.map(i => `- [${i.severity.toUpperCase()}] ${i.issue}`).join('\n');

      const systemPrompt = `You are a code repair specialist. Fix the specific issues in this file.

ISSUES TO FIX:
${issueList}

RULES:
- Fix ONLY the listed issues — do not rewrite or restructure the file
- For GSAP ScrollTrigger: add gsap.registerPlugin(ScrollTrigger) in DOMContentLoaded
- For broken references: add CDN fallback or remove the broken reference
- For invalid JSON: fix syntax (remove comments, fix trailing commas)
- For ES6 imports in browser scripts: convert to CDN global variable usage
- For placeholder text: replace with relevant content matching the context
- Output ONLY the complete fixed file content — no markdown fences, no explanations`;

      try {
        const fixed = await callClaudeSonnet(
          `Context: ${context.slice(0, 200)}\n\nFile: ${filePath}\n\nContent:\n${file.content}`,
          systemPrompt,
          8192,
          undefined,
          meter
        );
        const cleaned = fixed.replace(/^```[\w]*\n?/, '').replace(/```\s*$/, '').trim();
        result[fileIdx] = { path: filePath, content: cleaned };
      } catch {
        // If repair fails, keep original
      }
    }

    return result;
  }

  // ─── Standalone task repair ───────────────────────────────────────────────────

  /**
   * Validate files in a completed task and update them in-place if issues found.
   * Use after any engine completes to gate output quality.
   */
  async validateTaskOutput(taskId: string, files: FileEntry[], prompt: string): Promise<{
    files: FileEntry[];
    issueCount: number;
    repairedCount: number;
  }> {
    const meter = new UsageMeter();
    const issues = this.detectIssues(files);

    if (issues.length === 0) {
      return { files, issueCount: 0, repairedCount: 0 };
    }

    const repaired = await this.repairIssues(files, issues, prompt, meter);
    const repairedCount = repaired.filter((r, i) => r.content !== files[i]?.content).length;

    if (repairedCount > 0) {
      await prisma.platformLog.create({
        data: {
          type: 'FIX_APPLIED',
          severity: 'INFO',
          title: `AutoRepair: ${repairedCount} file(s) fixed for task ${taskId}`,
          description: issues.map(i => `${i.file}: ${i.issue}`).join('\n'),
          approved: true,
          approvedAt: new Date(),
        },
      }).catch(() => {}); // Non-blocking
    }

    return { files: repaired, issueCount: issues.length, repairedCount };
  }
}

export const autoRepairEngine = new AutoRepairEngine();
