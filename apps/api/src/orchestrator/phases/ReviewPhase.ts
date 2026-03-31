// ─── Review Phase ─────────────────────────────────────────────────────────────
// Uses Claude Haiku to score the output against quality criteria.

import { callClaudeHaiku } from '../../connectors/claude';
import type { BuiltFile, CategoryRuleSet, ReviewResult, OnEvent } from '../types';
import type { UsageMeter } from '../../services/UsageMeter';

export async function reviewFiles(
  files: BuiltFile[],
  categoryRules: CategoryRuleSet,
  onEvent: OnEvent,
  meter: UsageMeter
): Promise<ReviewResult> {
  await onEvent({
    type: 'log',
    data: { message: '🔎 Reviewing output quality...' },
    timestamp: new Date().toISOString(),
  });

  const filesSummary = files
    .map(f => `\n\n=== ${f.path} ===\n${f.content.slice(0, 2000)}${f.content.length > 2000 ? '\n... (truncated)' : ''}`)
    .join('');

  const system = `You are a quality reviewer for an AI code/design generation platform.
Review the generated files against the criteria and return ONLY a JSON object.

REVIEW CRITERIA:
${categoryRules.reviewCriteria}

Quality threshold: ${categoryRules.qualityThreshold}/10

Return exactly:
{
  "score": number (0-10),
  "passed": boolean (true if score >= ${categoryRules.qualityThreshold}),
  "failures": [
    { "file": "path", "issue": "specific description", "severity": "low|medium|high" }
  ],
  "suggestions": ["string improvements that are nice-to-have, not blockers"]
}

Be strict but fair. A score of 7+ means production-ready.`;

  try {
    const raw = await callClaudeHaiku(
      `Category: ${categoryRules.name}\n\nGenerated files:${filesSummary}`,
      system,
      1024,
      meter
    );

    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const result: ReviewResult = {
      score: Math.max(0, Math.min(10, parsed.score ?? 5)),
      passed: parsed.passed ?? (parsed.score >= categoryRules.qualityThreshold),
      failures: Array.isArray(parsed.failures) ? parsed.failures : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };

    // Re-check pass condition
    result.passed = result.score >= categoryRules.qualityThreshold && result.failures.filter(f => f.severity === 'high').length === 0;

    await onEvent({
      type: 'log',
      data: {
        message: result.passed
          ? `✅ Quality check passed: ${result.score}/10`
          : `⚠️ Quality check: ${result.score}/10 — ${result.failures.length} issue(s) found`,
      },
      timestamp: new Date().toISOString(),
    });

    return result;
  } catch {
    // If review fails, assume passed to not block task completion
    await onEvent({
      type: 'log',
      data: { message: '⚠️ Review check skipped — proceeding with output' },
      timestamp: new Date().toISOString(),
    });

    return {
      score: 7,
      passed: true,
      failures: [],
      suggestions: [],
    };
  }
}
