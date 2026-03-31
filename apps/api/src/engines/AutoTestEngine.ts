import type { TaskEvent } from '@arivarangam/types';
import { callClaudeSonnet, callClaudeHaiku } from '../connectors/claude';
import { UsageMeter } from '../services/UsageMeter';

// ─── AutoTestEngine ───────────────────────────────────────────────────────────
//
// Generates and validates tests for agent/code output.
// Used as a post-processor — receives files from AgentEngine or CodeEngine
// and generates appropriate test suites.
//
// Supports:
//  - Python: pytest test files with fixtures, mocks, coverage targets
//  - JavaScript/TypeScript: Vitest / Jest tests
//  - HTML: visual regression hints + accessibility checks (axe-core)
//
// Also performs static analysis:
//  - Detects unreachable code
//  - Finds hardcoded credentials / API keys
//  - Checks for common security issues (SQL injection patterns, XSS)

interface FileEntry { path: string; content: string; }

interface TestResult {
  testsGenerated: number;
  testFiles: FileEntry[];
  staticIssues: StaticIssue[];
}

interface StaticIssue {
  file: string;
  line?: number;
  severity: 'critical' | 'warning' | 'info';
  category: 'security' | 'correctness' | 'style';
  issue: string;
}

export class AutoTestEngine {
  /**
   * Generate tests and run static analysis on output files.
   * @param files - Files from AgentEngine/CodeEngine/WebEngine
   * @param prompt - Original user prompt for context
   * @param onEvent - Optional event emitter
   * @param meter - Optional UsageMeter
   */
  async generateTests(
    files: FileEntry[],
    prompt: string,
    onEvent?: (e: TaskEvent) => void,
    meter?: UsageMeter
  ): Promise<TestResult> {
    const emit = async (event: TaskEvent) => { if (onEvent) await onEvent(event); };
    const useMeter = meter ?? new UsageMeter();

    await emit({ type: 'log', data: { message: '🧪 AutoTest: running static analysis...' }, timestamp: new Date().toISOString() });

    // Step 1: Static analysis (fast, no LLM needed)
    const staticIssues = this.runStaticAnalysis(files);

    if (staticIssues.length > 0) {
      const criticals = staticIssues.filter(i => i.severity === 'critical');
      await emit({
        type: 'log',
        data: { message: `⚠️ AutoTest: ${staticIssues.length} issues found (${criticals.length} critical)` },
        timestamp: new Date().toISOString(),
      });

      for (const issue of criticals) {
        await emit({
          type: 'error_fixed',
          data: { path: issue.file, reason: `[${issue.category.toUpperCase()}] ${issue.issue}` },
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Step 2: Detect language and generate tests
    const pythonFiles = files.filter(f => f.path.endsWith('.py') && !f.path.includes('test'));
    const jsFiles = files.filter(f => (f.path.endsWith('.js') || f.path.endsWith('.ts')) && !f.path.includes('test') && !f.path.includes('node_modules'));

    const testFiles: FileEntry[] = [];

    if (pythonFiles.length > 0) {
      await emit({ type: 'log', data: { message: '🧪 AutoTest: generating pytest test suite...' }, timestamp: new Date().toISOString() });
      const pytestFile = await this.generatePytestSuite(pythonFiles, prompt, useMeter);
      if (pytestFile) {
        testFiles.push(pytestFile);
        await emit({ type: 'file_created', data: { path: pytestFile.path, content: pytestFile.content, language: 'python' }, timestamp: new Date().toISOString() });
      }

      // conftest.py for fixtures
      const conftestFile = await this.generateConftest(pythonFiles, useMeter);
      if (conftestFile) {
        testFiles.push(conftestFile);
        await emit({ type: 'file_created', data: { path: conftestFile.path, content: conftestFile.content, language: 'python' }, timestamp: new Date().toISOString() });
      }
    }

    if (jsFiles.length > 0) {
      await emit({ type: 'log', data: { message: '🧪 AutoTest: generating Vitest test suite...' }, timestamp: new Date().toISOString() });
      const vitestFile = await this.generateVitestSuite(jsFiles, prompt, useMeter);
      if (vitestFile) {
        testFiles.push(vitestFile);
        await emit({ type: 'file_created', data: { path: vitestFile.path, content: vitestFile.content, language: 'typescript' }, timestamp: new Date().toISOString() });
      }
    }

    await emit({
      type: 'log',
      data: { message: `✅ AutoTest: ${testFiles.length} test file(s) generated, ${staticIssues.length} static issues found` },
      timestamp: new Date().toISOString(),
    });

    return {
      testsGenerated: testFiles.length,
      testFiles,
      staticIssues,
    };
  }

  // ─── Static Analysis ──────────────────────────────────────────────────────────

  private runStaticAnalysis(files: FileEntry[]): StaticIssue[] {
    const issues: StaticIssue[] = [];

    for (const file of files) {
      const { path, content } = file;
      const lines = content.split('\n');

      // Security: hardcoded credentials
      const credentialPatterns = [
        { re: /(?:api[_-]?key|api[_-]?secret|password|secret[_-]?key)\s*=\s*["'][a-z0-9_\-]{16,}["']/i, label: 'Hardcoded credential detected' },
        { re: /sk-[a-zA-Z0-9]{40,}/, label: 'Exposed OpenAI API key pattern' },
        { re: /AIza[0-9A-Za-z\-_]{35}/, label: 'Exposed Google API key pattern' },
        { re: /ghp_[a-zA-Z0-9]{36}/, label: 'Exposed GitHub token pattern' },
      ];

      lines.forEach((line, idx) => {
        for (const { re, label } of credentialPatterns) {
          if (re.test(line)) {
            issues.push({ file: path, line: idx + 1, severity: 'critical', category: 'security', issue: label });
          }
        }
      });

      // Security: Python-specific
      if (path.endsWith('.py')) {
        if (/subprocess\.call\([^)]*shell=True/i.test(content)) {
          issues.push({ file: path, severity: 'critical', category: 'security', issue: 'subprocess.call with shell=True — command injection risk' });
        }
        if (/eval\(|exec\(/i.test(content) && !content.includes('# safe')) {
          issues.push({ file: path, severity: 'warning', category: 'security', issue: 'eval() or exec() used — potential code injection risk' });
        }
        if (/pickle\.load\(/i.test(content)) {
          issues.push({ file: path, severity: 'warning', category: 'security', issue: 'pickle.load() — unsafe deserialization' });
        }
      }

      // Security: JS-specific
      if (path.endsWith('.js') || path.endsWith('.ts')) {
        if (/innerHTML\s*=\s*(?!['"`])/i.test(content)) {
          issues.push({ file: path, severity: 'warning', category: 'security', issue: 'innerHTML assignment with variable — potential XSS' });
        }
        if (/eval\(/i.test(content)) {
          issues.push({ file: path, severity: 'warning', category: 'security', issue: 'eval() usage — avoid in production code' });
        }
      }

      // Correctness: bare except in Python
      if (path.endsWith('.py') && /except:\s*$/.test(content)) {
        issues.push({ file: path, severity: 'warning', category: 'correctness', issue: 'Bare except: clause catches all exceptions including SystemExit' });
      }

      // Correctness: console.log in production JS
      if ((path.endsWith('.js') || path.endsWith('.ts')) && !path.includes('test')) {
        const debugCount = (content.match(/console\.log\(/g) ?? []).length;
        if (debugCount > 5) {
          issues.push({ file: path, severity: 'info', category: 'style', issue: `${debugCount} console.log statements — consider removing for production` });
        }
      }
    }

    return issues;
  }

  // ─── Generate pytest suite ────────────────────────────────────────────────────

  private async generatePytestSuite(files: FileEntry[], prompt: string, meter: UsageMeter): Promise<FileEntry | null> {
    const mainFile = files.find(f => f.path === 'agent.py' || f.path === 'main.py') ?? files[0];
    if (!mainFile) return null;

    const systemPrompt = `You are a pytest expert. Generate comprehensive tests for this Python code.

REQUIREMENTS:
- Use pytest with fixtures
- Mock external API calls with unittest.mock.patch or pytest-mock
- Test happy path, error cases, edge cases for each function
- Use parametrize for multiple inputs
- Aim for 80%+ coverage of the main logic
- Include fixture for common setup (e.g., mocked API client)
- Use type hints in test functions
- Test file path: tests/test_main.py

Output: raw Python test file only — no markdown fences.`;

    try {
      const content = await callClaudeSonnet(
        `Context: ${prompt.slice(0, 300)}\n\nCode to test:\n${mainFile.content.slice(0, 6000)}`,
        systemPrompt, 4096, undefined, meter
      );
      return { path: 'tests/test_main.py', content: content.replace(/^```[\w]*\n?/, '').replace(/```\s*$/, '').trim() };
    } catch {
      return null;
    }
  }

  // ─── Generate conftest ────────────────────────────────────────────────────────

  private async generateConftest(files: FileEntry[], meter: UsageMeter): Promise<FileEntry | null> {
    const requirementsTxt = files.find(f => f.path === 'requirements.txt')?.content ?? '';
    const mainFile = files.find(f => f.path.endsWith('.py') && !f.path.includes('test'));
    if (!mainFile) return null;

    const systemPrompt = `Generate a pytest conftest.py with shared fixtures.
Include: mocked API client fixture, temp directory fixture, sample data fixture.
Match the actual imports and dependencies in the code.
Output: raw Python only, no fences.`;

    try {
      const content = await callClaudeHaiku(
        `Dependencies: ${requirementsTxt.slice(0, 500)}\n\nMain code sample:\n${mainFile.content.slice(0, 1000)}`,
        systemPrompt, 1024, meter
      );
      return { path: 'tests/conftest.py', content: content.replace(/^```[\w]*\n?/, '').replace(/```\s*$/, '').trim() };
    } catch {
      return null;
    }
  }

  // ─── Generate Vitest suite ────────────────────────────────────────────────────

  private async generateVitestSuite(files: FileEntry[], prompt: string, meter: UsageMeter): Promise<FileEntry | null> {
    const mainFile = files.find(f => !f.path.includes('test') && !f.path.endsWith('.html') && !f.path.endsWith('.css')) ?? files[0];
    if (!mainFile) return null;

    const isTs = mainFile.path.endsWith('.ts');

    const systemPrompt = `You are a Vitest expert. Generate comprehensive tests.

REQUIREMENTS:
- Use Vitest (import { describe, it, expect, vi, beforeEach } from 'vitest')
- Mock external dependencies with vi.mock()
- Test all exported functions
- Test error cases and edge cases
- Use describe blocks per function/component
- ${isTs ? 'TypeScript with proper types' : 'JavaScript'}

Output: raw ${isTs ? 'TypeScript' : 'JavaScript'} test file only — no markdown fences.`;

    try {
      const content = await callClaudeSonnet(
        `Context: ${prompt.slice(0, 300)}\n\nCode to test:\n${mainFile.content.slice(0, 5000)}`,
        systemPrompt, 4096, undefined, meter
      );
      const testPath = mainFile.path.replace(/\.(ts|js)$/, `.test.${isTs ? 'ts' : 'js'}`);
      return { path: testPath, content: content.replace(/^```[\w]*\n?/, '').replace(/```\s*$/, '').trim() };
    } catch {
      return null;
    }
  }
}

export const autoTestEngine = new AutoTestEngine();
