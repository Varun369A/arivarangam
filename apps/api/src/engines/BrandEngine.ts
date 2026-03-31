import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeSonnet, callClaudeHaiku } from '../connectors/claude';
import { taskService } from '../services/TaskService';
import { UsageMeter } from '../services/UsageMeter';

// ─── BrandEngine ──────────────────────────────────────────────────────────────
//
// Generates a complete brand identity package:
//  - brand-guide.md      — Comprehensive brand guide (mission, voice, values, rules)
//  - colors.css          — Full color system as CSS custom properties
//  - typography.css      — Type scale with Google Fonts + fluid sizes
//  - logo.svg            — Primary SVG logo (wordmark / lettermark)
//  - logo-dark.svg       — Dark variant logo
//  - brand-preview.html  — Interactive brand style guide preview page
//  - README.md           — Setup instructions and file overview

interface FileEntry { path: string; content: string; }

interface BrandPlan {
  personality: string;
  style: 'bold' | 'minimal' | 'elegant' | 'playful' | 'corporate';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    dark: string;
    light: string;
    neutral: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  industry: string;
}

// ─── File list ────────────────────────────────────────────────────────────────

const BRAND_FILES: { path: string; description: string; language: string }[] = [
  { path: 'brand-guide.md',       description: 'Comprehensive brand guide — mission, vision, values, voice, messaging, do\'s and don\'ts',   language: 'markdown' },
  { path: 'colors.css',           description: 'CSS custom properties for full color system: brand, neutral, semantic, gradients',             language: 'css' },
  { path: 'typography.css',       description: 'CSS type scale with Google Fonts import and fluid clamp() sizes',                              language: 'css' },
  { path: 'logo.svg',             description: 'Primary SVG logo — clean wordmark or lettermark matching brand personality',                   language: 'svg' },
  { path: 'logo-dark.svg',        description: 'Dark background variant of the logo',                                                          language: 'svg' },
  { path: 'brand-preview.html',   description: 'Interactive brand style guide page showing all elements: swatches, type, buttons, cards',      language: 'html' },
  { path: 'README.md',            description: 'Setup instructions, file overview, and Google Fonts usage',                                    language: 'markdown' },
];

// ─── BrandEngine ──────────────────────────────────────────────────────────────

