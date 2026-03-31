import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeSonnet, callClaudeHaiku } from '../connectors/claude';
import { taskService } from '../services/TaskService';
import { UsageMeter } from '../services/UsageMeter';

// ─── BannerEngine ─────────────────────────────────────────────────────────────
//
// Generates a complete social media banner kit — 8 files at exact platform dims:
//  - facebook-1200x630.html         — Facebook / OpenGraph banner
//  - instagram-1080x1080.html       — Instagram square post
//  - instagram-story-1080x1920.html — Instagram story (portrait)
//  - linkedin-1200x627.html         — LinkedIn article / share banner
//  - twitter-1600x900.html          — Twitter / X banner
//  - youtube-1280x720.html          — YouTube thumbnail
//  - google-300x250.html            — Google Display medium rectangle
//  - README.md                      — Screenshot / export instructions
//
// All HTML files: self-contained, GSAP entrance animation, exact pixel dims,
// Tailwind CDN utilities, Google Fonts typography.

interface FileEntry { path: string; content: string; }

type BannerStyle =
  | 'gradient'       // Bold colour gradient background
  | 'glassmorphism'  // Frosted glass cards on gradient bg
  | 'bold-type'      // Typography-first, minimal graphic elements
  | 'geometric'      // Geometric shapes / patterns as design element
  | 'neon'           // Dark bg, neon glow accents
  | 'minimal'        // White / clean, generous whitespace
  | 'photo-overlay'; // Dark overlay on abstract background shape

interface BannerPlan {
  style: BannerStyle;
  theme: 'dark' | 'light';
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  message: string;
  subline: string;
  cta: string;
  brand: string;
}

interface BannerSpec {
  filename: string;
  width: number;
  height: number;
  platform: string;
  notes: string;
}

const BANNER_SPECS: BannerSpec[] = [
  { filename: 'facebook-1200x630.html',         width: 1200, height: 630,  platform: 'Facebook / OpenGraph',    notes: 'Used for link previews and Facebook posts' },
  { filename: 'instagram-1080x1080.html',       width: 1080, height: 1080, platform: 'Instagram Square Post',   notes: 'Standard Instagram feed post, 1:1 ratio' },
  { filename: 'instagram-story-1080x1920.html', width: 1080, height: 1920, platform: 'Instagram Story',         notes: '9:16 portrait — full-screen story / reel cover' },
  { filename: 'linkedin-1200x627.html',         width: 1200, height: 627,  platform: 'LinkedIn',                notes: 'Article banner and shared link preview' },
  { filename: 'twitter-1600x900.html',          width: 1600, height: 900,  platform: 'Twitter / X',             notes: '16:9 — used for summary card with large image' },
  { filename: 'youtube-1280x720.html',          width: 1280, height: 720,  platform: 'YouTube Thumbnail',       notes: '16:9 thumbnail — must be legible at 320px wide' },
  { filename: 'google-300x250.html',            width: 300,  height: 250,  platform: 'Google Display',          notes: 'Medium rectangle — most common display ad unit' },
];

const BANNER_SYSTEM_PROMPT = `You are a world-class banner/ad designer. Generate stunning HTML banners.

BANNER RULES:
- Exact dimensions ONLY via inline style on html and body — no viewport meta tricks
- Use GSAP CDN: https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js
- Tailwind CDN for utilities
- Google Fonts for typography
- NO external images — use CSS gradients, shapes, geometric elements
- Real headline + subline from the user's brief
- High contrast — legible at thumbnail size
- The design must match the style parameter exactly
Output ONLY complete HTML from <!DOCTYPE html> to </html>.`;

