import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeSonnet, callClaudeHaiku } from '../connectors/claude';
import { taskService } from '../services/TaskService';
import { UsageMeter } from '../services/UsageMeter';

// ─── DesignSystemEngine ───────────────────────────────────────────────────────
//
// Generates a complete design system with tokens, components, and docs:
//  - tokens/colors.json       — Full color scale + semantic tokens
//  - tokens/typography.json   — Type scale, weights, families
//  - tokens/spacing.json      — Spacing, radii, shadows, z-index
//  - styles/tokens.css        — CSS custom properties for all tokens
//  - tailwind.config.js       — Full Tailwind config extending design tokens
//  - components/Button.tsx    — Accessible React button component
//  - components/Card.tsx      — Card component with variants
//  - components/Input.tsx     — Input with states and icons
//  - components/Badge.tsx     — Badge / chip component
//  - README.md                — Full docs: tokens, component API, examples

interface FileEntry { path: string; content: string; }

interface DesignPlan {
  framework: 'react' | 'vue' | 'html';
  name: string;
  style: 'modern' | 'minimal' | 'corporate' | 'playful';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

// ─── File list ────────────────────────────────────────────────────────────────

const DS_FILES: { path: string; description: string; language: string }[] = [
  { path: 'tokens/colors.json',     description: 'Design token JSON — full color scales (50-950), semantic colors, component tokens',                  language: 'json'       },
  { path: 'tokens/typography.json', description: 'Type scale tokens — fontSize, fontWeight, lineHeight, letterSpacing, fontFamily',                     language: 'json'       },
  { path: 'tokens/spacing.json',    description: 'Spacing scale (4px base), border-radius, shadow, z-index tokens',                                     language: 'json'       },
  { path: 'styles/tokens.css',      description: 'CSS custom properties for ALL tokens, organised by category',                                          language: 'css'        },
  { path: 'tailwind.config.js',     description: 'Complete Tailwind config extending with all design tokens, custom colors, type scale, shadows',         language: 'javascript' },
  { path: 'components/Button.tsx',  description: 'React button — primary/secondary/ghost/destructive variants, sm/md/lg, loading state, icon support',   language: 'typescript' },
  { path: 'components/Card.tsx',    description: 'Card component — default/elevated/outlined variants, header/body/footer slots, hover animations',       language: 'typescript' },
  { path: 'components/Input.tsx',   description: 'Input — text/email/password/search, error/success states, label, helper text, leading/trailing icons', language: 'typescript' },
  { path: 'components/Badge.tsx',   description: 'Badge/chip — 8 color variants, sm/md sizes, dismissible option',                                       language: 'typescript' },
  { path: 'README.md',              description: 'Full docs — installation, token usage, component API tables, code examples',                             language: 'markdown'   },
];

// ─── DesignSystemEngine ───────────────────────────────────────────────────────

export class DesignSystemEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (event: TaskEvent) => { await onEvent(event); };
    const meter = new UsageMeter();

    await prisma.task.update({ where: { id: task.id }, data: { status: 'running' } });