export class BrandEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (event: TaskEvent) => { await onEvent(event); };
    const meter = new UsageMeter();

    await prisma.task.update({ where: { id: task.id }, data: { status: 'running' } });

    try {
      await emit({ type: 'log', data: { message: '🎨 Analysing brand requirements and building identity plan...' }, timestamp: new Date().toISOString() });

      // Step 1: Plan brand identity with Haiku
      const plan = await this.planBrand(task.prompt, meter);

      await emit({
        type: 'log',
        data: { message: `✅ Brand plan ready | Style: ${plan.style} | Industry: ${plan.industry} | Fonts: ${plan.fonts.heading} / ${plan.fonts.body}` },
        timestamp: new Date().toISOString(),
      });

      // Step 2: Generate all files
      const generatedFiles: FileEntry[] = [];

      for (let i = 0; i < BRAND_FILES.length; i++) {
        const fileMeta = BRAND_FILES[i];
        await emit({
          type: 'log',
          data: { message: `🖊️ Generating ${fileMeta.path} (${i + 1}/${BRAND_FILES.length})...` },
          timestamp: new Date().toISOString(),
        });

        const content = await this.generateFile(task.prompt, fileMeta, plan, generatedFiles, meter);
        generatedFiles.push({ path: fileMeta.path, content });

        await emit({
          type: 'file_created',
          data: { path: fileMeta.path, content, language: fileMeta.language, index: i + 1, total: BRAND_FILES.length },
          timestamp: new Date().toISOString(),
        });
      }

      const creditsUsed = meter.toCredits();

      await taskService.completeTask(task.id, creditsUsed, {
        files: generatedFiles,
        brandStyle: plan.style,
        industry: plan.industry,
        colors: plan.colors,
        fonts: plan.fonts,
        fileCount: generatedFiles.length,
        usage: meter.summary(),
      });

      await emit({
        type: 'completed',
        data: {
          files: generatedFiles,
          creditsUsed,
          fileCount: generatedFiles.length,
          message: `✅ Complete brand identity package ready — ${generatedFiles.length} files | ${plan.style} ${plan.industry} brand`,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({ type: 'error', data: { message: err.message ?? 'BrandEngine failed' }, timestamp: new Date().toISOString() });
      throw err;
    }
  }

  // ─── Plan Brand ───────────────────────────────────────────────────────────────

  private async planBrand(prompt: string, meter: UsageMeter): Promise<BrandPlan> {
    const systemPrompt = `You are an expert brand strategist. Analyse the brand/company description and return ONLY valid JSON — no prose, no markdown fences:
{
  "personality": "modern tech startup",
  "style": "bold",
  "colors": {
    "primary": "#4F46E5",
    "secondary": "#7C3AED",
    "accent": "#06B6D4",
    "dark": "#0F172A",
    "light": "#F8FAFC",
    "neutral": "#64748B"
  },
  "fonts": {
    "heading": "Space Grotesk",
    "body": "DM Sans"
  },
  "industry": "SaaS / AI"
}

Rules:
- style must be one of: bold, minimal, elegant, playful, corporate
- Choose colors that perfectly match the brand personality and industry
- Font pairings must be from Google Fonts
- Recommended heading fonts: Space Grotesk, Outfit, Sora, Playfair Display, Clash Display, Cormorant Garamond
- Recommended body fonts: DM Sans, Plus Jakarta Sans, Inter, IBM Plex Sans, Jost
- Infer the industry from the prompt — be specific (e.g. "HealthTech SaaS", "Luxury Fashion", "FinTech B2B")`;

    try {
      const response = await callClaudeHaiku(prompt, systemPrompt, 512, meter);
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1) return JSON.parse(cleaned.slice(start, end + 1)) as BrandPlan;
    } catch { /* fallback below */ }

    return {
      personality: 'modern, innovative, professional',
      style: 'bold',
      colors: {
        primary: '#4F46E5',
        secondary: '#7C3AED',
        accent: '#06B6D4',
        dark: '#0F172A',
        light: '#F8FAFC',
        neutral: '#64748B',
      },
      fonts: { heading: 'Space Grotesk', body: 'DM Sans' },
      industry: 'Technology',
    };
  }

  // ─── Generate Single File ─────────────────────────────────────────────────────

  private async generateFile(
    userPrompt: string,
    fileMeta: { path: string; description: string; language: string },
    plan: BrandPlan,
    existingFiles: FileEntry[],
    meter: UsageMeter
  ): Promise<string> {

    const colorVars = `
Primary:   ${plan.colors.primary}
Secondary: ${plan.colors.secondary}
Accent:    ${plan.colors.accent}
Dark:      ${plan.colors.dark}
Light:     ${plan.colors.light}
Neutral:   ${plan.colors.neutral}`.trim();

    const fontInfo = `Heading: "${plan.fonts.heading}" | Body: "${plan.fonts.body}"`;

    // ── File-specific system prompts ──────────────────────────────────────────

    const filePrompts: Record<string, string> = {

      'brand-guide.md': `You are a professional brand identity designer producing a comprehensive brand guide document.

Brand details:
- Company/Product: ${userPrompt}
- Industry: ${plan.industry}
- Personality: ${plan.personality}
- Style: ${plan.style}
- Colors: ${colorVars}
- Fonts: ${fontInfo}

Write a 1500+ word brand guide in Markdown covering ALL of these sections:
1. **Brand Overview** — company mission statement, vision statement, core values (5-6 values with brief descriptions)
2. **Brand Personality** — character traits, emotional attributes, brand archetype (Hero / Sage / Creator / etc.)
3. **Voice & Tone** — writing style, adjectives that describe the voice, how we sound vs. how we don't sound
4. **Messaging Framework** — tagline, elevator pitch (1 sentence), value proposition, key messages for 3 audiences
5. **Color System** — rationale for primary/secondary/accent choice, cultural meaning, accessibility notes (contrast ratios)
6. **Typography** — heading/body font choice rationale, sizing rules, weight usage, line-height rules
7. **Logo Usage** — clear space rules, minimum size, placement on light/dark backgrounds, incorrect usage examples (described)
8. **Photography & Imagery Style** — mood, subject matter, filters/treatment, what to avoid
9. **Do's and Don'ts** — 6 do's and 6 don'ts with real examples
10. **Digital Application** — website, social media, email signature, favicon rules

Make it specific to ${plan.industry} — not generic. Reference the actual brand colors and fonts throughout. Output raw Markdown only.`,

      'colors.css': `You are a CSS expert specialising in design systems. Generate a complete CSS custom properties color file.

Brand colors:
${colorVars}

Requirements:
- :root block with ALL variables
- Brand color scale: --color-primary, --color-primary-50 through --color-primary-950 (tints/shades)
- Same scale for secondary and accent
- Neutral scale: --color-neutral-50 through --color-neutral-950
- Dark/Light base: --color-dark, --color-light
- Semantic colors: --color-success, --color-success-light, --color-warning, --color-warning-light, --color-error, --color-error-light, --color-info, --color-info-light
- Gradient utilities: --gradient-primary, --gradient-hero, --gradient-card, --gradient-text
- Surface colors: --surface-base, --surface-elevated, --surface-overlay
- Text colors: --text-primary, --text-secondary, --text-muted, --text-inverse
- Border colors: --border-default, --border-subtle, --border-strong
- Shadow colors with opacity variants
- Glassmorphism card: --glass-bg, --glass-border, --glass-blur

Organise with /* ── Section Header ── */ comments. Output raw CSS only — no fences.`,

      'typography.css': `You are a CSS typography expert. Generate a complete typography system CSS file.

Fonts:
- Heading: "${plan.fonts.heading}" (from Google Fonts)
- Body: "${plan.fonts.body}" (from Google Fonts)
- Mono: "JetBrains Mono" (from Google Fonts — always include for code)

Brand style: ${plan.style}

Requirements:
1. Google Fonts @import at the top — import all needed weights (heading: 400,500,600,700,800,900; body: 300,400,500,600; mono: 400,500)
2. :root block with all type tokens:
   - --font-heading, --font-body, --font-mono
   - --text-xs through --text-9xl using clamp() for fluid sizing
   - --font-weight-light (300) through --font-weight-black (900)
   - --leading-none (1) through --leading-loose (2)
   - --tracking-tighter (-0.05em) through --tracking-widest (0.25em)
3. Base element styles: html (font-size 16px), body (font-family, color, line-height), *, *::before, *::after (box-sizing)
4. Heading utility classes: .h1 through .h6 — each with fluid clamp() font-size, font-weight, letter-spacing, line-height
5. Body text classes: .body-xl, .body-lg, .body-md, .body-sm, .body-xs
6. Special classes: .display (hero headline, massive size), .caption, .overline (uppercase tracking), .label
7. Gradient text utility: .text-gradient (uses CSS var for brand gradient)
8. Prose block: .prose — max-width 72ch, optimised line-height, paragraph spacing

Use clamp(min, preferred, max) for fluid sizing on all heading sizes. Output raw CSS only — no fences.`,

      'logo.svg': `You are a professional SVG logo designer. Create a clean, scalable primary logo SVG for the following brand.

Brand: ${userPrompt}
Industry: ${plan.industry}
Style: ${plan.style}
Personality: ${plan.personality}
Primary color: ${plan.colors.primary}
Secondary color: ${plan.colors.secondary}
Accent color: ${plan.colors.accent}
Heading font: ${plan.fonts.heading}

Requirements:
- viewBox="0 0 240 60" (wide wordmark format) OR viewBox="0 0 80 80" (square lettermark) — choose based on company name length
- If wordmark: icon/symbol on the left + company name text on right
- If lettermark: stylised first letter(s) as geometric SVG shape — NO <text> elements for lettermarks
- For wordmark text: use <text> with font-family matching the brand heading font, embedded
- SVG must be self-contained — no external references
- Use the brand primary and accent colors
- Clean geometric shapes, modern design
- Include a <title> element with the company name
- Add xmlns="http://www.w3.org/2000/svg" attribute
- NO background rectangle unless part of the design
- Works on white/light backgrounds (this is the primary / light version)

Output raw SVG only — no fences, no explanation.`,

      'logo-dark.svg': `You are a professional SVG logo designer. Create the dark-background variant of this brand logo.

Brand: ${userPrompt}
Industry: ${plan.industry}
Style: ${plan.style}
Primary color: ${plan.colors.primary}
Accent color: ${plan.colors.accent}
Light color: ${plan.colors.light}

${existingFiles.find(f => f.path === 'logo.svg') ? `Primary logo (for reference):\n${existingFiles.find(f => f.path === 'logo.svg')!.content.slice(0, 1200)}` : ''}

Requirements:
- Same viewBox and composition as the primary logo
- Adapt colors for dark backgrounds: text/shapes that were dark → use light color (${plan.colors.light})
- Keep brand colors (primary, accent) as-is — they work on dark
- Add xmlns="http://www.w3.org/2000/svg" attribute
- Include a <title> element
- Self-contained, no external references
- Works on dark/black backgrounds

Output raw SVG only — no fences, no explanation.`,

      'brand-preview.html': `You are a world-class brand designer building an interactive brand style guide as a self-contained HTML page.

Brand details:
- Company/Product: ${userPrompt}
- Industry: ${plan.industry}
- Personality: ${plan.personality}
- Style: ${plan.style}
- Colors: ${colorVars}
- Fonts: ${fontInfo}

${existingFiles.length > 0 ? `Generated assets (use these values):
${existingFiles.map(f => `--- ${f.path} ---\n${f.content.slice(0, 400)}`).join('\n\n')}` : ''}

Build a stunning, interactive brand preview page that looks like a real Figma / Notion brand guideline page.

REQUIRED SECTIONS (all in one scrolling page):
1. **Hero** — Brand name large, tagline, primary + secondary color gradient background, animated in with GSAP
2. **Color Palette** — Grid of swatches for all 6 brand colors (primary, secondary, accent, dark, light, neutral) + semantic colors (success/warning/error/info). Each swatch shows: color block, name, hex value, copy-to-clipboard button
3. **Typography Specimens** — Show Display, H1, H2, H3, Body, Caption, Overline at actual sizes. Show font names. Alphabet specimen
4. **Logo Showcase** — Logo on white bg, logo on dark bg, different sizes (80px, 48px, 32px wide)
5. **Button States** — Primary, Secondary, Ghost, Destructive variants × Default/Hover/Active/Disabled states
6. **Card Examples** — 3 card styles: glassmorphism, elevated, outlined — with realistic content
7. **Form Elements** — Input fields (default, focus, error, success), select, checkbox, toggle
8. **Gradient Gallery** — All gradient tokens shown as large strips with labels
9. **Brand Voice** — 2-3 example copy snippets showing the brand voice
10. **Footer** — Brand color palette hex codes reference bar

TECHNICAL REQUIREMENTS:
- CDN: Tailwind (https://cdn.tailwindcss.com) + GSAP (https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js) + Google Fonts for ${plan.fonts.heading} and ${plan.fonts.body}
- Use CSS custom properties inline in <style> for all brand colors
- Sticky nav with section jump links
- GSAP entrance animations on scroll (IntersectionObserver-based since no ScrollTrigger CDN dependency)
- Copy-to-clipboard for hex codes (navigator.clipboard.writeText)
- Smooth scroll between sections
- Responsive: looks great on mobile AND desktop
- Self-contained — everything inline, no external files
- Dark mode toggle button in nav
- Real content matching ${plan.industry} — ZERO Lorem ipsum

Output complete HTML from <!DOCTYPE html> to </html> — raw, no fences.`,

      'README.md': `You are a technical writer. Write a clean README for a brand identity package.

Brand: ${userPrompt}
Industry: ${plan.industry}
Style: ${plan.style}
Fonts: ${fontInfo}
Colors: ${colorVars}

Write a README.md covering:
1. **Brand Identity Package** — h1 header with brand name
2. **Contents** — table listing each file and its purpose
3. **Quick Start** — how to use the CSS files (link tags, @import)
4. **Google Fonts Setup** — exact @import URL for ${plan.fonts.heading} and ${plan.fonts.body} with all weights
5. **Color Tokens** — table of all 6 brand colors with hex values
6. **Typography Scale** — table of type sizes
7. **Logo Usage** — when to use primary vs dark variant, minimum sizes, clear space
8. **Brand Voice** — 3 bullet points summarising the tone
9. **File Checklist** — checkbox list of all 7 files

Be concise and developer-friendly. Output raw Markdown only.`,
    };

    const systemPrompt = filePrompts[fileMeta.path] ?? `You are a professional brand identity designer. Generate the complete content for: ${fileMeta.description}. Brand: ${userPrompt}. Industry: ${plan.industry}. Style: ${plan.style}. Output raw file content only.`;

    const userMessage = `Brand/Company: ${userPrompt}
Industry: ${plan.industry}
Style: ${plan.style}
Personality: ${plan.personality}
Colors: ${colorVars}
Fonts: ${fontInfo}

Generate: ${fileMeta.path}`;

    const content = await callClaudeSonnet(userMessage, systemPrompt, 8192, undefined, meter);
    return this.stripFences(content, fileMeta.language);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private stripFences(text: string, _lang: string): string {
    return text
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/^```$/gm, '')
      .trim();
  }
}

export const brandEngine = new BrandEngine();
