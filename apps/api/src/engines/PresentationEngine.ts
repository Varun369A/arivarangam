import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeSonnet, callClaudeHaiku } from '../connectors/claude';
import { taskService } from '../services/TaskService';
import { UsageMeter } from '../services/UsageMeter';

// ─── PresentationEngine ───────────────────────────────────────────────────────
//
// Generates stunning Reveal.js HTML presentations:
//  - CDN-based, works instantly in blob preview
//  - Custom premium dark/light themes
//  - Fragment animations on bullet points
//  - Data visualization slides (CSS/SVG charts)
//  - Speaker notes
//  - Export-ready PDF via Reveal.js print stylesheet

interface FileEntry { path: string; content: string; }

const REVEAL_CDN = `
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.css">
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/reveal.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/plugin/notes/notes.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/plugin/highlight/highlight.js"></script>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/plugin/highlight/monokai.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>`;

export class PresentationEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (event: TaskEvent) => { await onEvent(event); };
    const meter = new UsageMeter();

    await prisma.task.update({ where: { id: task.id }, data: { status: 'running' } });

    try {
      await emit({ type: 'log', data: { message: '📊 Analyzing presentation requirements...' }, timestamp: new Date().toISOString() });

      // Step 1: Plan slide structure
      const plan = await this.planSlides(task.prompt, meter);

      await emit({ type: 'log', data: { message: `📐 Planned ${plan.slideCount} slides | Theme: ${plan.theme}` }, timestamp: new Date().toISOString() });

      // Step 2: Generate content
      await emit({ type: 'log', data: { message: '✍️ Writing slide content...' }, timestamp: new Date().toISOString() });
      const slideContent = await this.generateSlideContent(task.prompt, plan, meter);

      await emit({ type: 'log', data: { message: '🎨 Building Reveal.js presentation...' }, timestamp: new Date().toISOString() });

      // Step 3: Generate all files
      const files: FileEntry[] = [];

      const htmlContent = await this.buildPresentationHtml(task.prompt, slideContent, plan, meter);
      files.push({ path: 'index.html', content: htmlContent });
      await emit({ type: 'file_created', data: { path: 'index.html', content: htmlContent, language: 'html', index: 1, total: 3 }, timestamp: new Date().toISOString() });

      const cssContent = await this.generateThemeCSS(plan.theme, plan.colors, meter);
      files.push({ path: 'theme.css', content: cssContent });
      await emit({ type: 'file_created', data: { path: 'theme.css', content: cssContent, language: 'css', index: 2, total: 3 }, timestamp: new Date().toISOString() });

      const readmeContent = this.buildReadme(task.prompt, plan);
      files.push({ path: 'README.md', content: readmeContent });
      await emit({ type: 'file_created', data: { path: 'README.md', content: readmeContent, language: 'markdown', index: 3, total: 3 }, timestamp: new Date().toISOString() });

      const creditsUsed = meter.toCredits();
      await taskService.completeTask(task.id, creditsUsed, {
        files, slideCount: plan.slideCount, theme: plan.theme, usage: meter.summary(),
      });

      await emit({
        type: 'completed',
        data: { files, creditsUsed, slideCount: plan.slideCount, message: `✅ ${plan.slideCount}-slide Reveal.js presentation ready` },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({ type: 'error', data: { message: err.message ?? 'PresentationEngine failed' }, timestamp: new Date().toISOString() });
      throw err;
    }
  }

  // ─── Plan Slides ──────────────────────────────────────────────────────────────

  private async planSlides(prompt: string, meter: UsageMeter): Promise<{
    slideCount: number;
    theme: 'dark' | 'light' | 'corporate';
    colors: { primary: string; accent: string; bg: string };
    sections: string[];
  }> {
    const systemPrompt = `You are a presentation strategist. Analyze the request and return ONLY valid JSON:
{
  "slideCount": 15,
  "theme": "dark",
  "colors": {"primary": "#6366F1", "accent": "#8B5CF6", "bg": "#0A0D14"},
  "sections": ["Title", "Agenda", "Section1", "Section2", "Data/Stats", "Case Study", "Key Takeaways", "Call To Action", "Q&A"]
}
- theme: "dark" for tech/startup, "light" for corporate/academic, "corporate" for business
- slideCount: 12-20 based on content depth
- sections: actual slide titles based on the topic`;

    try {
      const response = await callClaudeHaiku(prompt, systemPrompt, 512, meter);
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return {
        slideCount: 15,
        theme: 'dark',
        colors: { primary: '#6366F1', accent: '#8B5CF6', bg: '#0A0D14' },
        sections: ['Title', 'Agenda', 'Overview', 'Key Points', 'Analysis', 'Data', 'Case Study', 'Benefits', 'Implementation', 'Timeline', 'Results', 'Testimonials', 'Call To Action', 'Summary', 'Q&A'],
      };
    }
  }

  // ─── Generate Slide Content ───────────────────────────────────────────────────

  private async generateSlideContent(
    prompt: string,
    plan: { slideCount: number; theme: string; sections: string[] },
    meter: UsageMeter
  ): Promise<string> {
    const systemPrompt = `You are a world-class presentation content writer. Create compelling slide content for a ${plan.theme} theme Reveal.js presentation.

Return a structured outline with content for each slide section. For each section include:
- Main heading (concise, punchy)
- 3-5 bullet points (specific data, examples, facts — no vague statements)
- Any charts/diagrams to include (described in text)
- Speaker notes (1-2 sentences of context for the presenter)

Format as plain text with clear section separators. Be specific and include real data/statistics where relevant.`;

    return await callClaudeSonnet(
      `Create presentation content for: ${prompt}\n\nSlide sections: ${plan.sections.join(', ')}`,
      systemPrompt, 6000, undefined, meter
    );
  }

  // ─── Build Presentation HTML ──────────────────────────────────────────────────

  private async buildPresentationHtml(
    prompt: string,
    slideContent: string,
    plan: { slideCount: number; theme: string; colors: any; sections: string[] },
    meter: UsageMeter
  ): Promise<string> {
    const systemPrompt = `You are an expert Reveal.js developer. Build a complete, stunning HTML presentation.

CDN SCRIPTS (include ALL in <head>):
${REVEAL_CDN}

REVEAL.JS INIT (at end of body):
<script>
  Reveal.initialize({
    hash: true,
    transition: 'slide',
    transitionSpeed: 'fast',
    backgroundTransition: 'fade',
    center: false,
    margin: 0.04,
    plugins: [RevealNotes, RevealHighlight]
  });
</script>

SLIDE STRUCTURE:
<div class="reveal">
  <div class="slides">
    <section> ... </section>
    <!-- Vertical slides: nested <section> inside <section> -->
    <!-- Data slide: <section data-background-gradient="linear-gradient(...)"> -->
  </div>
</div>

DESIGN MANDATES for "${plan.theme}" theme:
- Primary color: ${plan.colors.primary} | Accent: ${plan.colors.accent} | Background: ${plan.colors.bg}
- Title slide: full-viewport gradient background, animated subtitle with fragment class
- Section headers: large gradient clip text, left-aligned, icon emoji prefix
- Bullet slides: use <ul class="fragment" data-fragment-index="0"> with fragment on each <li>
- Data slides: inline CSS bar charts or SVG charts with real numbers
- Quote slides: large italic text, colored left border, attribution
- Image/visual slides: dark overlay, text overlay with backdrop-filter
- Custom scrollbar, elegant typography (system font stack with fallbacks)
- Every slide has a consistent header bar showing deck title

TECHNICAL:
- Link to theme.css for custom styles
- Output complete HTML from <!DOCTYPE html> to </html>
- Speaker notes in <aside class="notes"> tags
- ALL content must match the actual topic — ZERO generic placeholders`;

    return await callClaudeSonnet(
      `Build Reveal.js HTML for: ${prompt}\n\nSlide content:\n${slideContent.slice(0, 8000)}`,
      systemPrompt, 8192, undefined, meter
    );
  }

  // ─── Generate Theme CSS ───────────────────────────────────────────────────────

  private async generateThemeCSS(
    theme: string,
    colors: { primary: string; accent: string; bg: string },
    meter: UsageMeter
  ): Promise<string> {
    const systemPrompt = `You are a CSS expert specializing in Reveal.js themes.

Generate a complete custom theme CSS for a "${theme}" Reveal.js presentation.
Primary: ${colors.primary} | Accent: ${colors.accent} | Background: ${colors.bg}

Include:
- .reveal { color, font-family, background }
- .reveal h1/h2/h3 { gradient clip text, letter-spacing }
- .reveal .slides section { padding, border-radius for content areas }
- .reveal ul li { custom bullet with accent color }
- .progress bar { background: accent color }
- .controls { color: accent }
- Fragment animations: custom fade-in-up transition
- Code block styling
- Quote block styling (left border accent, italic)
- Custom scrollbar
- Data chart bars (CSS only)

Output: raw CSS only, no markdown fences.`;

    try {
      return await callClaudeHaiku(
        `Generate theme.css for ${theme} presentation`,
        systemPrompt, 2048, meter
      );
    } catch {
      return `/* ${theme} theme */
.reveal { background: ${colors.bg}; color: #E2E8F0; font-family: system-ui, -apple-system, sans-serif; }
.reveal h1, .reveal h2 { background: linear-gradient(135deg, ${colors.primary}, ${colors.accent}); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.02em; }
.reveal .progress span { background: ${colors.primary}; }
.reveal .controls { color: ${colors.accent}; }`;
    }
  }

  // ─── README ───────────────────────────────────────────────────────────────────

  private buildReadme(prompt: string, plan: any): string {
    return `# Presentation: ${prompt.slice(0, 80)}

## Details
- **Slides:** ${plan.slideCount}
- **Theme:** ${plan.theme}
- **Built with:** Reveal.js 5.1 (CDN)

## How to view
Open \`index.html\` directly in any browser — no build step needed.

## Controls
| Key | Action |
|-----|--------|
| → / Space | Next slide |
| ← | Previous slide |
| S | Speaker notes |
| F | Fullscreen |
| ESC | Slide overview |
| B | Blackout screen |

## Export to PDF
Add \`?print-pdf\` to the URL and use browser Print → Save as PDF.
`;
  }
}