    try {
      await emit({ type: 'log', data: { message: '🎨 Analysing design system requirements and planning tokens...' }, timestamp: new Date().toISOString() });

      // Step 1: Plan with Haiku
      const plan = await this.planDesignSystem(task.prompt, meter);

      await emit({
        type: 'log',
        data: { message: `📐 Design system plan ready | Name: "${plan.name}" | Style: ${plan.style} | Framework: ${plan.framework}` },
        timestamp: new Date().toISOString(),
      });

      // Step 2: Generate all files
      const generatedFiles: FileEntry[] = [];

      for (let i = 0; i < DS_FILES.length; i++) {
        const fileMeta = DS_FILES[i];
        await emit({
          type: 'log',
          data: { message: `⚡ Generating ${fileMeta.path} (${i + 1}/${DS_FILES.length})...` },
          timestamp: new Date().toISOString(),
        });

        const content = await this.generateFile(task.prompt, fileMeta, plan, generatedFiles, meter);
        generatedFiles.push({ path: fileMeta.path, content });

        await emit({
          type: 'file_created',
          data: { path: fileMeta.path, content, language: fileMeta.language, index: i + 1, total: DS_FILES.length },
          timestamp: new Date().toISOString(),
        });
      }

      const creditsUsed = meter.toCredits();

      await taskService.completeTask(task.id, creditsUsed, {
        files: generatedFiles,
        systemName: plan.name,
        framework: plan.framework,
        style: plan.style,
        colors: plan.colors,
        componentCount: DS_FILES.filter(f => f.path.startsWith('components/')).length,
        fileCount: generatedFiles.length,
        usage: meter.summary(),
      });

      await emit({
        type: 'completed',
        data: {
          files: generatedFiles,
          creditsUsed,
          fileCount: generatedFiles.length,
          message: `✅ Design system "${plan.name}" ready — ${generatedFiles.length} files | tokens + 4 components + Tailwind config`,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({ type: 'error', data: { message: err.message ?? 'DesignSystemEngine failed' }, timestamp: new Date().toISOString() });
      throw err;
    }
  }

  // ─── Plan Design System ───────────────────────────────────────────────────────

  private async planDesignSystem(prompt: string, meter: UsageMeter): Promise<DesignPlan> {
    const systemPrompt = `You are a design systems architect. Analyse the request and return ONLY valid JSON — no prose, no markdown fences:
{
  "framework": "react",
  "name": "Horizon UI",
  "style": "modern",
  "colors": {
    "primary": "#4F46E5",
    "secondary": "#7C3AED",
    "accent": "#06B6D4"
  }
}

Rules:
- framework: "react" (default), "vue", or "html" — infer from the prompt; default react if unspecified
- name: a short, memorable design system name derived from the brand/product (e.g. "Horizon UI", "Nova Design", "Pulse DS")
- style: "modern" (default), "minimal", "corporate", or "playful" — infer from context
- colors: choose cohesive hex values matching the brand/industry; primary should be the main brand color`;

    try {
      const response = await callClaudeHaiku(prompt, systemPrompt, 512, meter);
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1) return JSON.parse(cleaned.slice(start, end + 1)) as DesignPlan;
    } catch { /* fallback below */ }

    return {
      framework: 'react',
      name: 'Horizon UI',
      style: 'modern',
      colors: { primary: '#4F46E5', secondary: '#7C3AED', accent: '#06B6D4' },
    };
  }

  // ─── Generate Single File ─────────────────────────────────────────────────────

  private async generateFile(
    userPrompt: string,
    fileMeta: { path: string; description: string; language: string },
    plan: DesignPlan,
    existingFiles: FileEntry[],
    meter: UsageMeter
  ): Promise<string> {

    const colorInfo = `Primary: ${plan.colors.primary} | Secondary: ${plan.colors.secondary} | Accent: ${plan.colors.accent}`;
    const colorsJson = existingFiles.find(f => f.path === 'tokens/colors.json')?.content ?? '';
    const spacingJson = existingFiles.find(f => f.path === 'tokens/spacing.json')?.content ?? '';
    const typographyJson = existingFiles.find(f => f.path === 'tokens/typography.json')?.content ?? '';
    const tokensCss = existingFiles.find(f => f.path === 'styles/tokens.css')?.content ?? '';

    // ── File-specific system prompts ──────────────────────────────────────────

    const filePrompts: Record<string, string> = {

      'tokens/colors.json': `You are a design systems engineer. Generate a complete color tokens JSON file for a "${plan.style}" design system named "${plan.name}".

Brand colors: ${colorInfo}

Structure the JSON exactly like this (expand each section fully):
{
  "colors": {
    "primary": {
      "50": "#...", "100": "#...", "200": "#...", "300": "#...", "400": "#...",
      "500": "${plan.colors.primary}",
      "600": "#...", "700": "#...", "800": "#...", "900": "#...", "950": "#..."
    },
    "secondary": { "50–950 scale matching ${plan.colors.secondary}" },
    "accent": { "50–950 scale matching ${plan.colors.accent}" },
    "neutral": {
      "50": "#F8FAFC", "100": "#F1F5F9", "200": "#E2E8F0", "300": "#CBD5E1",
      "400": "#94A3B8", "500": "#64748B", "600": "#475569", "700": "#334155",
      "800": "#1E293B", "900": "#0F172A", "950": "#020617"
    },
    "semantic": {
      "success": { "default": "#10B981", "light": "#D1FAE5", "dark": "#065F46" },
      "warning": { "default": "#F59E0B", "light": "#FEF3C7", "dark": "#92400E" },
      "error":   { "default": "#EF4444", "light": "#FEE2E2", "dark": "#991B1B" },
      "info":    { "default": "#3B82F6", "light": "#DBEAFE", "dark": "#1E3A8A" }
    },
    "component": {
      "button": {
        "primary-bg": "{colors.primary.500}",
        "primary-bg-hover": "{colors.primary.600}",
        "primary-text": "#FFFFFF",
        "secondary-bg": "{colors.secondary.500}",
        "secondary-text": "#FFFFFF",
        "ghost-bg": "transparent",
        "ghost-text": "{colors.primary.600}",
        "ghost-border": "{colors.primary.300}",
        "destructive-bg": "{colors.semantic.error.default}",
        "destructive-text": "#FFFFFF"
      },
      "input": {
        "bg": "#FFFFFF",
        "border": "{colors.neutral.300}",
        "border-focus": "{colors.primary.500}",
        "border-error": "{colors.semantic.error.default}",
        "border-success": "{colors.semantic.success.default}",
        "text": "{colors.neutral.900}",
        "placeholder": "{colors.neutral.400}",
        "label": "{colors.neutral.700}"
      },
      "card": {
        "bg": "#FFFFFF",
        "bg-elevated": "#FFFFFF",
        "border": "{colors.neutral.200}",
        "shadow": "rgba(0,0,0,0.08)"
      },
      "badge": {
        "primary-bg": "{colors.primary.100}",
        "primary-text": "{colors.primary.700}",
        "secondary-bg": "{colors.secondary.100}",
        "secondary-text": "{colors.secondary.700}",
        "success-bg": "{colors.semantic.success.light}",
        "success-text": "{colors.semantic.success.dark}",
        "warning-bg": "{colors.semantic.warning.light}",
        "warning-text": "{colors.semantic.warning.dark}",
        "error-bg": "{colors.semantic.error.light}",
        "error-text": "{colors.semantic.error.dark}",
        "neutral-bg": "{colors.neutral.100}",
        "neutral-text": "{colors.neutral.700}"
      }
    }
  }
}

Generate all actual hex values (compute proper tints/shades from the base colors). Output raw JSON only — no fences.`,

      'tokens/typography.json': `You are a design systems engineer. Generate a complete typography tokens JSON file for "${plan.name}" design system.

Style: ${plan.style}

Structure:
{
  "typography": {
    "fontFamily": {
      "heading": ["Space Grotesk", "system-ui", "sans-serif"],
      "body": ["DM Sans", "system-ui", "sans-serif"],
      "mono": ["JetBrains Mono", "Menlo", "monospace"]
    },
    "fontSize": {
      "xs":   { "value": "0.75rem",  "lineHeight": "1rem" },
      "sm":   { "value": "0.875rem", "lineHeight": "1.25rem" },
      "base": { "value": "1rem",     "lineHeight": "1.5rem" },
      "lg":   { "value": "1.125rem", "lineHeight": "1.75rem" },
      "xl":   { "value": "1.25rem",  "lineHeight": "1.75rem" },
      "2xl":  { "value": "1.5rem",   "lineHeight": "2rem" },
      "3xl":  { "value": "1.875rem", "lineHeight": "2.25rem" },
      "4xl":  { "value": "2.25rem",  "lineHeight": "2.5rem" },
      "5xl":  { "value": "3rem",     "lineHeight": "1.1" },
      "6xl":  { "value": "3.75rem",  "lineHeight": "1.05" },
      "7xl":  { "value": "4.5rem",   "lineHeight": "1" },
      "8xl":  { "value": "6rem",     "lineHeight": "1" },
      "9xl":  { "value": "8rem",     "lineHeight": "1" }
    },
    "fontWeight": {
      "thin": 100, "extralight": 200, "light": 300, "regular": 400,
      "medium": 500, "semibold": 600, "bold": 700, "extrabold": 800, "black": 900
    },
    "lineHeight": {
      "none": "1", "tight": "1.25", "snug": "1.375", "normal": "1.5",
      "relaxed": "1.625", "loose": "2"
    },
    "letterSpacing": {
      "tighter": "-0.05em", "tight": "-0.025em", "normal": "0em",
      "wide": "0.025em", "wider": "0.05em", "widest": "0.1em"
    },
    "textStyle": {
      "display": { "fontSize": "clamp(3rem, 8vw, 8rem)", "fontWeight": 900, "letterSpacing": "-0.04em", "lineHeight": "0.95", "fontFamily": "heading" },
      "h1":      { "fontSize": "clamp(2.25rem, 5vw, 4.5rem)", "fontWeight": 800, "letterSpacing": "-0.03em", "lineHeight": "1.05", "fontFamily": "heading" },
      "h2":      { "fontSize": "clamp(1.875rem, 4vw, 3rem)", "fontWeight": 700, "letterSpacing": "-0.02em", "lineHeight": "1.1",  "fontFamily": "heading" },
      "h3":      { "fontSize": "clamp(1.5rem, 3vw, 2.25rem)", "fontWeight": 700, "letterSpacing": "-0.015em","lineHeight": "1.2",  "fontFamily": "heading" },
      "h4":      { "fontSize": "clamp(1.25rem, 2.5vw, 1.875rem)", "fontWeight": 600, "letterSpacing": "-0.01em","lineHeight": "1.3", "fontFamily": "heading" },
      "h5":      { "fontSize": "1.25rem", "fontWeight": 600, "letterSpacing": "-0.005em","lineHeight": "1.4", "fontFamily": "heading" },
      "h6":      { "fontSize": "1rem",    "fontWeight": 600, "letterSpacing": "0",         "lineHeight": "1.5", "fontFamily": "heading" },
      "body-xl": { "fontSize": "1.25rem", "fontWeight": 400, "lineHeight": "1.75", "fontFamily": "body" },
      "body-lg": { "fontSize": "1.125rem","fontWeight": 400, "lineHeight": "1.75", "fontFamily": "body" },
      "body-md": { "fontSize": "1rem",    "fontWeight": 400, "lineHeight": "1.625","fontFamily": "body" },
      "body-sm": { "fontSize": "0.875rem","fontWeight": 400, "lineHeight": "1.5",  "fontFamily": "body" },
      "body-xs": { "fontSize": "0.75rem", "fontWeight": 400, "lineHeight": "1.5",  "fontFamily": "body" },
      "caption":  { "fontSize": "0.75rem", "fontWeight": 500, "lineHeight": "1.5", "letterSpacing": "0.01em", "fontFamily": "body" },
      "overline": { "fontSize": "0.75rem", "fontWeight": 600, "lineHeight": "1.5", "letterSpacing": "0.08em",  "fontFamily": "body", "textTransform": "uppercase" },
      "label":    { "fontSize": "0.875rem","fontWeight": 500, "lineHeight": "1.25","letterSpacing": "0",        "fontFamily": "body" },
      "code":     { "fontSize": "0.875rem","fontWeight": 400, "lineHeight": "1.5",  "fontFamily": "mono" }
    }
  }
}

Choose appropriate Google Fonts for "${plan.style}" style:
- modern: Space Grotesk + DM Sans
- minimal: Inter + Inter (single family)
- corporate: IBM Plex Sans + IBM Plex Sans
- playful: Outfit + Plus Jakarta Sans

Output raw JSON only — no fences.`,

      'tokens/spacing.json': `You are a design systems engineer. Generate complete spacing, border-radius, shadow, and z-index tokens JSON for "${plan.name}".

Base unit: 4px (0.25rem)

Structure:
{
  "spacing": {
    "0":   "0px",
    "px":  "1px",
    "0.5": "0.125rem",
    "1":   "0.25rem",
    "1.5": "0.375rem",
    "2":   "0.5rem",
    "2.5": "0.625rem",
    "3":   "0.75rem",
    "3.5": "0.875rem",
    "4":   "1rem",
    "5":   "1.25rem",
    "6":   "1.5rem",
    "7":   "1.75rem",
    "8":   "2rem",
    "9":   "2.25rem",
    "10":  "2.5rem",
    "11":  "2.75rem",
    "12":  "3rem",
    "14":  "3.5rem",
    "16":  "4rem",
    "18":  "4.5rem",
    "20":  "5rem",
    "24":  "6rem",
    "28":  "7rem",
    "32":  "8rem",
    "36":  "9rem",
    "40":  "10rem",
    "44":  "11rem",
    "48":  "12rem",
    "52":  "13rem",
    "56":  "14rem",
    "60":  "15rem",
    "64":  "16rem",
    "72":  "18rem",
    "80":  "20rem",
    "96":  "24rem"
  },
  "borderRadius": {
    "none":  "0px",
    "sm":    "0.125rem",
    "base":  "0.25rem",
    "md":    "0.375rem",
    "lg":    "0.5rem",
    "xl":    "0.75rem",
    "2xl":   "1rem",
    "3xl":   "1.5rem",
    "4xl":   "2rem",
    "full":  "9999px"
  },
  "boxShadow": {
    "xs":    "0 1px 2px 0 rgba(0,0,0,0.05)",
    "sm":    "0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)",
    "md":    "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)",
    "lg":    "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)",
    "xl":    "0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
    "2xl":   "0 25px 50px -12px rgba(0,0,0,0.25)",
    "inner": "inset 0 2px 4px 0 rgba(0,0,0,0.06)",
    "none":  "none",
    "glow-primary":   "0 0 20px rgba(${plan.colors.primary.replace('#', '')},0.35)",
    "glow-secondary": "0 0 20px rgba(${plan.colors.secondary.replace('#', '')},0.35)",
    "glow-accent":    "0 0 20px rgba(${plan.colors.accent.replace('#', '')},0.35)"
  },
  "zIndex": {
    "auto":    "auto",
    "0":       "0",
    "10":      "10",
    "20":      "20",
    "30":      "30",
    "40":      "40",
    "50":      "50",
    "dropdown": "1000",
    "sticky":   "1100",
    "banner":   "1200",
    "overlay":  "1300",
    "modal":    "1400",
    "popover":  "1500",
    "toast":    "1700",
    "tooltip":  "1800"
  },
  "transition": {
    "duration": {
      "fast":   "150ms",
      "base":   "200ms",
      "slow":   "300ms",
      "slower": "500ms",
      "slowest":"700ms"
    },
    "easing": {
      "linear":      "linear",
      "ease":        "ease",
      "ease-in":     "cubic-bezier(0.4, 0, 1, 1)",
      "ease-out":    "cubic-bezier(0, 0, 0.2, 1)",
      "ease-in-out": "cubic-bezier(0.4, 0, 0.2, 1)",
      "spring":      "cubic-bezier(0.34, 1.56, 0.64, 1)"
    }
  }
}

Output raw JSON only — no fences.`,

      'styles/tokens.css': `You are a CSS expert specialising in design systems. Generate a complete CSS custom properties file for "${plan.name}" design system.

${colorsJson ? `Color tokens reference:\n${colorsJson.slice(0, 3000)}` : `Brand colors: ${colorInfo}`}
${typographyJson ? `\nTypography tokens reference:\n${typographyJson.slice(0, 1500)}` : ''}
${spacingJson ? `\nSpacing tokens reference:\n${spacingJson.slice(0, 1000)}` : ''}

Requirements — generate ALL of these CSS custom property groups in :root:

1. /* ── Color Tokens ── */
   All brand color scales: --color-primary-50 through --color-primary-950, same for secondary and accent
   Neutral scale: --color-neutral-50 through --color-neutral-950
   Semantic: --color-success, --color-success-light, --color-success-dark, same for warning/error/info
   Surface: --surface-base, --surface-elevated, --surface-overlay, --surface-sunken
   Text: --text-primary, --text-secondary, --text-muted, --text-disabled, --text-inverse, --text-link
   Border: --border-default, --border-subtle, --border-strong, --border-focus
   Component tokens: --btn-primary-bg, --btn-primary-text, --btn-secondary-bg, etc.
   Gradient: --gradient-primary, --gradient-secondary, --gradient-hero, --gradient-card, --gradient-text

2. /* ── Typography Tokens ── */
   --font-heading, --font-body, --font-mono
   --text-xs through --text-9xl (with clamp() for display/h1/h2/h3)
   --font-weight-thin (100) through --font-weight-black (900)
   --leading-none (1) through --leading-loose (2)
   --tracking-tighter (-0.05em) through --tracking-widest (0.1em)

3. /* ── Spacing Tokens ── */
   --space-0 through --space-96 (matching the spacing scale)
   --radius-none through --radius-full

4. /* ── Shadow Tokens ── */
   --shadow-xs through --shadow-2xl, --shadow-inner, --shadow-none
   --shadow-glow-primary, --shadow-glow-secondary, --shadow-glow-accent

5. /* ── Z-Index Tokens ── */
   --z-dropdown, --z-sticky, --z-modal, --z-popover, --z-toast, --z-tooltip

6. /* ── Transition Tokens ── */
   --duration-fast (150ms), --duration-base (200ms), --duration-slow (300ms)
   --ease-default, --ease-spring, --ease-in, --ease-out

7. Also add a .dark class block at the bottom that overrides surface/text/border tokens for dark mode

Use --color-primary-500 as the base value for --color-primary etc.
Organise every group with a clear /* ── Section Name ── */ comment.
Output raw CSS only — no fences.`,

      'tailwind.config.js': `You are a Tailwind CSS expert. Generate a complete tailwind.config.js for "${plan.name}" design system.

Brand colors: ${colorInfo}
Style: ${plan.style}

${colorsJson ? `Color tokens (use these hex values):\n${colorsJson.slice(0, 2000)}` : ''}
${typographyJson ? `\nTypography tokens:\n${typographyJson.slice(0, 1000)}` : ''}

Generate a complete /** @type {import('tailwindcss').Config} */ module.exports config that:

1. Sets content paths: ["./src/**/*.{js,ts,jsx,tsx,html}"]
2. Enables darkMode: 'class'
3. Extends theme with:
   - colors: full brand color scales (primary.50-950, secondary.50-950, accent.50-950, neutral.50-950, semantic colors)
   - fontFamily: { heading: [...], body: [...], mono: [...] }
   - fontSize: complete scale from xs to 9xl matching tokens, with [size, { lineHeight }] tuples
   - fontWeight: complete named scale
   - letterSpacing: complete scale
   - lineHeight: complete scale
   - borderRadius: complete scale (sm through 4xl + full)
   - boxShadow: complete scale including glow-primary, glow-secondary, glow-accent
   - spacing: complete 4px-base scale (matching tokens)
   - backgroundImage: { 'gradient-primary': ..., 'gradient-hero': ..., 'gradient-radial': ... }
   - transitionTimingFunction: { spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }
   - animation: { 'fade-in': ..., 'slide-up': ..., 'scale-in': ... }
   - keyframes: definitions for fade-in, slide-up, scale-in
4. Adds plugins array (empty, ready for @tailwindcss/forms etc.)

Use real hex values for all colors — compute proper tints and shades from:
Primary: ${plan.colors.primary}
Secondary: ${plan.colors.secondary}
Accent: ${plan.colors.accent}

Output raw JavaScript only — no fences.`,

      'components/Button.tsx': `You are an expert React/TypeScript component engineer using shadcn/ui patterns and Tailwind CSS.

Design system: "${plan.name}" | Style: ${plan.style}
Colors: ${colorInfo}

Generate a complete, production-ready Button component. Requirements:

VARIANTS: primary, secondary, ghost, destructive
SIZES: sm, md (default), lg
STATES: default, hover, active, disabled, loading

Full TypeScript types — define ButtonProps interface extending React.ButtonHTMLAttributes<HTMLButtonElement>:
- variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
- size?: 'sm' | 'md' | 'lg'
- isLoading?: boolean
- leftIcon?: React.ReactNode
- rightIcon?: React.ReactNode
- fullWidth?: boolean

Use a class variance authority (cva) pattern OR a clean lookup object for variant classes.

Include:
- Tailwind classes for all variants and sizes (use real colors matching ${plan.colors.primary})
- Loading spinner (inline SVG or Tailwind animate-spin div)
- Disabled state with pointer-events-none and reduced opacity
- Focus-visible ring for accessibility
- Proper aria-disabled, aria-busy attributes
- JSDoc comment on the component
- Named export: export const Button
- Default export too
- forwardRef usage for the button element

Example usage in JSDoc:
\`\`\`tsx
<Button variant="primary" size="md" isLoading={false} leftIcon={<PlusIcon />}>
  Create Project
</Button>
\`\`\`

Output raw TypeScript/TSX only — no fences.`,

      'components/Card.tsx': `You are an expert React/TypeScript component engineer using shadcn/ui patterns and Tailwind CSS.

Design system: "${plan.name}" | Style: ${plan.style}
Colors: ${colorInfo}

Generate a complete, production-ready Card component. Requirements:

VARIANTS: default, elevated, outlined
SLOTS: CardHeader, CardBody (or CardContent), CardFooter as named exports

CardProps interface:
- variant?: 'default' | 'elevated' | 'outlined'
- hoverable?: boolean (adds hover:shadow-lg + hover:-translate-y-1 transition)
- className?: string
- children: React.ReactNode

Sub-components:
- CardHeader: title prop (string) + subtitle prop (string, optional) + action slot (ReactNode, optional)
- CardBody / CardContent: padding, children
- CardFooter: border-top, children, optional align prop ('left' | 'right' | 'between')

Tailwind classes:
- default: white bg, border, rounded-xl, shadow-sm
- elevated: white bg, no border, shadow-lg, rounded-xl
- outlined: transparent bg, border-2 border-primary, rounded-xl

Hover animation: transform transition-all duration-200 ease-out
Include focus-within ring for keyboard navigation.

JSDoc on Card with usage example showing all sub-components.
All named exports + default Card export.

Output raw TypeScript/TSX only — no fences.`,

      'components/Input.tsx': `You are an expert React/TypeScript component engineer using shadcn/ui patterns and Tailwind CSS.

Design system: "${plan.name}" | Style: ${plan.style}
Colors: ${colorInfo}

Generate a complete, production-ready Input component. Requirements:

TYPES supported: text, email, password, search, number, tel, url
STATES: default, focus, error, success, disabled

InputProps interface extending React.InputHTMLAttributes<HTMLInputElement>:
- label?: string
- helperText?: string
- errorText?: string
- successText?: string
- state?: 'default' | 'error' | 'success'
- leadingIcon?: React.ReactNode
- trailingIcon?: React.ReactNode
- isLoading?: boolean (shows spinner as trailing icon)
- fullWidth?: boolean
- wrapperClassName?: string

Features:
- Animated label that floats above on focus/fill (CSS transition, not JS — use peer classes)
- OR static label above the input — choose the cleaner approach for "${plan.style}" style
- Show/hide password toggle when type="password" (eye icon as inline SVG)
- Search clear button when type="search" and value present
- Character count display if maxLength prop is passed
- Proper aria-describedby linking label, helperText, errorText
- Focus ring using brand primary color
- Error state: red border + red helper text + error icon
- Success state: green border + green helper text + checkmark icon

All icons as inline SVGs (no external icon library).
forwardRef usage.
JSDoc with usage examples.
Named export InputField + default export.

Output raw TypeScript/TSX only — no fences.`,

      'components/Badge.tsx': `You are an expert React/TypeScript component engineer using shadcn/ui patterns and Tailwind CSS.

Design system: "${plan.name}" | Style: ${plan.style}
Colors: ${colorInfo}

Generate a complete, production-ready Badge/chip component. Requirements:

COLOR VARIANTS (8): primary, secondary, accent, success, warning, error, info, neutral
SIZES: sm, md
OPTIONS: dismissible (shows × button), dot (shows colored dot before label)

BadgeProps interface:
- variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'info' | 'neutral'
- size?: 'sm' | 'md'
- dismissible?: boolean
- onDismiss?: () => void
- dot?: boolean (colored dot indicator before text)
- className?: string
- children: React.ReactNode

Tailwind classes:
- All 8 color variants using soft/pastel background + darker text (e.g. bg-primary-100 text-primary-700)
- Rounded-full pill shape
- sm: text-xs px-2 py-0.5 | md: text-sm px-2.5 py-1
- Dismiss button: × with hover:opacity-75, proper accessible aria-label

JSDoc with usage examples for each variant.
Named export Badge + default export.

Output raw TypeScript/TSX only — no fences.`,

      'README.md': `You are a technical writer specialising in design system documentation. Write a comprehensive README for "${plan.name}" design system.

Design system details:
- Name: ${plan.name}
- Framework: ${plan.framework}
- Style: ${plan.style}
- Colors: ${colorInfo}
- Request: ${userPrompt}

Write a complete README.md covering:

# ${plan.name} Design System

## Overview
Brief description of the design system, its philosophy, and target use case.

## Installation
\`\`\`bash
npm install
\`\`\`

## Files
Table with all 10 files and their purpose:
| File | Purpose |
|------|---------|
| tokens/colors.json | ... |
... (all files)

## Token Usage

### CSS Custom Properties
Show how to import styles/tokens.css and use variables:
\`\`\`html
<link rel="stylesheet" href="styles/tokens.css">
\`\`\`
\`\`\`css
.my-element { color: var(--color-primary-600); }
\`\`\`

### Tailwind Config
Show how to import tailwind.config.js

### JSON Tokens
Show how to import and use in JS/TS:
\`\`\`ts
import colors from './tokens/colors.json';
\`\`\`

## Color Palette
Table of all brand colors with hex values:
| Name | Token | Hex |
|------|-------|-----|
| Primary | --color-primary-500 | ${plan.colors.primary} |
... (include all scales)

## Typography
Table of text styles with size and usage:
| Style | Size | Usage |
|-------|------|-------|
| Display | clamp(3rem,8vw,8rem) | Hero headlines |
...

## Components

### Button
Props table with all props, types, defaults, descriptions.
Usage code example showing all variants.

### Card
Props table. Usage example with CardHeader/CardBody/CardFooter.

### Input
Props table. Usage example showing error/success states.

### Badge
Props table. Usage example showing all 8 color variants.

## Accessibility
Notes on aria attributes, focus management, keyboard navigation support.

## Dark Mode
How to enable dark mode (add .dark class to html element).

## Contributing
Brief contributing guidelines.

Output raw Markdown only.`,
    };

    const systemPrompt = filePrompts[fileMeta.path] ?? `You are an expert design systems engineer. Generate the complete content for: ${fileMeta.description}. Design system: "${plan.name}". Style: ${plan.style}. Colors: ${colorInfo}. Output raw file content only.`;

    const userMessage = `Design System: ${plan.name}
Request: ${userPrompt}
Framework: ${plan.framework}
Style: ${plan.style}
Colors: ${colorInfo}

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

export const designSystemEngine = new DesignSystemEngine();
