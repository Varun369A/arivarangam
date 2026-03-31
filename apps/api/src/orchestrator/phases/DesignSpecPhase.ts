// ─── Design Spec Phase ────────────────────────────────────────────────────────
// Uses Claude Sonnet to produce a rich, section-level visual blueprint.
// This is the "thinking" step that Lovable/Bolt use to plan premium output.

import { callClaudeSonnet } from '../../connectors/claude';
import type { PromptAnalysis, DesignSpec, OnEvent } from '../types';
import type { UsageMeter } from '../../services/UsageMeter';

const SYSTEM = `You are a senior UI/UX designer and design systems architect.
Your job is to create a precise, section-by-section visual specification for a build.
You think like a Figma designer describing a design to a developer — specific, exact, professional.

Return ONLY a valid JSON object matching this structure exactly (no markdown, no commentary):

{
  "overallMood": "string — one sentence describing the visual identity and feel",
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
    "gradients": ["gradient declaration 1", "gradient declaration 2"]
  },
  "typography": {
    "displayFont": "Font Name",
    "bodyFont": "Font Name",
    "googleFontsUrl": "full https://fonts.googleapis.com/css2?...",
    "heroSize": "clamp(Xrem, Yvw, Zrem)",
    "h2Size": "clamp(Xrem, Yvw, Zrem)",
    "h3Size": "string",
    "heroWeight": 900,
    "letterSpacingHero": "-0.03em"
  },
  "sections": [
    {
      "name": "section-name",
      "layout": "describe the CSS layout: grid/flex, columns, min-height, alignment",
      "elements": ["element 1 with content hint", "element 2 with content hint", "..."],
      "colors": "describe which colors are applied where in this section",
      "animation": "GSAP: describe what animates, from/to values, stagger, ScrollTrigger if applicable"
    }
  ],
  "components": [
    {
      "name": "component-name",
      "style": "full CSS description: background, border, border-radius, padding, hover effects, shadow"
    }
  ],
  "specialEffects": ["effect 1 description", "effect 2 description"]
}

DESIGN RULES — these are non-negotiable:
- Always use dark themes unless the prompt explicitly requests light. Base: #0a0a0f or #060610
- Color pairs must have contrast ratio ≥ 4.5:1 for body text
- Hero section: always min-height 100vh, full-bleed
- Navigation: always fixed, backdrop-filter blur
- Use indigo/violet/cyan glow palette for dark themes unless prompt specifies otherwise
- Premium details: gradient text for headlines, glowing card borders, mesh gradient backgrounds
- Typography: ALWAYS load 2 Google Fonts — Display + Sans. Never use system fonts alone.
- GSAP: use ScrollTrigger for scroll animations, page-load animations with timeline
- Components MUST have hover states (translateY, shadow deepening)`;

export async function createDesignSpec(
  prompt: string,
  category: string,
  analysis: PromptAnalysis,
  onEvent: OnEvent,
  meter: UsageMeter
): Promise<DesignSpec | null> {
  await onEvent({
    type: 'log',
    data: { message: '🎨 Designing visual blueprint...' },
    timestamp: new Date().toISOString(),
  });

  const userMsg = `Category: ${category}
Domain: ${analysis.domain}
Color theme hint: ${analysis.colorTheme ?? 'premium dark'}
Animation needed: ${analysis.hasAnimationRequest}
Special requirements: ${analysis.specialRequirements.join(', ') || 'none'}
Tech stack hints: ${analysis.techStack.join(', ') || 'vanilla HTML/CSS/JS'}

User prompt: ${prompt.slice(0, 1200)}

Create a complete visual specification for this project. Include:
1. All page sections in order (nav, hero, features, etc.) with exact element lists
2. Exact hex values for the color system
3. Specific Google Fonts with the exact CDN URL
4. Per-section animation descriptions with GSAP syntax hints
5. Key component styles (cards, buttons, nav items)`;

  try {
    const raw = await callClaudeSonnet(
      userMsg,
      SYSTEM,
      3000,
      undefined,
      meter
    );

    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const spec = JSON.parse(cleaned) as DesignSpec;

    await onEvent({
      type: 'log',
      data: {
        message: `🎨 Design spec: ${spec.sections?.length ?? 0} sections — ${spec.overallMood?.slice(0, 60)}`,
      },
      timestamp: new Date().toISOString(),
    });

    return spec;
  } catch (err: any) {
    // Non-fatal — build can proceed without spec (falls back to rules-only)
    await onEvent({
      type: 'log',
      data: { message: `⚠️ Design spec failed (${err?.message ?? 'parse error'}) — using rule defaults` },
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}