export class BannerEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (event: TaskEvent) => { await onEvent(event); };
    const meter = new UsageMeter();

    await prisma.task.update({ where: { id: task.id }, data: { status: 'running' } });

    try {
      await emit({ type: 'log', data: { message: '🎯 Analysing brief and planning banner style...' }, timestamp: new Date().toISOString() });

      const plan = await this.planBanners(task.prompt, meter);

      await emit({ type: 'log', data: { message: `🎨 Style: ${plan.style} | Theme: ${plan.theme} | Headline: "${plan.message}"` }, timestamp: new Date().toISOString() });

      const files: FileEntry[] = [];
      const totalFiles = BANNER_SPECS.length + 1; // +1 for README

      // Generate each platform banner
      for (let i = 0; i < BANNER_SPECS.length; i++) {
        const spec = BANNER_SPECS[i];
        await emit({ type: 'log', data: { message: `⚡ Designing ${spec.platform} banner (${spec.width}×${spec.height})...` }, timestamp: new Date().toISOString() });

        const html = await this.generateBanner(task.prompt, spec, plan, meter);
        files.push({ path: spec.filename, content: html });

        await emit({
          type: 'file_created',
          data: { path: spec.filename, content: html, language: 'html', index: i + 1, total: totalFiles },
          timestamp: new Date().toISOString(),
        });
      }

      // README
      await emit({ type: 'log', data: { message: '📄 Writing export instructions...' }, timestamp: new Date().toISOString() });
      const readme = this.buildReadme(plan, BANNER_SPECS);
      files.push({ path: 'README.md', content: readme });
      await emit({
        type: 'file_created',
        data: { path: 'README.md', content: readme, language: 'markdown', index: totalFiles, total: totalFiles },
        timestamp: new Date().toISOString(),
      });

      const creditsUsed = meter.toCredits();
      await taskService.completeTask(task.id, creditsUsed, {
        files,
        style: plan.style,
        theme: plan.theme,
        colors: plan.colors,
        message: plan.message,
        platforms: BANNER_SPECS.map(s => s.platform),
        fileCount: files.length,
        usage: meter.summary(),
      });

      await emit({
        type: 'completed',
        data: { files, creditsUsed, message: `✅ Banner kit ready — ${BANNER_SPECS.length} platform banners generated` },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({ type: 'error', data: { message: err.message ?? 'BannerEngine failed' }, timestamp: new Date().toISOString() });
      throw err;
    }
  }

  // ─── Plan Banners ─────────────────────────────────────────────────────────────

  private async planBanners(prompt: string, meter: UsageMeter): Promise<BannerPlan> {
    const systemPrompt = `You are a creative director and social media design expert. Analyse the brief and return ONLY valid JSON:
{
  "style": "gradient",
  "theme": "dark",
  "colors": {
    "primary": "#6366F1",
    "secondary": "#8B5CF6",
    "accent": "#F59E0B"
  },
  "message": "Launch your product to the world",
  "subline": "Everything you need, nothing you don't",
  "cta": "Get Started Free",
  "brand": "Acme Corp"
}

Style selection:
- gradient: vibrant linear/radial gradient background, bold white text — high energy, SaaS / consumer apps
- glassmorphism: frosted glass card on gradient bg, elegant — fintech, productivity tools
- bold-type: typography is the hero, minimal graphic elements — editorial, agencies, publishers
- geometric: abstract geometric shapes as background pattern — tech, engineering, data companies
- neon: dark background, neon/glowing accent colours — gaming, crypto, nightlife, entertainment
- minimal: white or very light background, generous whitespace, refined — luxury, design studios
- photo-overlay: dark gradient overlay on abstract background shape — travel, lifestyle, events

message: extract the core headline from the brief (max 8 words, punchy)
subline: supporting copy (max 12 words)
cta: call-to-action button text
brand: company/product name from the brief (or infer from context)

Return ONLY the JSON object.`;

    try {
      const response = await callClaudeHaiku(prompt, systemPrompt, 512, meter);
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1) return JSON.parse(cleaned.slice(start, end + 1));
    } catch { /* fallback below */ }

    return {
      style: 'gradient',
      theme: 'dark',
      colors: { primary: '#6366F1', secondary: '#8B5CF6', accent: '#F59E0B' },
      message: 'Launch Something Amazing',
      subline: 'Built for teams that move fast',
      cta: 'Get Started',
      brand: 'Brand',
    };
  }

  // ─── Generate Banner ──────────────────────────────────────────────────────────

  private async generateBanner(
    userPrompt: string,
    spec: BannerSpec,
    plan: BannerPlan,
    meter: UsageMeter
  ): Promise<string> {
    const styleGuide = this.getStyleGuide(plan);
    const isSmall = spec.width <= 300;
    const isStory = spec.height > spec.width; // portrait

    const userMessage = `Create a ${spec.platform} banner at EXACTLY ${spec.width}×${spec.height}px.

Brief: ${userPrompt}

Brand: ${plan.brand}
Headline: "${plan.message}"
Subline: "${plan.subline}"
CTA: "${plan.cta}"

Design System:
- Style: ${plan.style}
- Theme: ${plan.theme}
- Primary color:   ${plan.colors.primary}
- Secondary color: ${plan.colors.secondary}
- Accent color:    ${plan.colors.accent}

${styleGuide}

DIMENSIONS: ${spec.width}px × ${spec.height}px
Set on BOTH <html> and <body>:
  style="width:${spec.width}px;height:${spec.height}px;overflow:hidden;margin:0;padding:0"

LAYOUT NOTES for this size:
${isSmall ? `- Small ad unit (300×250): compact layout, no subline, large CTA button, headline max 3 words
- Font sizes: headline 22–26px, brand 12px, CTA 14px
- Minimal decoration — one gradient shape, badge-style CTA` : ''}
${isStory ? `- Portrait story format: stack elements vertically, centred
- Large headline (60–80px), generous vertical spacing
- Brand name at top, headline in middle, CTA at bottom third
- Decorative geometric accent element in background` : ''}
${!isSmall && !isStory ? `- Landscape/square: balance text left or centre, decoration right or as background
- Headline: ${spec.width >= 1200 ? '52–72' : '36–48'}px bold
- Subline below headline, CTA button below subline` : ''}

REQUIRED HEAD TAGS:
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=DM+Sans:wght@400;700;900&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>

GSAP ENTRANCE (in a <script> at bottom of body):
gsap.from('body > *', { opacity: 0, y: 20, duration: 0.8, stagger: 0.1, ease: 'power2.out' });

Output ONLY the complete HTML from <!DOCTYPE html> to </html>.`;

    try {
      const raw = await callClaudeSonnet(userMessage, BANNER_SYSTEM_PROMPT, 8192, undefined, meter);
      const cleaned = raw.replace(/^```[\w]*\n?/gm, '').replace(/```\s*$/gm, '').trim();
      const htmlStart = cleaned.indexOf('<!DOCTYPE');
      if (htmlStart !== -1) return cleaned.slice(htmlStart);
      const htmlTagStart = cleaned.indexOf('<html');
      if (htmlTagStart !== -1) return cleaned.slice(htmlTagStart);
      return cleaned;
    } catch {
      return this.fallbackBanner(spec, plan);
    }
  }

  // ─── Style Guide ──────────────────────────────────────────────────────────────

  private getStyleGuide(plan: BannerPlan): string {
    const { primary, secondary, accent } = plan.colors;

    const guides: Record<BannerStyle, string> = {
      gradient: `GRADIENT STYLE:
- Background: linear-gradient(135deg, ${primary} 0%, ${secondary} 50%, ${accent}33 100%)
- Optional: large soft radial glow blob (opacity 0.3) as bg accent
- Text: white (#FFFFFF) throughout — headline bold, subline regular
- CTA button: white bg, ${primary} text — pill shape (border-radius: 100px)
- Decorative: 2–3 translucent circles or blur blobs in corners`,

      glassmorphism: `GLASSMORPHISM STYLE:
- Background: gradient ${primary} to ${secondary}
- Main content card: background rgba(255,255,255,0.08); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.15); border-radius:24px
- Text: white — headline heavy weight, subline lighter opacity (0.8)
- CTA: solid white pill button, ${primary} text
- Decorative: frosted glass secondary card in background, rotated 8deg`,

      'bold-type': `BOLD-TYPE STYLE:
- Background: ${plan.theme === 'dark' ? '#0A0A0A' : '#FFFFFF'}
- Typography IS the design — headline at maximum size, broken across lines deliberately
- Accent: one ${accent} underline or highlight on a key word
- Body text: ${plan.theme === 'dark' ? '#E5E5E5' : '#111111'}
- CTA: outlined button with ${primary} border and text, hover fill ${primary}
- Decoration: single bold ${primary} geometric line or dot grid — nothing more`,

      geometric: `GEOMETRIC STYLE:
- Background: ${plan.theme === 'dark' ? '#0D0D1A' : '#F8F9FF'}
- Geometric elements: hexagons, triangles, or grid lines in ${primary}22 as bg texture
- Large accent shape: filled polygon/circle in ${primary} (25% opacity) — off-canvas, cropped
- Text: ${plan.theme === 'dark' ? '#FFFFFF' : '#111111'} — headline gradient text ${primary}→${secondary}
- CTA: gradient pill button ${primary}→${secondary}
- Precise grid alignment for all elements`,

      neon: `NEON STYLE:
- Background: #050510 (near black with blue tint)
- Text: white, headline with neon text-shadow: 0 0 20px ${primary}, 0 0 40px ${primary}66
- Accent line: 2px solid ${accent} with glow: 0 0 10px ${accent}, 0 0 30px ${accent}88
- CTA button: border 2px solid ${primary}, bg transparent, text ${primary}, glowing shadow
- Decorative: scanline overlay (repeating-linear-gradient thin lines, 2% opacity)
- Color pops: ${accent} on key word or icon, pure neon feel`,

      minimal: `MINIMAL STYLE:
- Background: ${plan.theme === 'light' ? '#FFFFFF' : '#F9F9F9'}
- Typography: clean sans-serif, headline #111111, subline #666666
- Accent: single ${primary} element — thin rule, small icon, or coloured initial letter
- CTA: ${primary} filled pill, white text
- Whitespace: very generous — content centred with large margins
- NO busy backgrounds — maximum 1 small decorative element`,

      'photo-overlay': `PHOTO-OVERLAY STYLE:
- Background: dark abstract shape (large SVG blob) filled with gradient ${primary}→${secondary}, on ${plan.theme === 'dark' ? '#07070E' : '#1A1A2E'} bg
- Semi-transparent overlay: radial gradient from transparent to rgba(0,0,0,0.6) on top
- Text: white throughout, headline with strong contrast
- CTA: solid white pill, ${primary} text
- Decorative: scattered small geometric shapes (circles, dots) in ${accent}44 overlay`,
    };

    return guides[plan.style] ?? guides['gradient'];
  }

  // ─── Fallback Banner ──────────────────────────────────────────────────────────

  private fallbackBanner(spec: BannerSpec, plan: BannerPlan): string {
    const { primary, secondary, accent } = plan.colors;
    const isSmall = spec.width <= 300;
    const headlineSize = isSmall ? '22px' : spec.height > spec.width ? '64px' : '48px';

    return `<!DOCTYPE html>
<html style="width:${spec.width}px;height:${spec.height}px;overflow:hidden;margin:0;padding:0">
<head>
<meta charset="UTF-8">
<title>${spec.platform} — ${plan.brand}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body {
    width: ${spec.width}px; height: ${spec.height}px;
    overflow: hidden; font-family: 'Inter', sans-serif;
    background: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%);
    display: flex; align-items: center; justify-content: center;
    position: relative;
  }
  .blob {
    position: absolute; border-radius: 50%; opacity: 0.15;
    background: white; pointer-events: none;
  }
  .wrapper { text-align: center; padding: ${isSmall ? '20px' : '40px'}; color: white; width: 100%; position: relative; z-index: 1; }
  .brand    { font-size: ${isSmall ? '11px' : '16px'}; opacity: 0.75; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: ${isSmall ? '8px' : '16px'}; }
  .headline { font-size: ${headlineSize}; font-weight: 900; line-height: 1.1; margin-bottom: ${isSmall ? '12px' : '20px'}; }
  .subline  { font-size: ${isSmall ? '12px' : '20px'}; opacity: 0.85; margin-bottom: ${isSmall ? '16px' : '28px'}; ${isSmall ? 'display:none;' : ''} }
  .cta {
    display: inline-block; background: white; color: ${primary};
    font-weight: 700; font-size: ${isSmall ? '13px' : '18px'};
    padding: ${isSmall ? '8px 18px' : '14px 36px'}; border-radius: 100px;
  }
</style>
</head>
<body style="width:${spec.width}px;height:${spec.height}px;overflow:hidden;margin:0;padding:0">
  <div class="blob" style="width:${spec.width * 0.6}px;height:${spec.width * 0.6}px;top:-20%;right:-15%;"></div>
  <div class="blob" style="width:${spec.width * 0.4}px;height:${spec.width * 0.4}px;bottom:-20%;left:-10%;"></div>
  <div class="wrapper">
    <div class="brand">${plan.brand}</div>
    <div class="headline">${plan.message}</div>
    <div class="subline">${plan.subline}</div>
    <div class="cta">${plan.cta}</div>
  </div>
<script>
  gsap.from('body > *', { opacity: 0, y: 20, duration: 0.8, stagger: 0.1, ease: 'power2.out' });
</script>
</body>
</html>`;
  }

  // ─── README ───────────────────────────────────────────────────────────────────

  private buildReadme(plan: BannerPlan, specs: BannerSpec[]): string {
    const table = specs
      .map(s => `| ${s.filename} | ${s.platform} | ${s.width}×${s.height} | ${s.notes} |`)
      .join('\n');

    return `# ${plan.brand} Social Media Banner Kit

Generated by Arrivarangam · Style: **${plan.style}** · Theme: **${plan.theme}**

## Headline
> "${plan.message}"

## Files

| File | Platform | Size | Notes |
|------|----------|------|-------|
${table}

## How to Export as Images

### Option 1 — Browser Screenshot (Fastest)
1. Open the HTML file in Chrome or Edge
2. Open DevTools → press \`Ctrl+Shift+I\`
3. Click the **Toggle device toolbar** icon (or \`Ctrl+Shift+M\`)
4. Set the viewport to the exact pixel dimensions of the banner
5. Right-click on the page → **Capture screenshot** in the DevTools device toolbar menu

### Option 2 — Puppeteer (Batch Export)
\`\`\`js
const puppeteer = require('puppeteer');
const path = require('path');

const banners = [
${specs.map(s => `  { file: '${s.filename}', width: ${s.width}, height: ${s.height} },`).join('\n')}
];

(async () => {
  const browser = await puppeteer.launch();
  for (const b of banners) {
    const page = await browser.newPage();
    await page.setViewport({ width: b.width, height: b.height, deviceScaleFactor: 2 });
    await page.goto('file://' + path.resolve(b.file));
    await page.waitForTimeout(1200); // wait for GSAP animation
    await page.screenshot({ path: b.file.replace('.html', '@2x.png'), fullPage: false });
    await page.close();
  }
  await browser.close();
  console.log('All banners exported.');
})();
\`\`\`

### Option 3 — Chrome Headless CLI
\`\`\`bash
# Example for the Facebook banner
google-chrome --headless --screenshot=facebook-1200x630.png \\
  --window-size=1200,630 facebook-1200x630.html
\`\`\`

## Customising

- **Colors:** Edit the CSS gradient values inside each HTML file — search for \`${plan.colors.primary}\`
- **Copy:** Update the headline, subline, and CTA text directly in the HTML
- **Fonts:** Change the Google Fonts \`<link>\` URL in the \`<head>\` to swap typefaces
- **Animation:** Adjust \`gsap.from()\` \`duration\` and \`stagger\` values at the bottom of each file

## Brand Colors

| Token | Value |
|-------|-------|
| Primary | \`${plan.colors.primary}\` |
| Secondary | \`${plan.colors.secondary}\` |
| Accent | \`${plan.colors.accent}\` |
| Theme | ${plan.theme} |
`;
  }
}
