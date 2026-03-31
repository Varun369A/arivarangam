import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeSonnet, callClaudeHaiku } from '../connectors/claude';
import { taskService } from '../services/TaskService';
import { UsageMeter } from '../services/UsageMeter';

// ─── LogoEngine ───────────────────────────────────────────────────────────────
//
// Generates complete SVG logo packages for brands/companies:
//  - logo-primary.svg  — Full logo with icon + company name, primary colors
//  - logo-dark.svg     — Dark background variant (white/light text)
//  - logo-mark.svg     — Icon/mark only, no text (favicon/app icon quality)
//  - logo-horizontal.svg — Wide horizontal layout, name beside mark
//  - favicon.svg       — 32x32 optimised mark
//  - brand-colors.css  — CSS custom properties for the brand palette
//  - usage-guide.md    — Brand guidelines: sizes, spacing, clear space, do's & don'ts

interface FileEntry { path: string; content: string; }

type LogoStyle =
  | 'wordmark'    // Company name as primary visual element
  | 'lettermark'  // Initials / monogram mark
  | 'geometric'   // Abstract geometric shapes
  | 'abstract'    // Free-form abstract mark
  | 'monogram'    // Single or multi-letter interlocked
  | 'emblem';     // Badge / shield / crest style

interface LogoPlan {
  style: LogoStyle;
  colors: {
    primary: string;
    secondary: string;
    dark: string;
    light: string;
  };
  personality: string;
  companyName: string;
  tagline: string;
  initials: string;
}

const SVG_SYSTEM_PROMPT = `You are a world-class logo designer. Generate clean, professional SVG logos.

LOGO QUALITY RULES:
- Use viewBox="0 0 400 120" for wordmarks, "0 0 120 120" for marks
- Clean vector paths only — no raster, no embedded images
- Use <defs> with linearGradient for gradient fills
- Typography: use <text> with font-family from Google Fonts or system fonts
- Icon: geometric shapes built from <path>, <circle>, <rect>, <polygon> — no clipart
- Colors: from the brand palette provided
- ZERO placeholder boxes — every element must be intentional design
- For abstract/geometric: use mathematical precision (grid-aligned, golden ratio proportions)
- Gradient direction: 135deg (top-left to bottom-right)
- Minimum 3 anchor points for any curve — smooth bezier only
- Include title and desc elements for accessibility

Output ONLY the SVG content starting with <svg — no markdown, no explanation.`;

