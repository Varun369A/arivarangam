// ─── Analyze Phase ────────────────────────────────────────────────────────────
// Uses Claude Haiku to understand the prompt: domain, complexity, special needs.

import { callClaudeHaiku } from '../../connectors/claude';
import type { PromptAnalysis, OnEvent } from '../types';

const SYSTEM = `You are a prompt analyzer for an AI code/design generation platform.
Analyze the user's task prompt and return ONLY a JSON object — no markdown, no explanation.

Return exactly:
{
  "domain": "string — specific domain, e.g. 'SaaS landing page', 'Discord moderation bot', 'sales dashboard'",
  "complexity": "simple|medium|complex",
  "hasAnimationRequest": boolean,
  "hasSecurityRequirement": boolean,
  "colorTheme": "string or null — e.g. 'dark minimal', 'neon cyberpunk', 'warm earthy'",
  "techStack": ["array of detected tech hints, e.g. 'React', 'PostgreSQL', 'Telegram'"],
  "specialRequirements": ["array of specific requests not covered by defaults"]
}

Complexity guide:
- simple: single page, single screen, basic content, 1–3 files
- medium: multi-section, moderate features, 4–8 files
- complex: multi-page, rich features, complex logic, 8+ files`;

export async function analyzePrompt(
  prompt: string,
  category: string,
  onEvent: OnEvent
): Promise<PromptAnalysis> {
  await onEvent({
    type: 'log',
    data: { message: '🔍 Analyzing your prompt...' },
    timestamp: new Date().toISOString(),
  });

  try {
    const raw = await callClaudeHaiku(
      `Category: ${category}\n\nPrompt: ${prompt.slice(0, 800)}`,
      SYSTEM,
      512
    );

    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const analysis: PromptAnalysis = {
      domain: parsed.domain ?? category,
      complexity: parsed.complexity ?? 'medium',
      hasAnimationRequest: parsed.hasAnimationRequest ?? (category === 'animation'),
      hasSecurityRequirement: parsed.hasSecurityRequirement ?? false,
      colorTheme: parsed.colorTheme ?? null,
      techStack: Array.isArray(parsed.techStack) ? parsed.techStack : [],
      specialRequirements: Array.isArray(parsed.specialRequirements) ? parsed.specialRequirements : [],
    };

    await onEvent({
      type: 'log',
      data: {
        message: `✅ Analyzed: ${analysis.domain} — ${analysis.complexity} complexity${analysis.hasAnimationRequest ? ', animated' : ''}`,
      },
      timestamp: new Date().toISOString(),
    });

    return analysis;
  } catch {
    // Fallback analysis
    return {
      domain: category,
      complexity: 'medium',
      hasAnimationRequest: ['animation', 'code', 'web'].includes(category),
      hasSecurityRequirement: false,
      colorTheme: null,
      techStack: [],
      specialRequirements: [],
    };
  }
}
