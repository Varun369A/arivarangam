// ─── Plan Phase ───────────────────────────────────────────────────────────────
// Uses Claude Sonnet to produce a structured file manifest + visual decisions.

import { callClaudeHaiku } from '../../connectors/claude';
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

  const system = `You are a senior software architect and designer planning a build.
Given the task, return ONLY a JSON object describing the build plan.

${categoryRules.planningHints}

Return exactly:
{
  "files": [
    { "path": "string", "description": "string", "dependsOn": ["array of paths this file needs to reference"] }
  ],
  "colorPalette": "string — e.g. 'Dark: #0a0a0f base, #6366f1 accent, #a855f7 secondary'",
  "fontPairing": "string — e.g. 'Playfair Display (headings) + Inter (body)'",
  "animationStyle": "string — e.g. 'GSAP ScrollTrigger fade-ups with stagger'",
  "layoutStyle": "string — e.g. 'Full-bleed hero, bento grid features, split CTA'",
  "techStack": ["array of technologies/libraries to use"]
}

Domain: ${analysis.domain}
Complexity: ${analysis.complexity}
Color theme hint: ${analysis.colorTheme ?? 'choose premium dark theme'}
Special requirements: ${analysis.specialRequirements.join(', ') || 'none'}

Use ONLY the required files for this task. Do not add unnecessary files.`;

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
      colorPalette: parsed.colorPalette ?? 'Dark premium: #0a0a0f base, #6366f1 primary, #a855f7 accent',
      fontPairing:  parsed.fontPairing  ?? 'Inter (display + body)',
      animationStyle: parsed.animationStyle ?? 'GSAP ScrollTrigger with staggered fade-ups',
      layoutStyle:  parsed.layoutStyle  ?? 'Full-bleed hero, feature grid, CTA, footer',
      techStack:    Array.isArray(parsed.techStack) ? parsed.techStack : categoryRules.fileSpecs.map(f => f.path.split('.').pop() ?? ''),
    };

    await onEvent({
      type: 'log',
      data: { message: `📋 Plan ready: ${plan.files.length} files — ${plan.colorPalette.split(',')[0]}` },
      timestamp: new Date().toISOString(),
    });

    return plan;
  } catch {
    // Fallback: use category file specs as plan
    return {
      files: categoryRules.fileSpecs.map(f => ({
        path: f.path,
        description: f.description,
        dependsOn: f.dependsOn ?? [],
      })),
      colorPalette: 'Dark: #0a0a0f base, #6366f1 primary, #a855f7 accent, #0f172a surface',
      fontPairing: 'Inter (all weights)',
      animationStyle: 'GSAP ScrollTrigger',
      layoutStyle: 'Standard layout',
      techStack: [],
    };
  }
}
