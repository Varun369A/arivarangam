// ─── Design Spec Phase ────────────────────────────────────────────────────────
// 1. Perplexity searches for real design trends/patterns for the domain
// 2. Claude Sonnet synthesizes a precise visual blueprint from that research
// This is the "thinking" step that gives Arivarangam Lovable/Bolt-level output.

import { callClaudeSonnet } from '../../connectors/claude';
import { search as perplexitySearch } from '../../connectors/perplexity';
import type { PromptAnalysis, DesignSpec, OnEvent } from '../types';
import type { UsageMeter } from '../../services/UsageMeter';

// ─── Robust JSON extraction ───────────────────────────────────────────────────

function extractJson(raw: string): string {
  let cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/g, '').trim();

  const start = cleaned.indexOf('{');
  if (start === -1) throw new Error('No JSON object found in response');
  cleaned = cleaned.slice(start);

  // Walk to find balanced closing brace
  let depth = 0;
  let end = -1;
  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '"') {
      i++;
      while (i < cleaned.length && cleaned[i] !== '"') {
        if (cleaned[i] === '\\') i++;
        i++;
      }
    } else if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }

  if (end !== -1) return cleaned.slice(0, end + 1);
  return repairJson(cleaned);
}

function repairJson(partial: string): string {
  let inString = false;
  let openBraces = 0;
  let openBrackets = 0;

  for (let i = 0; i < partial.length; i++) {
    const ch = partial[i];
    if (ch === '\\' && inString) { i++; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') openBraces++;
    else if (ch === '}') openBraces--;
    else if (ch === '[') openBrackets++;
    else if (ch === ']') openBrackets--;
  }

  let repaired = partial.trimEnd().replace(/,\s*$/, '');
  repaired += ']'.repeat(Math.max(0, openBrackets));
  repaired += '}'.repeat(Math.max(0, openBraces));
  return repaired;
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM = `You are a senior UI/UX designer and design systems architect.
Create a precise, section-by-section visual specification for a build.
Think like a Figma designer describing a design to a developer — specific, exact, professional.

Return ONLY a valid JSON object — no markdown, no commentary, no text outside JSON.
Keep arrays concise: max 5 sections, 4 components, 3 specialEffects.

{
  "overallMood": "one sentence describing visual identity",
  "colorSystem": {
    "bg": "#hex",
    "surface": "#hex",
    "surfaceAlt": "#hex",
    "primary": "#hex",
    "secondary": "#hex",
    "accent": "#hex",
    "text": "#hex",
    "textMuted": "#hex",
    "border": "rgba(r,g,b,a)",
    "gradients": ["gradient 1", "gradient 2"]
  },
  "typography": {
    "displayFont": "Font Name",
    "bodyFont": "Font Name",
    "googleFontsUrl": "https://fonts.googleapis.com/css2?...",
    "heroSize": "clamp(2.5rem, 6vw, 5rem)",
    "h2Size": "clamp(1.8rem, 4vw, 3rem)",
    "h3Size": "1.5rem",
    "heroWeight": 900,
    "letterSpacingHero": "-0.03em"
  },
  "sections": [
    {
      "name": "section-name",
      "layout": "CSS layout description",
      "elements": ["element 1", "element 2"],
      "colors": "color usage",
      "animation": "GSAP animation description"
    }
  ],
  "components": [
    { "name": "component-name", "style": "CSS style description" }
  ],
  "specialEffects": ["effect 1", "effect 2"]
}

DESIGN RULES:
- Always dark theme unless prompt explicitly says light. Base: #0a0a0f or #060610
- Color contrast ratio >= 4.5:1 for body text
- Hero: always min-height 100vh, full-bleed
- Premium Google Fonts (Space Grotesk, Plus Jakarta Sans, Syne, Outfit, DM Sans)
- GSAP for animations — ScrollTrigger, stagger, fromTo
- Glassmorphism, subtle gradients, layered depth — NOT flat`;

// ─── Main Export ──────────────────────────────────────────────────────────────

export async function createDesignSpec(
  prompt: string,
  category: string,
  analysis: PromptAnalysis,
  onEvent: OnEvent,
  meter: UsageMeter
): Promise<DesignSpec | null> {
  // ── Step 1: Perplexity research ─────────────────────────────────────────────
  let researchContext = '';
  try {
    await onEvent({
      type: 'log',
      data: { message: `🔍 Perplexity: researching ${analysis.domain} design trends…` },
      timestamp: new Date().toISOString(),
    });

    const query = `Best UI design patterns, color palettes, typography for ${analysis.domain} 2024-2025. Include: dark theme examples, animation trends, layout patterns.`;
    const research = await perplexitySearch(query);
    researchContext = research.slice(0, 1200);

    await onEvent({
      type: 'log',
      data: { message: `✅ Perplexity: design research done` },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    await onEvent({
      type: 'log',
      data: { message: `⚠️ Perplexity skipped: ${err?.message ?? 'error'}` },
      timestamp: new Date().toISOString(),
    });
  }

  // ── Step 2: Claude Sonnet → design spec ────────────────────────────────────
  await onEvent({
    type: 'log',
    data: { message: '🎨 Creating visual design blueprint…' },
    timestamp: new Date().toISOString(),
  });

  const userPrompt = [
    `Category: ${category}`,
    `Domain: ${analysis.domain}`,
    `Complexity: ${analysis.complexity}`,
    analysis.colorTheme ? `Color theme hint: ${analysis.colorTheme}` : '',
    analysis.hasAnimationRequest ? 'Animations requested: YES' : '',
    analysis.specialRequirements.length ? `Special: ${analysis.specialRequirements.join(', ')}` : '',
    `\nUser prompt: ${prompt.slice(0, 600)}`,
    researchContext
      ? `\n--- DESIGN RESEARCH (Perplexity) ---\n${researchContext}\n--- END ---`
      : '',
  ].filter(Boolean).join('\n');

  try {
    const raw = await callClaudeSonnet(userPrompt, SYSTEM, 4096, undefined, meter);
    const jsonStr = extractJson(raw);
    const parsed = JSON.parse(jsonStr);

    const spec: DesignSpec = {
      overallMood: parsed.overallMood ?? `Premium dark ${analysis.domain}`,
      colorSystem: parsed.colorSystem ?? {
        bg: '#0a0a0f', surface: '#111118', surfaceAlt: '#1a1a2e',
        primary: '#6366f1', secondary: '#a855f7', accent: '#06b6d4',
        text: '#f8fafc', textMuted: '#94a3b8', border: 'rgba(255,255,255,0.08)',
        gradients: ['linear-gradient(135deg,#6366f1,#a855f7)', 'radial-gradient(ellipse at top,#1a1a3e 0%,#0a0a0f 70%)'],
      },
      typography: parsed.typography ?? {
        displayFont: 'Space Grotesk', bodyFont: 'Inter',
        googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;900&family=Inter:wght@400;500;600&display=swap',
        heroSize: 'clamp(2.5rem, 6vw, 5rem)', h2Size: 'clamp(1.8rem, 4vw, 3rem)',
        h3Size: '1.5rem', heroWeight: 900, letterSpacingHero: '-0.03em',
      },
      sections:       Array.isArray(parsed.sections)       ? parsed.sections       : [],
      components:     Array.isArray(parsed.components)     ? parsed.components     : [],
      specialEffects: Array.isArray(parsed.specialEffects) ? parsed.specialEffects : [],
    };

    await onEvent({
      type: 'log',
      data: { message: `✅ Design spec: ${spec.sections.length} sections, primary ${spec.colorSystem.primary}` },
      timestamp: new Date().toISOString(),
    });

    return spec;
  } catch (err: any) {
    await onEvent({
      type: 'log',
      data: { message: `⚠️ Design spec failed: ${err?.message ?? 'parse error'} — using defaults` },
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}
