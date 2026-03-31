// ─── Repair Phase ─────────────────────────────────────────────────────────────
// Uses Claude Sonnet to fix specific failures identified in the review.

import { callClaudeSonnet } from '../../connectors/claude';
import { REPAIR_RULES } from '../../rules/repair';
import type { BuiltFile, ReviewResult, CategoryRuleSet, OnEvent } from '../types';
import type { UsageMeter } from '../../services/UsageMeter';

export async function repairFiles(
  files: BuiltFile[],
  review: ReviewResult,
  categoryRules: CategoryRuleSet,
  onEvent: OnEvent,
  meter: UsageMeter
): Promise<BuiltFile[]> {
  if (review.failures.length === 0) return files;

  const failuresByFile = new Map<string, string[]>();
  for (const failure of review.failures) {
    const existing = failuresByFile.get(failure.file) ?? [];
    existing.push(`[${failure.severity.toUpperCase()}] ${failure.issue}`);
    failuresByFile.set(failure.file, existing);
  }

  await onEvent({
    type: 'log',
    data: { message: `🔧 Auto-repairing ${failuresByFile.size} file(s)...` },
    timestamp: new Date().toISOString(),
  });

  const repairedFiles = [...files];

  for (const [filePath, issues] of failuresByFile) {
    const file = files.find(f => f.path === filePath);
    if (!file) continue;

    await onEvent({
      type: 'log',
      data: { message: `🔧 Fixing ${filePath}: ${issues.length} issue(s)` },
      timestamp: new Date().toISOString(),
    });

    const system = `You are a code repair specialist. Fix ONLY the specific issues listed.
Do not rewrite the entire file — make targeted minimal changes.
Output ONLY the complete fixed file content — no markdown, no explanation.

${REPAIR_RULES}`;

    const userMsg = `Repair this file: ${filePath}

Issues to fix:
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

Current file content:
${file.content}

Output the complete fixed file (all content, not just the changed parts).`;

    let repairedContent = file.content;

    try {
      let buf = '';
      await callClaudeSonnet(
        userMsg,
        system,
        8192,
        (token: string) => { buf += token; },
        meter
      );

      // Strip markdown fences
      repairedContent = buf
        .replace(/^```[\w]*\n?/m, '')
        .replace(/\n?```\s*$/m, '')
        .trim();

      if (!repairedContent) repairedContent = file.content;
    } catch (err: any) {
      await onEvent({
        type: 'log',
        data: { message: `⚠️ Repair failed for ${filePath}: ${err.message}` },
        timestamp: new Date().toISOString(),
      });
    }

    // Update in repaired files array
    const idx = repairedFiles.findIndex(f => f.path === filePath);
    if (idx !== -1) {
      repairedFiles[idx] = { ...file, content: repairedContent };
      await onEvent({
        type: 'file_updated',
        data: { path: filePath, content: repairedContent },
        timestamp: new Date().toISOString(),
      });
    }
  }

  await onEvent({
    type: 'log',
    data: { message: `✅ Repair complete` },
    timestamp: new Date().toISOString(),
  });

  return repairedFiles;
}
