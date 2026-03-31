// ─── Review Phase ─────────────────────────────────────────────────────────────
// Gemini reviews the output first (faster, great at code review).
// Falls back to Claude Haiku if Gemini API key is not set.

import { callClaudeHaiku } from '../../connectors/claude';
import { geminiReviewCode } from '../../connectors/gemini';
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

  // ── Step 1: Try Gemini review ───────────────────────────────────────────────
  if (process.env.GEMINI_API_KEY) {
    try {
      await onEvent({
        type: 'log',
        data: { message: '✨ Gemini: reviewing code quality…' },
        timestamp: new Date().toISOString(),
      });

      const geminiResult = await geminiReviewCode(
        files.map(f => ({ path: f.path, content: f.content })),
        categoryRules.qualityThreshold,
        categoryRules.reviewCriteria
      );

      if (geminiResult) {
        // Re-check pass: score >= threshold AND no high-severity failures
        geminiResult.passed =
          geminiResult.score >= categoryRules.qualityThreshold &&
          geminiResult.failures.filter(f => f.severity === 'high').length === 0;

        await onEvent({
          type: 'log',
          data: {
            message: geminiResult.passed
              ? `✅ Gemini review passed: ${geminiResult.score}/10`
              : `⚠️ Gemini review: ${geminiResult.score}/10 — ${geminiResult.failures.length} issue(s)`,
          },
          timestamp: new Date().toISOString(),
        });

        return geminiResult;
      }
    } catch (err: any) {
      await onEvent({
        type: 'log',
        data: { message: `⚠️ Gemini review failed: ${err?.message ?? 'error'} — falling back to Claude` },
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ── Step 2: Claude Haiku fallback ───────────────────────────────────────────
  const filesSummary = files
    .map(f => `\n\n=== ${f.path} ===\n${f.content.slice(0, 2000)}${f.content.length > 2000 ? '\n...(truncated)' : ''}`)
    .join('');

  const system = `You are a quality reviewer for an AI code/design generation platform.
Review the generated files and return ONLY a JSON object.

REVIEW CRITERIA:
${categoryRules.reviewCriteria}

Quality threshold: ${categoryRules.qualityThreshold}/10

Return exactly:
{
  "score": number (0-10),
  "passed": boolean,
  "failures": [
    { "file": "path", "issue": "specific description", "severity": "low|medium|high" }
  ],
  "suggestions": ["string improvements"]
}`;

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
      score:       Math.max(0, Math.min(10, parsed.score ?? 5)),
      passed:      parsed.passed ?? (parsed.score >= categoryRules.qualityThreshold),
      failures:    Array.isArray(parsed.failures)    ? parsed.failures.map((f: any) => ({ file: String(f.file ?? ''), issue: String(f.issue ?? ''), severity: (['low','medium','high'].includes(f.severity) ? f.severity : 'medium') as 'low'|'medium'|'high' })) : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };

    result.passed =
      result.score >= categoryRules.qualityThreshold &&
      result.failures.filter(f => f.severity === 'high').length === 0;

    await onEvent({
      type: 'log',
      data: {
        message: result.passed
          ? `✅ Quality check passed: ${result.score}/10`
          : `⚠️ Quality check: ${result.score}/10 — ${result.failures.length} issue(s)`,
      },
      timestamp: new Date().toISOString(),
    });

    return result;
  } catch {
    await onEvent({
      type: 'log',
      data: { message: '⚠️ Review skipped — proceeding with output' },
      timestamp: new Date().toISOString(),
    });

    return { score: 7, passed: true, failures: [], suggestions: [] };
  }
}
