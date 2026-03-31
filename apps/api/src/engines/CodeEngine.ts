import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeSonnet, callClaudeHaiku } from '../connectors/claude';
import { taskService } from '../services/TaskService';
import { UsageMeter } from '../services/UsageMeter';

interface FileEntry {
  path: string;
  content: string;
}

interface FilePlan {
  files: { path: string; description: string; language: string }[];
  techStack: string[];
  notes: string;
}

// ─── CodeEngine ───────────────────────────────────────────────────────────────

export class CodeEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (event: TaskEvent) => { await onEvent(event); };
    const meter = new UsageMeter();

    await prisma.task.update({
      where: { id: task.id },
      data: { status: 'running' },
    });

    try {
      // Step 1: Plan file structure
      await emit({
        type: 'log',
        data: { message: 'Analyzing requirements and planning file structure...' },
        timestamp: new Date().toISOString(),
      });

      const plan = await this.planStructure(task.prompt, task.category, meter);

      await emit({
        type: 'log',
        data: { message: `Planned ${plan.files.length} files. Tech stack: ${plan.techStack.join(', ')}` },
        timestamp: new Date().toISOString(),
      });

      // Step 2: Generate each file
      const generatedFiles: FileEntry[] = [];

      for (let i = 0; i < plan.files.length; i++) {
        const fileMeta = plan.files[i];

        await emit({
          type: 'log',
          data: { message: `Generating ${fileMeta.path} (${i + 1}/${plan.files.length})...` },
          timestamp: new Date().toISOString(),
        });

        const content = await this.generateFile(task.prompt, fileMeta, generatedFiles, plan, meter);
        generatedFiles.push({ path: fileMeta.path, content });

        await emit({
          type: 'file_created',
          data: {
            path: fileMeta.path,
            content,
            language: fileMeta.language,
            index: i + 1,
            total: plan.files.length,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Step 3: Auto-fix pass
      await emit({
        type: 'log',
        data: { message: 'Running auto-fix pass...' },
        timestamp: new Date().toISOString(),
      });

      const fixedFiles = await this.autoFix(task.prompt, generatedFiles, meter);

      for (const fixed of fixedFiles) {
        const original = generatedFiles.find(f => f.path === fixed.path);
        if (original && original.content !== fixed.content) {
          await emit({
            type: 'file_updated',
            data: { path: fixed.path, content: fixed.content, reason: 'Auto-fix applied' },
            timestamp: new Date().toISOString(),
          });
        }
      }

      const creditsUsed = meter.toCredits();
      const metadata = { files: fixedFiles, techStack: plan.techStack, fileCount: fixedFiles.length, usage: meter.summary() };

      await taskService.completeTask(task.id, creditsUsed, metadata);

      await emit({
        type: 'completed',
        data: {
          files: fixedFiles,
          creditsUsed,
          fileCount: fixedFiles.length,
          message: `Successfully generated ${fixedFiles.length} files`,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({
        type: 'error',
        data: { message: err.message ?? 'Code generation failed' },
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  }

  // ─── Refine (in-place follow-up) ─────────────────────────────────────────────

  async refine(
    task: any,
    followUpPrompt: string,
    previousFiles: FileEntry[],
    onEvent: (e: TaskEvent) => void
  ): Promise<void> {
    const emit = async (event: TaskEvent) => { await onEvent(event); };
    const meter = new UsageMeter();

    await prisma.task.update({
      where: { id: task.id },
      data: { status: 'running', completedAt: null, startedAt: new Date() },
    });

    try {
      await emit({
        type: 'log',
        data: { message: `Refining project: "${followUpPrompt.slice(0, 80)}${followUpPrompt.length > 80 ? '...' : ''}"` },
        timestamp: new Date().toISOString(),
      });

      // Build combined context
      const combinedPrompt = `Original project: ${task.prompt}\n\nRefinement request: ${followUpPrompt}`;

      const previousFileSummary = previousFiles.length > 0
        ? `\n\nExisting project files:\n${previousFiles.map(f =>
            `=== ${f.path} ===\n${f.content.slice(0, 600)}${f.content.length > 600 ? '\n...(truncated)' : ''}`
          ).join('\n\n').slice(0, 10000)}`
        : '';

      // Ask Claude what needs to change
      const planSystemPrompt = `You are an expert developer refining an existing codebase based on user feedback.

Analyze the refinement request and return ONLY a valid JSON object listing which files to modify and what new files to add:
{
  "modify": [{"path": "file/path", "description": "what to change and why"}],
  "create": [{"path": "file/path", "description": "what this new file does", "language": "typescript"}],
  "techStack": ["existing", "tech", "stack"]
}

Rules:
- Only include files that actually need changes based on the request
- Keep the existing file structure — don't restructure unless asked
- Return empty arrays if nothing of that type needs changing`;

      const planResponse = await callClaudeSonnet(
        `${combinedPrompt}${previousFileSummary}\n\nWhat files need to be created or modified?`,
        planSystemPrompt,
        2048,
        undefined,
        meter
      );

      const plan = this.parseJSON<{ modify: any[]; create: any[]; techStack: string[] }>(
        planResponse,
        { modify: [], create: [], techStack: [] }
      );

      const totalChanges = plan.modify.length + plan.create.length;

      if (totalChanges === 0) {
        // No changes needed — still emit completion
        await emit({
          type: 'log',
          data: { message: 'No file changes needed for this request.' },
          timestamp: new Date().toISOString(),
        });
      }

      await emit({
        type: 'log',
        data: { message: `${plan.modify.length} files to update, ${plan.create.length} new files to create` },
        timestamp: new Date().toISOString(),
      });

      const updatedFiles = [...previousFiles];
      let i = 0;

      // Modify existing files
      for (const fileMeta of plan.modify) {
        i++;
        await emit({
          type: 'log',
          data: { message: `Updating ${fileMeta.path} (${i}/${totalChanges})...` },
          timestamp: new Date().toISOString(),
        });

        const existing = previousFiles.find(f => f.path === fileMeta.path);
        const systemPrompt = `You are a world-class creative developer. Update the following file based on the refinement request.
Output ONLY the complete updated file content — no explanations, no markdown fences.
Keep all existing functionality and visual quality (GSAP animations, Lenis scroll, glassmorphism, hover effects) unless explicitly asked to change it.
ENHANCE any plain sections you touch — no flat colors, no missing hover states, no unanimated sections.`;

        const filePrompt = `${combinedPrompt}

File to update: ${fileMeta.path}
What to change: ${fileMeta.description}

Current content:
${existing?.content ?? '(new file)'}`;

        const newContent = await callClaudeSonnet(filePrompt, systemPrompt, 8192, undefined, meter);
        const cleaned = this.stripMarkdownFences(newContent, fileMeta.path.split('.').pop() ?? '');

        const idx = updatedFiles.findIndex(f => f.path === fileMeta.path);
        if (idx >= 0) {
          updatedFiles[idx] = { path: fileMeta.path, content: cleaned };
        } else {
          updatedFiles.push({ path: fileMeta.path, content: cleaned });
        }

        await emit({
          type: 'file_updated',
          data: { path: fileMeta.path, content: cleaned, reason: fileMeta.description },
          timestamp: new Date().toISOString(),
        });
      }

      // Create new files
      for (const fileMeta of plan.create) {
        i++;
        await emit({
          type: 'log',
          data: { message: `Creating ${fileMeta.path} (${i}/${totalChanges})...` },
          timestamp: new Date().toISOString(),
        });

        const fullPlan = {
          files: [fileMeta],
          techStack: plan.techStack,
          notes: '',
        };
        const content = await this.generateFile(combinedPrompt, fileMeta, updatedFiles, fullPlan, meter);
        updatedFiles.push({ path: fileMeta.path, content });

        await emit({
          type: 'file_created',
          data: { path: fileMeta.path, content, language: fileMeta.language },
          timestamp: new Date().toISOString(),
        });
      }

      const creditsUsed = meter.toCredits();
      const metadata = { files: updatedFiles, techStack: plan.techStack, fileCount: updatedFiles.length, usage: meter.summary() };

      await taskService.completeTask(task.id, creditsUsed, metadata);

      await emit({
        type: 'completed',
        data: {
          files: updatedFiles,
          creditsUsed,
          fileCount: updatedFiles.length,
          message: `Refinement complete — ${plan.modify.length} updated, ${plan.create.length} created`,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({
        type: 'error',
        data: { message: err.message ?? 'Refinement failed' },
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  }

  // ─── Plan File Structure ──────────────────────────────────────────────────────

  private async planStructure(prompt: string, category: string, meter: UsageMeter): Promise<FilePlan> {
    const categoryGuidance: Record<string, string> = {
      code: `Generate an IMMERSIVE, enterprise-grade web application that runs directly in a browser WITHOUT any build step.

MANDATORY CDN LIBRARIES — include ALL of these in index.html <head>:
  React 18:        https://unpkg.com/react@18/umd/react.development.js
  ReactDOM:        https://unpkg.com/react-dom@18/umd/react-dom.development.js
  Babel Standalone: https://unpkg.com/@babel/standalone/babel.min.js
  Tailwind CSS:    https://cdn.tailwindcss.com
  GSAP:            https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js
  ScrollTrigger:   https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js
  Lenis:           https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/bundled/lenis.min.js

MANDATORY VISUAL QUALITY REQUIREMENTS — every generated site MUST have:
1. IMMERSIVE HERO: Full-viewport hero (min-height:100vh) with animated gradient background or canvas particle system, large bold headline with gradient text (background-clip:text), animated subtitle, glowing CTA button
2. SCROLL ANIMATIONS: GSAP ScrollTrigger on EVERY section — elements must slide up / fade in / scale on scroll. Register ScrollTrigger plugin: gsap.registerPlugin(ScrollTrigger)
3. SMOOTH SCROLL: Initialize Lenis for buttery smooth page scrolling. Connect Lenis RAF to GSAP ticker
4. GLASSMORPHISM CARDS: All cards must use backdrop-filter:blur(12px), semi-transparent backgrounds (rgba(255,255,255,0.06) on dark, rgba(255,255,255,0.8) on light), border:1px solid rgba(255,255,255,0.12)
5. MICRO-INTERACTIONS: Every button/card/link must transform on hover — scale(1.04), box-shadow glow, color transition 0.3s ease
6. 3D DEPTH ON CARDS: CSS transform-style:preserve-3d with JS mousemove tilt effect (rotateX + rotateY) on feature/product cards
7. ANIMATED COUNTERS: Numbers count up with GSAP when scrolled into view
8. GRADIENT EVERYWHERE: Use linear-gradient or radial-gradient — never flat solid colors for backgrounds. Rich color pairs: indigo→violet, cyan→blue, rose→orange, emerald→teal
9. STAGGER ANIMATIONS: Lists, cards, features must stagger-animate in using GSAP stagger (0.1s–0.15s between items)
10. TYPOGRAPHY: Large headings use font-size:clamp(48px,8vw,96px), letter-spacing:-0.04em, font-weight:900. Gradient clip text on key phrases
11. CUSTOM CURSOR: If applicable, add a custom cursor dot that follows mouse with GSAP quickTo
12. FLOATING ELEMENTS: Hero background must have 2-3 floating orbs/blobs animated with GSAP (x/y oscillation, opacity pulse)
13. DARK THEME: Default to a premium dark theme (#050714 or #0a0a1a base) with light text. Add a data-theme switcher if relevant
14. LOADING ANIMATION: Add a brief page-load animation (GSAP timeline, 0.8s) that reveals content

FILE STRUCTURE RULES:
- index.html: complete self-contained file that WORKS when opened in browser
- style.css: all custom CSS (glassmorphism mixins, 3D card styles, keyframe animations, gradient meshes, custom scrollbar)
- app.js OR <script type="text/babel"> in index.html: ALL React components + GSAP animations + Lenis init
- animations.js (optional): separate GSAP animation sequences if complex
- README.md: preview instructions and feature list

TECHNICAL RULES:
- Use <script type="text/babel"> for JSX — Babel CDN transpiles in browser
- CDN globals only — NEVER use ES module import/require in browser scripts
- All GSAP animations must initialize after DOM ready (DOMContentLoaded or React useEffect)
- Lenis + GSAP ticker integration: lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add((time)=>lenis.raf(time*1000))`,

      research: `Generate a comprehensive, beautifully formatted research report with visual data presentation.
Include: README.md (executive summary with key findings), report.md (full structured report: Abstract, Introduction, Methodology, Findings with subsections, Analysis, Conclusion, References), sources.md (annotated bibliography with URLs), data/stats.json (key statistics as JSON for potential chart use), insights.md (actionable insights and recommendations).
Quality requirements: use proper markdown formatting (tables, blockquotes, bold key terms), include concrete data points, statistics, expert citations, real-world examples. Minimum 2000 words for report.md.`,

      image: `Generate a stunning visual SVG artwork or interactive HTML canvas animation.
Include: index.html (embedded SVG or canvas with animation), style.css (visual polish), README.md.
Quality requirements: if SVG — use gradients, filters (feGaussianBlur, feColorMatrix), complex paths, animations. If canvas — particle systems, physics simulation, or generative art. Must be visually impressive and interactive (mouse/click events).`,

      content: `Generate comprehensive, high-quality content ready for publishing.
Include: content.md (main content — minimum 1500 words, well-structured with headers, lists, examples), outline.md (detailed outline with word counts per section), variations.md (3 alternative angles/tones for the same content), seo.md (SEO strategy: title tags, meta descriptions, keywords, internal linking ideas), style-guide.md (brand voice, tone, dos and don'ts), README.md.
Quality requirements: professional tone, specific examples, concrete data, actionable advice, compelling headlines.`,

      mobile: `Generate a complete React Native (Expo) mobile app with beautiful UI.
Include: App.tsx (main app with navigation), package.json (expo + react-navigation + other deps), app.json (Expo config), src/screens/ (all screen components), src/components/ (reusable UI components), src/hooks/ (custom hooks), src/theme.ts (colors, typography, spacing), README.md with Expo Snack/Go instructions.
Quality requirements: use React Navigation for routing, styled with StyleSheet (gradients via expo-linear-gradient), smooth animations with react-native Animated API or reanimated, proper loading states, error handling, TypeScript throughout.`,

      presentation: `Generate a visually stunning Reveal.js HTML presentation with custom animations.
Include: index.html (complete Reveal.js presentation — self-contained with CDN), style.css (custom premium theme: dark background, gradient accents, glassmorphism slide cards), slides.md (slide content outline), README.md.
Quality requirements: 12-15 slides minimum, custom CSS transitions between slides, fragment animations on bullet points, data visualization slides (CSS/SVG charts), quote slides with large typography, full-bleed image slides with overlay text. Must impress an audience. Use Reveal.js CDN (https://cdn.jsdelivr.net/npm/reveal.js@5.1.0/dist/).`,

      agent: `Generate a production-ready AI agent with clean architecture.
Include: agent.py (main agent with LangChain/CrewAI), tools.py (all custom tool implementations with real logic), config.py (settings with pydantic BaseSettings), utils.py (helper functions), requirements.txt (pinned versions), .env.example (all required env vars), tests/test_agent.py (unit tests), README.md (detailed setup, usage examples, architecture diagram in ASCII).
Quality requirements: proper error handling + retry logic, logging throughout, type hints everywhere, docstrings on all functions, async where appropriate, real working tool implementations (not stubs).`,

      workflow: `Generate a complete, importable n8n workflow automation.
Include: workflow.json (complete n8n workflow export with all nodes configured), setup.md (step-by-step import and configuration guide), nodes/ (any custom node configurations), credentials-template.json (credential structure needed), README.md (workflow description, trigger conditions, data flow diagram in ASCII, troubleshooting).
Quality requirements: workflow must have proper error handling nodes, all node parameters filled with real values (not placeholders), data transformation steps, conditional branching where logical.`,
    };

    const guidance = categoryGuidance[category] ?? categoryGuidance.code;

    const systemPrompt = `You are an expert software architect and creative technologist. Analyze the user's request and design a file structure plan that will result in an IMPRESSIVE, production-ready output that wows users.

Return ONLY a valid JSON object (no markdown, no comments, no prose) with this exact structure:
{
  "files": [
    {"path": "relative/path/to/file.ts", "description": "what this file does", "language": "typescript"}
  ],
  "techStack": ["list", "of", "technologies"],
  "notes": "any important architectural notes"
}

Category-specific requirements for "${category}":
${guidance}

Rules:
- Keep file count reasonable (4-15 files for most projects)
- Use relative paths from project root
- Always generate separate individual files — never combine everything into one massive file
- Return ONLY the JSON — no text before or after`;

    const response = await callClaudeSonnet(
      `Create a file structure plan for this ${category} task:\n\n${prompt}`,
      systemPrompt,
      4096,
      undefined,
      meter
    );

    const parsed = this.parseJSON<FilePlan>(response, {
      files: [{ path: 'output.txt', description: 'Main output', language: 'text' }],
      techStack: [],
      notes: '',
    });

    // Validate — if Claude returned garbage, use a sensible default
    if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
      console.warn('[CodeEngine] planStructure returned empty files, using default');
      return {
        files: [{ path: 'output.txt', description: 'Main output', language: 'text' }],
        techStack: [],
        notes: '',
      };
    }

    return parsed;
  }

  // ─── Generate Single File ──────────────────────────────────────────────────

  private async generateFile(
    userPrompt: string,
    fileMeta: { path: string; description: string; language: string },
    existingFiles: FileEntry[],
    plan: FilePlan,
    meter: UsageMeter
  ): Promise<string> {
    const contextSummary = existingFiles.length > 0
      ? `\n\nAlready generated files:\n${existingFiles.map(f =>
          `--- ${f.path} ---\n${f.content.slice(0, 500)}${f.content.length > 500 ? '\n...(truncated)' : ''}`
        ).join('\n\n')}`
      : '';

    const systemPrompt = `You are a world-class creative developer and UI/UX engineer at a top-tier product studio. You build experiences that make users say "wow". Every line of code you write is production-ready, visually stunning, and technically excellent.

VISUAL QUALITY MANDATE (for HTML/CSS/JS files):
- NEVER use flat solid colors for backgrounds — always use gradients (linear-gradient with 2-3 color stops)
- Every interactive element (button, card, link, input) MUST have :hover/:focus transitions (transform, shadow, color) with 0.2s-0.4s ease
- Use rich color palettes: deep dark base (#050714, #0a0a1a) with vibrant accent gradients (indigo→violet, cyan→blue, rose→orange)
- Typography: headings use clamp() for fluid sizing, letter-spacing:-0.04em, font-weight:900, gradient clip text on key phrases
- Spacing: generous padding (5-8rem vertical on sections), breathing room that feels premium
- Glassmorphism on cards: background:rgba(255,255,255,0.05); backdrop-filter:blur(16px); border:1px solid rgba(255,255,255,0.1); box-shadow:0 8px 32px rgba(0,0,0,0.3)
- GSAP animations: use ScrollTrigger for every section, stagger for lists/cards, timeline for hero entrance
- Lenis smooth scroll: always initialize for premium scroll feel
- 3D card tilt: mousemove listener → rotateX/rotateY with perspective on feature cards
- Particle/orb backgrounds: 2-3 floating blurred orbs in hero using GSAP oscillation animation
- Custom scrollbar: thin, styled with accent color

COMPLETENESS MANDATE:
- ZERO placeholders, ZERO TODOs, ZERO "insert content here" stubs
- Every section has real content matching the user's actual prompt
- All interactive features (forms, modals, tabs, accordions) must be fully functional
- Minimum 5-8 sections for landing pages: Hero, Features/Capabilities, How It Works, Testimonials/Stats, CTA, Footer

TECHNICAL RULES:
- Output ONLY the raw file content — no explanations, no markdown fences, no prose
- For HTML: complete from <!DOCTYPE html> to </html>, all CDN links included, all JS inline or via relative script src
- For JSON files: NO comments (JSON doesn't support comments)
- CDN globals only in browser files — NEVER ES6 import in HTML scripts
- All animations initialize after DOMContentLoaded or in React useEffect
- Lenis + GSAP integration: lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add((time)=>lenis.raf(time*1000))`;

    const filePrompt = `Task: ${userPrompt}

Full project plan:
Tech stack: ${plan.techStack.join(', ')}
Total files: ${plan.files.length}
${contextSummary}

Now generate the complete content for: ${fileMeta.path}
Description: ${fileMeta.description}
Language: ${fileMeta.language}`;

    const content = await callClaudeSonnet(filePrompt, systemPrompt, 8192, undefined, meter);
    return this.stripMarkdownFences(content, fileMeta.language);
  }

  // ─── Auto-Fix Pass ────────────────────────────────────────────────────────────

  private async autoFix(userPrompt: string, files: FileEntry[], meter: UsageMeter): Promise<FileEntry[]> {
    if (files.length === 0) return files;

    const filesSummary = files
      .map(f => `=== ${f.path} ===\n${f.content}`)
      .join('\n\n');

    const systemPrompt = `You are an expert code reviewer and creative director. Review all files for errors AND visual quality, then return corrected versions.

Return ONLY a valid JSON array (no markdown, no prose before or after) with this structure:
[{"path": "file/path", "content": "complete file content", "fixed": true/false}]

CHECK AND FIX — Technical:
- CDN scripts loaded in correct order (Lenis → GSAP → ScrollTrigger → React → Babel → app code)
- GSAP ScrollTrigger plugin registered: gsap.registerPlugin(ScrollTrigger)
- Lenis initialized correctly and connected to GSAP ticker
- Broken JS references between files
- Invalid JSON syntax (NO comments in JSON files)
- Missing CDN libraries that are referenced in code

CHECK AND FIX — Visual Quality (for HTML/CSS/JS files):
- If hero section lacks animated gradient background → add CSS keyframe gradient animation or GSAP orbs
- If cards lack glassmorphism → add backdrop-filter:blur(12px) and semi-transparent background
- If buttons lack hover effects → add transform:scale(1.05) and box-shadow glow on :hover
- If page uses flat solid color backgrounds → replace with gradients
- If GSAP ScrollTrigger animations are missing → add gsap.from() with scrollTrigger on each section
- If any placeholder text like "Lorem ipsum" or "Insert content here" exists → replace with relevant real content
- If animations are missing on page load → add GSAP timeline for hero entrance sequence
- Ensure all interactive features (tabs, modals, accordions) are fully functional

Return ALL files even if unchanged.`;

    let response: string;
    try {
      response = await callClaudeSonnet(
        `Original task: ${userPrompt.slice(0, 200)}\n\nReview and fix these files:\n\n${filesSummary.slice(0, 12000)}`,
        systemPrompt,
        8192,
        undefined,
        meter
      );
    } catch (err) {
      console.warn('[CodeEngine] Auto-fix pass failed, returning original files:', err);
      return files;
    }

    try {
      const parsed = this.parseJSON<FileEntry[]>(response, []);
      if (!parsed || !Array.isArray(parsed) || parsed.length === 0) return files;

      const valid = parsed.every(f => typeof f.path === 'string' && typeof f.content === 'string');
      if (!valid) return files;

      return parsed.map(f => ({ path: f.path, content: f.content }));
    } catch {
      return files;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  // Extract balanced JSON block (handles prose around JSON)
  private extractJsonBlock(text: string, expectArray: boolean): string | null {
    const openChar = expectArray ? '[' : '{';
    const closeChar = expectArray ? ']' : '}';
    const start = text.indexOf(openChar);
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\' && inString) { escaped = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === openChar) depth++;
      else if (ch === closeChar) {
        depth--;
        if (depth === 0) return text.slice(start, i + 1);
      }
    }
    return null;
  }

  private parseJSON<T>(text: string, fallback: T): T {
    const expectArray = Array.isArray(fallback);

    // Strip markdown fences only (NOT comments yet — comment regex corrupts URLs in strings)
    const cleaned = text
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/```\s*$/gm, '')
      .trim();

    // 1. Try direct parse (Claude returned clean JSON)
    try { return JSON.parse(cleaned) as T; } catch { /* continue */ }

    // 2. Extract JSON block from surrounding prose (most common case)
    const block = this.extractJsonBlock(cleaned, expectArray)
      ?? this.extractJsonBlock(cleaned, !expectArray);
    if (block) {
      try { return JSON.parse(block) as T; } catch { /* continue */ }
    }

    // 3. Strip JS comments then try again (Claude added comments to JSON)
    const stripped = cleaned
      .replace(/\/\/(?![^\n]*"[^\n]*(?:"[^\n]*"[^\n]*)*$)[^\n]*/gm, '') // single-line, not inside strings
      .replace(/\/\*[\s\S]*?\*\//g, '');
    try { return JSON.parse(stripped) as T; } catch { /* continue */ }
    const blockStripped = this.extractJsonBlock(stripped, expectArray)
      ?? this.extractJsonBlock(stripped, !expectArray);
    if (blockStripped) {
      try { return JSON.parse(blockStripped) as T; } catch { /* continue */ }
    }

    console.warn('[CodeEngine] JSON parse failed. Raw:', text.slice(0, 400));
    return fallback;
  }

  private stripMarkdownFences(content: string, language: string): string {
    return content
      .replace(/^```[\w]*\n?/, '')
      .replace(/```\s*$/, '')
      .trim();
  }
}
