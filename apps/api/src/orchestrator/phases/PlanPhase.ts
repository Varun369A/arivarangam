// ─── Plan Phase ───────────────────────────────────────────────────────────────
// 1. GPT-4o suggests technical approach and architecture
// 2. Claude Haiku produces the structured file manifest + design decisions

import { callClaudeHaiku } from '../../connectors/claude';
import { callGPT4o } from '../../connectors/openai';
import type { PromptAnalysis, BuildPlan, CategoryRuleSet, OnEvent } from '../types';
import type { UsageMeter } from '../../services/UsageMeter';

export async function planBuild(
  prompt: string,
  category: string,
  analysis: PromptAnalysis,
  categoryRules: CategoryRuleSet,
  onEvent: OnEvent,
  meter: UsageMeter
): Promise<BuildPlan> {
  await onEvent({
    type: 'log',
    data: { message: '📐 Planning file structure and design...' },
    timestamp: new Date().toISOString(),
  });

  // ── Step 1: GPT-4o architecture suggestion ──────────────────────────────────
  let gptSuggestions = '';
  try {
    await onEvent({
      type: 'log',
      data: { message: `💬 ChatGPT: suggesting approach for ${analysis.domain}…` },
      timestamp: new Date().toISOString(),
    });

    const gptSystem = `You are a senior software architect advising on a build.
Suggest the best technical approach in 3-4 concise bullet points.
Focus on: file structure, key libraries, architecture pattern, UX considerations.
Be specific to the domain. No preamble — bullets only.`;

    const gptPrompt = `Domain: ${analysis.domain}
Category: ${category}
Complexity: ${analysis.complexity}
Tech hints: ${analysis.techStack.join(', ') || 'none'}
Special requirements: ${analysis.specialRequirements.join(', ') || 'none'}
User prompt: ${prompt.slice(0, 400)}`;

    const gptRaw = await callGPT4o(gptPrompt, gptSystem, 512);
    gptSuggestions = gptRaw.trim();

    await onEvent({
      type: 'log',
      data: { message: `✅ ChatGPT suggestions received` },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    await onEvent({
      type: 'log',
      data: { message: `⚠️ ChatGPT skipped: ${err?.message ?? 'error'}` },
      timestamp: new Date().toISOString(),
    });
  }

  // ── Step 2: Claude Haiku → structured plan ──────────────────────────────────
  const system = `You are a senior software architect planning a build.
Given the task, return ONLY a JSON object describing the build plan.

${categoryRules.planningHints}

${gptSuggestions ? `ARCHITECTURE SUGGESTIONS (from ChatGPT):\n${gptSuggestions}\n` : ''}

Return exactly:
{
  "files": [
    { "path": "string", "description": "string", "dependsOn": ["array of paths this file references"] }
  ],
  "colorPalette": "string",
  "fontPairing": "string",
  "animationStyle": "string",
  "layoutStyle": "string",
  "techStack": ["array of technologies"]
}

Domain: ${analysis.domain}
Complexity: ${analysis.complexity}
Color theme: ${analysis.colorTheme ?? 'premium dark'}
Special requirements: ${analysis.specialRequirements.join(', ') || 'none'}

Use ONLY the required files. Do not add unnecessary files.`;

  try {
    const raw = await callClaudeHaiku(
      `Category: ${category}\nPrompt: ${prompt.slice(0, 1000)}`,
      system,
      1024,
      meter
    );

    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const plan: BuildPlan = {
      files: Array.isArray(parsed.files) ? parsed.files : categoryRules.fileSpecs.map(f => ({
        path: f.path,
        description: f.description,
        dependsOn: f.dependsOn ?? [],
      })),
      colorPalette:   parsed.colorPalette   ?? 'Dark: #0a0a0f base, #6366f1 primary, #a855f7 accent',
      fontPairing:    parsed.fontPairing    ?? 'Space Grotesk (display) + Inter (body)',
      animationStyle: parsed.animationStyle ?? 'GSAP ScrollTrigger staggered fade-ups',
      layoutStyle:    parsed.layoutStyle    ?? 'Full-bleed hero, feature grid, CTA, footer',
      techStack:      Array.isArray(parsed.techStack) ? parsed.techStack : [],
    };

    await onEvent({
      type: 'log',
      data: { message: `📋 Plan ready: ${plan.files.length} files — ${plan.colorPalette.split(',')[0]}` },
      timestamp: new Date().toISOString(),
    });

    return plan;
  } catch {
    return {
      files: categoryRules.fileSpecs.map(f => ({
        path: f.path,
        description: f.description,
        dependsOn: f.dependsOn ?? [],
      })),
      colorPalette:   'Dark: #0a0a0f base, #6366f1 primary, #a855f7 accent',
      fontPairing:    'Space Grotesk + Inter',
      animationStyle: 'GSAP ScrollTrigger',
      layoutStyle:    'Standard layout',
      techStack:      [],
    };
  }
}