export class LogoEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (event: TaskEvent) => { await onEvent(event); };
    const meter = new UsageMeter();

    await prisma.task.update({ where: { id: task.id }, data: { status: 'running' } });

    try {
      await emit({ type: 'log', data: { message: '🎨 Analysing brand brief and planning logo system...' }, timestamp: new Date().toISOString() });

      const plan = await this.planLogo(task.prompt, meter);

      await emit({ type: 'log', data: { message: `✏️  Style: ${plan.style} | Personality: ${plan.personality} | Colors: ${plan.colors.primary} / ${plan.colors.secondary}` }, timestamp: new Date().toISOString() });

      const files: FileEntry[] = [];
      const totalFiles = 7;

      // 1. logo-primary.svg
      await emit({ type: 'log', data: { message: '🖋  Designing primary logo (icon + wordmark)...' }, timestamp: new Date().toISOString() });
      const primarySvg = await this.generateSvg('primary', task.prompt, plan, meter);
      files.push({ path: 'logo-primary.svg', content: primarySvg });
      await emit({ type: 'file_created', data: { path: 'logo-primary.svg', content: primarySvg, language: 'svg', index: 1, total: totalFiles }, timestamp: new Date().toISOString() });

      // 2. logo-dark.svg
      await emit({ type: 'log', data: { message: '🌑  Designing dark-background variant...' }, timestamp: new Date().toISOString() });
      const darkSvg = await this.generateSvg('dark', task.prompt, plan, meter);
      files.push({ path: 'logo-dark.svg', content: darkSvg });
      await emit({ type: 'file_created', data: { path: 'logo-dark.svg', content: darkSvg, language: 'svg', index: 2, total: totalFiles }, timestamp: new Date().toISOString() });

      // 3. logo-mark.svg
      await emit({ type: 'log', data: { message: '🔷  Designing standalone mark / icon...' }, timestamp: new Date().toISOString() });
      const markSvg = await this.generateSvg('mark', task.prompt, plan, meter);
      files.push({ path: 'logo-mark.svg', content: markSvg });
      await emit({ type: 'file_created', data: { path: 'logo-mark.svg', content: markSvg, language: 'svg', index: 3, total: totalFiles }, timestamp: new Date().toISOString() });

      // 4. logo-horizontal.svg
      await emit({ type: 'log', data: { message: '↔️   Designing horizontal lockup...' }, timestamp: new Date().toISOString() });
      const horizontalSvg = await this.generateSvg('horizontal', task.prompt, plan, meter);
      files.push({ path: 'logo-horizontal.svg', content: horizontalSvg });
      await emit({ type: 'file_created', data: { path: 'logo-horizontal.svg', content: horizontalSvg, language: 'svg', index: 4, total: totalFiles }, timestamp: new Date().toISOString() });

      // 5. favicon.svg
      await emit({ type: 'log', data: { message: '📌  Designing 32×32 favicon mark...' }, timestamp: new Date().toISOString() });
      const faviconSvg = await this.generateSvg('favicon', task.prompt, plan, meter);
      files.push({ path: 'favicon.svg', content: faviconSvg });
      await emit({ type: 'file_created', data: { path: 'favicon.svg', content: faviconSvg, language: 'svg', index: 5, total: totalFiles }, timestamp: new Date().toISOString() });

      // 6. brand-colors.css
      await emit({ type: 'log', data: { message: '🎨  Generating brand color CSS tokens...' }, timestamp: new Date().toISOString() });
      const colorsCss = this.buildBrandColorsCss(plan);
      files.push({ path: 'brand-colors.css', content: colorsCss });
      await emit({ type: 'file_created', data: { path: 'brand-colors.css', content: colorsCss, language: 'css', index: 6, total: totalFiles }, timestamp: new Date().toISOString() });

      // 7. usage-guide.md
      await emit({ type: 'log', data: { message: '📖  Writing brand usage guidelines...' }, timestamp: new Date().toISOString() });
      const usageGuide = await this.generateUsageGuide(task.prompt, plan, meter);
      files.push({ path: 'usage-guide.md', content: usageGuide });
      await emit({ type: 'file_created', data: { path: 'usage-guide.md', content: usageGuide, language: 'markdown', index: 7, total: totalFiles }, timestamp: new Date().toISOString() });

      const creditsUsed = meter.toCredits();
      await taskService.completeTask(task.id, creditsUsed, {
        files,
        style: plan.style,
        personality: plan.personality,
        colors: plan.colors,
        companyName: plan.companyName,
        fileCount: files.length,
        usage: meter.summary(),
      });

      await emit({
        type: 'completed',
        data: { files, creditsUsed, message: `✅ Logo package ready — ${files.length} brand assets for ${plan.companyName}` },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({ type: 'error', data: { message: err.message ?? 'LogoEngine failed' }, timestamp: new Date().toISOString() });
      throw err;
    }
  }

  // ─── Plan Logo ────────────────────────────────────────────────────────────────

  private async planLogo(prompt: string, meter: UsageMeter): Promise<LogoPlan> {
    const systemPrompt = `You are a brand strategist and creative director. Analyse the brief and return ONLY valid JSON:
{
  "style": "geometric",
  "colors": {
    "primary": "#6366F1",
    "secondary": "#8B5CF6",
    "dark": "#0F0A1E",
    "light": "#F5F3FF"
  },
  "personality": "modern tech startup",
  "companyName": "Acme Corp",
  "tagline": "Build better, faster",
  "initials": "AC"
}

Style selection:
- wordmark: company name is distinctive enough to stand alone (Google, FedEx style)
- lettermark: initials form a strong mark (IBM, HP, CNN style)
- geometric: clean geometric shapes form the icon (Airbnb, Target style)
- abstract: free-form abstract mark communicates feeling (Nike, Pepsi style)
- monogram: interlocked letters (Chanel, LV style) — use for luxury/fashion
- emblem: badge or crest (Starbucks, Harley style) — use for heritage/trust brands

Color guidance:
- primary: dominant brand color (used on white backgrounds)
- secondary: accent / complementary (used in gradients, highlights)
- dark: deep version for dark-mode backgrounds (near black with color hue)
- light: very light tint for backgrounds / reversed text

Return ONLY the JSON object — no markdown, no explanation.`;

    try {
      const response = await callClaudeHaiku(prompt, systemPrompt, 512, meter);
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1) return JSON.parse(cleaned.slice(start, end + 1));
    } catch { /* fallback below */ }

    return {
      style: 'geometric',
      colors: { primary: '#6366F1', secondary: '#8B5CF6', dark: '#0F0A1E', light: '#F5F3FF' },
      personality: 'modern tech startup',
      companyName: 'Brand',
      tagline: '',
      initials: 'BR',
    };
  }

  // ─── Generate SVG ─────────────────────────────────────────────────────────────

  private async generateSvg(
    variant: 'primary' | 'dark' | 'mark' | 'horizontal' | 'favicon',
    userPrompt: string,
    plan: LogoPlan,
    meter: UsageMeter
  ): Promise<string> {
    const variantInstructions: Record<typeof variant, string> = {
      primary: `PRIMARY LOGO — full lockup, icon above or to the left of the company name.
- viewBox="0 0 400 120"
- Icon on left side, company name + optional tagline on right
- Use ${plan.colors.primary} as primary fill, ${plan.colors.secondary} as accent
- Background: transparent (no rect background)
- Text: company name in bold modern sans-serif, tagline in lighter weight
- The icon must reflect the brand personality: ${plan.personality}`,

      dark: `DARK VARIANT — identical design to primary but optimised for dark backgrounds.
- viewBox="0 0 400 120"
- Same icon geometry as the primary logo
- Icon fill: white or ${plan.colors.light} — gradient from ${plan.colors.primary} to ${plan.colors.secondary} is acceptable
- Company name: ${plan.colors.light} (near white)
- Background: transparent (caller places on dark surface)
- DO NOT add a dark background rectangle`,

      mark: `LOGO MARK — icon only, no company name text.
- viewBox="0 0 120 120"
- The icon is the complete artwork — make it work as a standalone app icon
- Geometric precision: centred, balanced, with clear visual weight
- Use gradient from ${plan.colors.primary} to ${plan.colors.secondary} (linearGradient, 135deg)
- Should read clearly at both 512px and 32px
- Style: ${plan.style} | Personality: ${plan.personality}`,

      horizontal: `HORIZONTAL LOCKUP — mark on left, name on right, all on one line.
- viewBox="0 0 480 80"
- Icon height: 60px, vertically centred
- Company name beside icon, vertically centred — same baseline
- Generous but not excessive spacing between icon and text (≈1× icon width)
- Tagline below company name if provided: "${plan.tagline}"
- Colors: ${plan.colors.primary} icon, matching text treatment`,

      favicon: `FAVICON — tiny 32×32 mark, must read at small sizes.
- viewBox="0 0 32 32"
- ONLY the core icon element — absolutely no text
- Simplified geometry: 2–4 shapes maximum
- Thick strokes (≥2px) or filled shapes — no hairlines
- Solid or 2-stop gradient fill: ${plan.colors.primary} → ${plan.colors.secondary}
- Rounded corners (rx/ry ≈ 4–6) for friendliness if appropriate`,
    };

    const userMessage = `Brand brief: ${userPrompt}

Company name: ${plan.companyName}
Initials: ${plan.initials}
Style: ${plan.style}
Personality: ${plan.personality}
Tagline: ${plan.tagline}

Brand colors:
- Primary:   ${plan.colors.primary}
- Secondary: ${plan.colors.secondary}
- Dark:      ${plan.colors.dark}
- Light:     ${plan.colors.light}

VARIANT: ${variant.toUpperCase()}
${variantInstructions[variant]}`;

    try {
      const raw = await callClaudeSonnet(userMessage, SVG_SYSTEM_PROMPT, 8192, undefined, meter);
      // Strip any accidental markdown fences
      const cleaned = raw.replace(/^```[\w]*\n?/gm, '').replace(/```\s*$/gm, '').trim();
      const svgStart = cleaned.indexOf('<svg');
      if (svgStart !== -1) return cleaned.slice(svgStart);
      return cleaned;
    } catch {
      // Minimal fallback SVG so the engine never hard-fails
      return this.fallbackSvg(variant, plan);
    }
  }

  // ─── Brand Colors CSS ─────────────────────────────────────────────────────────

  private buildBrandColorsCss(plan: LogoPlan): string {
    const { primary, secondary, dark, light } = plan.colors;

    // Derive semi-transparent versions
    const primaryRgb = this.hexToRgb(primary);
    const secondaryRgb = this.hexToRgb(secondary);
    const primaryAlpha = primaryRgb ? `rgba(${primaryRgb}, 0.15)` : `${primary}26`;
    const secondaryAlpha = secondaryRgb ? `rgba(${secondaryRgb}, 0.15)` : `${secondary}26`;

    return `/* ─── ${plan.companyName} Brand Color Tokens ─────────────────────────────── */
/* Generated by Arrivarangam Logo Engine                                       */
/* Personality: ${plan.personality}                                             */

:root {
  /* ── Core Brand Colors ─────────────────────────────────────────────────── */
  --color-primary:            ${primary};
  --color-secondary:          ${secondary};
  --color-dark:               ${dark};
  --color-light:              ${light};

  /* ── Gradient ──────────────────────────────────────────────────────────── */
  --gradient-brand:           linear-gradient(135deg, ${primary} 0%, ${secondary} 100%);
  --gradient-brand-vertical:  linear-gradient(180deg, ${primary} 0%, ${secondary} 100%);
  --gradient-brand-radial:    radial-gradient(circle at 30% 30%, ${secondary}, ${primary});

  /* ── Alpha / Tint Variants ─────────────────────────────────────────────── */
  --color-primary-alpha:      ${primaryAlpha};
  --color-secondary-alpha:    ${secondaryAlpha};
  --color-primary-10:         ${primary}1A;
  --color-primary-20:         ${primary}33;
  --color-primary-50:         ${primary}80;
  --color-secondary-10:       ${secondary}1A;
  --color-secondary-50:       ${secondary}80;

  /* ── Text on Brand ─────────────────────────────────────────────────────── */
  --color-on-primary:         ${light};
  --color-on-dark:            ${light};
  --color-on-light:           ${dark};

  /* ── Surface Tints ─────────────────────────────────────────────────────── */
  --color-surface-brand:      ${primary}0D;
  --color-border-brand:       ${primary}33;

  /* ── Shadow ────────────────────────────────────────────────────────────── */
  --shadow-brand:             0 4px 24px ${primary}40;
  --shadow-brand-lg:          0 8px 48px ${primary}33;
}

/* ─── Utility Classes ───────────────────────────────────────────────────────── */

.brand-bg-primary    { background-color: var(--color-primary); }
.brand-bg-secondary  { background-color: var(--color-secondary); }
.brand-bg-dark       { background-color: var(--color-dark); }
.brand-bg-light      { background-color: var(--color-light); }
.brand-bg-gradient   { background: var(--gradient-brand); }

.brand-text-primary  { color: var(--color-primary); }
.brand-text-secondary{ color: var(--color-secondary); }
.brand-text-on-dark  { color: var(--color-on-dark); }

.brand-border        { border: 1px solid var(--color-border-brand); }
.brand-shadow        { box-shadow: var(--shadow-brand); }

.brand-gradient-text {
  background: var(--gradient-brand);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.brand-button {
  background: var(--gradient-brand);
  color: var(--color-on-primary);
  border: none;
  border-radius: 8px;
  padding: 0.6em 1.4em;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-brand);
  transition: opacity 0.2s, transform 0.15s;
}
.brand-button:hover  { opacity: 0.92; transform: translateY(-1px); }
.brand-button:active { transform: translateY(0); }
`;
  }

  // ─── Usage Guide ──────────────────────────────────────────────────────────────

  private async generateUsageGuide(
    userPrompt: string,
    plan: LogoPlan,
    meter: UsageMeter
  ): Promise<string> {
    const systemPrompt = `You are a brand identity specialist. Write a concise, professional brand usage guide in Markdown.

Cover:
1. Logo variants and when to use each
2. Minimum sizes (digital and print)
3. Clear space rule (use X = height of logo mark)
4. Color usage — approved combinations only
5. Typography pairing recommendations
6. Do's and Don'ts (at least 5 of each, with concrete examples)
7. Incorrect usage examples described in text

Tone: Professional, clear, specific. Use tables where helpful.
Output: Raw Markdown only, no fences.`;

    const userMessage = `Brand: ${plan.companyName}
Style: ${plan.style}
Personality: ${plan.personality}
Colors: Primary ${plan.colors.primary} | Secondary ${plan.colors.secondary} | Dark ${plan.colors.dark} | Light ${plan.colors.light}
Tagline: ${plan.tagline}
Brief: ${userPrompt}

Files in this package:
- logo-primary.svg — full lockup (icon + name), for use on white/light backgrounds
- logo-dark.svg — full lockup reversed for dark backgrounds
- logo-mark.svg — icon only, for app icons, favicons, social avatars
- logo-horizontal.svg — horizontal lockup for headers and nav bars
- favicon.svg — 32×32 favicon-optimised mark
- brand-colors.css — CSS custom properties
- usage-guide.md — this file`;

    try {
      const raw = await callClaudeSonnet(userMessage, systemPrompt, 8192, undefined, meter);
      return raw.replace(/^```[\w]*\n?/gm, '').replace(/```\s*$/gm, '').trim();
    } catch {
      return this.fallbackUsageGuide(plan);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private hexToRgb(hex: string): string | null {
    const clean = hex.replace('#', '');
    if (clean.length !== 6) return null;
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  private fallbackSvg(variant: 'primary' | 'dark' | 'mark' | 'horizontal' | 'favicon', plan: LogoPlan): string {
    const { primary, secondary, light } = plan.colors;
    if (variant === 'favicon') {
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>${plan.companyName} Favicon</title>
  <desc>${plan.companyName} brand mark, small format</desc>
  <defs>
    <linearGradient id="fg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${secondary}"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="6" fill="url(#fg)"/>
  <text x="16" y="22" text-anchor="middle" font-family="system-ui,sans-serif" font-size="16" font-weight="700" fill="${light}">${plan.initials.slice(0, 2)}</text>
</svg>`;
    }

    const vb = (variant === 'mark') ? '0 0 120 120'
              : (variant === 'horizontal') ? '0 0 480 80'
              : '0 0 400 120';
    const isOnDark = variant === 'dark';
    const textFill = isOnDark ? light : plan.colors.dark;

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">
  <title>${plan.companyName} Logo</title>
  <desc>${plan.companyName} — ${plan.personality}</desc>
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${secondary}"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="40" fill="url(#grad)"/>
  <text x="60" y="67" text-anchor="middle" font-family="system-ui,sans-serif" font-size="24" font-weight="700" fill="${light}">${plan.initials}</text>
  ${variant !== 'mark' ? `<text x="130" y="55" font-family="system-ui,sans-serif" font-size="28" font-weight="700" fill="${textFill}">${plan.companyName}</text>` : ''}
  ${variant !== 'mark' && plan.tagline ? `<text x="130" y="78" font-family="system-ui,sans-serif" font-size="13" font-weight="400" fill="${textFill}" opacity="0.7">${plan.tagline}</text>` : ''}
</svg>`;
  }

  private fallbackUsageGuide(plan: LogoPlan): string {
    return `# ${plan.companyName} Brand Usage Guide

## Logo Files

| File | Use case |
|------|----------|
| logo-primary.svg | Default — use on white or light backgrounds |
| logo-dark.svg | Use on dark or coloured backgrounds |
| logo-mark.svg | App icon, social media avatar, embossed marks |
| logo-horizontal.svg | Navigation bars, email headers, wide formats |
| favicon.svg | Browser tab, PWA icon |

## Minimum Sizes

- **Digital:** 120px wide (full lockup), 32px (mark only)
- **Print:** 30mm wide (full lockup), 8mm (mark only)

## Clear Space

Always maintain a clear space equal to the height of the logo mark on all four sides. Never crowd the logo with other elements.

## Approved Color Combinations

- Primary logo on white / light grey (#FFFFFF, #F8FAFC)
- Dark logo on ${plan.colors.dark} or dark photography
- Mark only in ${plan.colors.primary} on white
- All-white version on ${plan.colors.primary} or ${plan.colors.secondary} backgrounds

## Typography Pairing

- **Headlines:** Use the same weight/family as the wordmark
- **Body:** System UI sans-serif stack for digital; match weight contrast

## Do's

- Use the provided SVG files at any scale — they are fully vector
- Maintain the correct colour variant for the background
- Keep clear space around all logo placements
- Use brand-colors.css tokens for consistent colour throughout the UI
- Prefer the horizontal lockup in navigation and email headers

## Don'ts

- Do not stretch, skew, or distort the logo in any dimension
- Do not recolour the logo outside the approved palette
- Do not place the primary logo on a dark or busy background — use logo-dark.svg
- Do not add drop shadows, outlines, or effects to the SVG
- Do not recreate or redraw the logo — always use the supplied files
- Do not place any element inside the clear space zone
- Do not display the full wordmark below 120px wide

## Incorrect Usage Examples

1. **Stretching** — scaling width and height by different amounts distorts the mark
2. **Wrong variant** — using logo-primary.svg on a dark hero section makes text illegible
3. **Colour override** — changing primary to an off-brand colour breaks visual consistency
4. **No clear space** — placing the logo flush against a nav border or image edge
5. **Low resolution export** — exporting the SVG as a tiny PNG and then scaling it up
`;
  }
}
