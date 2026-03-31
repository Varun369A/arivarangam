import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeSonnet, callClaudeHaiku } from '../connectors/claude';
import { taskService } from '../services/TaskService';
import { UsageMeter } from '../services/UsageMeter';

// ─── AnimationEngine ──────────────────────────────────────────────────────────
//
// Specialises in immersive browser-based animations:
//  - Three.js WebGL scenes (particle systems, geometry, shaders)
//  - GSAP timelines + ScrollTrigger (scroll-driven motion)
//  - tsParticles (confetti, bubbles, interactive particles)
//  - Vanta.js animated backgrounds (WAVES, NET, BIRDS, FOG)
//  - Canvas 2D generative art / physics simulations
//  - CSS-only animations with clip-path, keyframes, 3D transforms
//
// All output is CDN-based and works instantly in the blob preview.

interface FileEntry { path: string; content: string; }

// ─── CDN Stack ────────────────────────────────────────────────────────────────

const ANIMATION_CDN = `
  <!-- Three.js -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.157.0/three.min.js"></script>
  <!-- GSAP + ScrollTrigger + MotionPath -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/MotionPathPlugin.min.js"></script>
  <!-- Lenis smooth scroll -->
  <script src="https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/bundled/lenis.min.js"></script>
  <!-- tsParticles -->
  <script src="https://cdn.jsdelivr.net/npm/@tsparticles/all@3.6.0/tsparticles.bundle.min.js"></script>
  <!-- Vanta.js -->
  <script src="https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.waves.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.net.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.birds.min.js"></script>
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>`;

export class AnimationEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (event: TaskEvent) => { await onEvent(event); };
    const meter = new UsageMeter();

    await prisma.task.update({ where: { id: task.id }, data: { status: 'running' } });

    try {
      await emit({ type: 'log', data: { message: '🎨 Analyzing animation request and selecting visual stack...' }, timestamp: new Date().toISOString() });

      // Step 1: Classify and plan
      const plan = await this.planAnimation(task.prompt, meter);

      await emit({ type: 'log', data: { message: `📐 Plan ready: ${plan.technique} | ${plan.files.length} files` }, timestamp: new Date().toISOString() });

      // Step 2: Generate files
      const generatedFiles: FileEntry[] = [];

      for (let i = 0; i < plan.files.length; i++) {
        const fileMeta = plan.files[i];
        await emit({ type: 'log', data: { message: `⚡ Generating ${fileMeta.path} (${i + 1}/${plan.files.length})...` }, timestamp: new Date().toISOString() });

        const content = await this.generateFile(task.prompt, fileMeta, generatedFiles, plan, meter);
        generatedFiles.push({ path: fileMeta.path, content });

        await emit({
          type: 'file_created',
          data: { path: fileMeta.path, content, language: fileMeta.language, index: i + 1, total: plan.files.length },
          timestamp: new Date().toISOString(),
        });
      }

      // Step 3: Visual quality pass
      await emit({ type: 'log', data: { message: '✨ Running animation quality pass...' }, timestamp: new Date().toISOString() });
      const fixedFiles = await this.qualityPass(task.prompt, generatedFiles, meter);

      for (const fixed of fixedFiles) {
        const original = generatedFiles.find(f => f.path === fixed.path);
        if (original && original.content !== fixed.content) {
          await emit({ type: 'file_updated', data: { path: fixed.path, content: fixed.content, reason: 'Animation quality enhancement' }, timestamp: new Date().toISOString() });
        }
      }

      const creditsUsed = meter.toCredits();
      await taskService.completeTask(task.id, creditsUsed, {
        files: fixedFiles, technique: plan.technique, fileCount: fixedFiles.length, usage: meter.summary(),
      });

      await emit({
        type: 'completed',
        data: { files: fixedFiles, creditsUsed, fileCount: fixedFiles.length, message: `✅ Animation built with ${plan.technique}` },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({ type: 'error', data: { message: err.message ?? 'AnimationEngine failed' }, timestamp: new Date().toISOString() });
      throw err;
    }
  }

  // ─── Plan ─────────────────────────────────────────────────────────────────────

  private async planAnimation(prompt: string, meter: UsageMeter): Promise<{
    technique: string;
    files: { path: string; description: string; language: string }[];
  }> {
    const systemPrompt = `You are an expert creative technologist specializing in browser-based animations and interactive experiences.

Analyze the request and choose the BEST technique:
- "three.js" — 3D scenes, particle geometry, orbit controls, WebGL backgrounds
- "gsap" — timeline animations, scroll-driven storytelling, morphing SVGs, text reveals
- "canvas2d" — generative art, physics simulations, particle systems, procedural drawing
- "particles" — tsParticles confetti/bubbles/interactive particles as main feature
- "vanta" — atmospheric animated backgrounds (waves, birds, fog, network)
- "css-animation" — pure CSS keyframes, clip-path reveals, 3D card flips, loaders

FILE STRUCTURE:
- index.html — complete self-contained with all CDN scripts, working preview
- style.css — custom animations, glassmorphism, custom scrollbar, 3D transforms
- animation.js — all JS: Three.js/GSAP/Canvas init, event listeners, RAF loop
- README.md — controls, how it works, customization guide

Return ONLY valid JSON:
{"technique": "...", "files": [{"path":"...","description":"...","language":"..."}]}`;

    try {
      const response = await callClaudeHaiku(
        `Plan animation for: ${prompt}`,
        systemPrompt, 1024, meter
      );
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.technique && Array.isArray(parsed.files)) return parsed;
    } catch { /* fallback */ }

    return {
      technique: 'three.js',
      files: [
        { path: 'index.html', description: 'Main HTML with CDN scripts', language: 'html' },
        { path: 'style.css', description: 'Styles and visual polish', language: 'css' },
        { path: 'animation.js', description: 'Three.js scene + GSAP animations', language: 'javascript' },
        { path: 'README.md', description: 'Documentation', language: 'markdown' },
      ],
    };
  }

  // ─── Generate File ────────────────────────────────────────────────────────────

  private async generateFile(
    userPrompt: string,
    fileMeta: { path: string; description: string; language: string },
    existingFiles: FileEntry[],
    plan: { technique: string; files: any[] },
    meter: UsageMeter
  ): Promise<string> {
    const isHtml = fileMeta.path.endsWith('.html');
    const ctx = existingFiles.length > 0
      ? `\nExisting files:\n${existingFiles.map(f => `--- ${f.path} ---\n${f.content.slice(0, 600)}`).join('\n\n')}`
      : '';

    const systemPrompt = `You are a world-class creative technologist and motion designer. Create a jaw-dropping, technically excellent browser animation.

ANIMATION TECHNIQUE: ${plan.technique}

${isHtml ? `MANDATORY CDN SCRIPTS in <head> (in this order):
${ANIMATION_CDN}

GSAP INIT (in DOMContentLoaded):
  gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
  const lenis = new Lenis({ duration: 1.2 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));

Three.js SCENE SETUP (if using Three.js):
  - Set renderer.setClearColor(0x000000, 0) for transparent/custom bg
  - Use renderer.setPixelRatio(window.devicePixelRatio) for crisp rendering
  - Always add resize handler: window.addEventListener('resize', onResize)
  - Use requestAnimationFrame loop for smooth 60fps

CANVAS RULES:
  - Canvas must fill 100% of viewport: width:100vw; height:100vh
  - Never use position:fixed on canvas — use position:absolute inside a relative container` : ''}

QUALITY MANDATES:
- The animation must be VISUALLY STUNNING — something users share on social media
- Smooth 60fps performance (use requestAnimationFrame, avoid layout thrashing)
- Mouse/touch interactive where applicable (mouse parallax, click burst, hover glow)
- Rich color palette: deep darks with vibrant neon accents or cosmic gradients
- UI overlay (if any) uses glassmorphism: rgba(255,255,255,0.05) + backdrop-filter:blur(20px)
- Loading animation before main reveal (GSAP 0.5s entrance timeline)
- NO Lorem ipsum — all text content must match the user's actual request

TECHNICAL:
- Output ONLY the raw file content — no markdown fences, no explanations
- CDN globals only (THREE, gsap, ScrollTrigger, tsParticles, VANTA) — NEVER use ES6 import
- All event listeners must be added after DOMContentLoaded
- Three.js BufferGeometry only (no legacy Geometry)`;

    const content = await callClaudeSonnet(
      `Task: ${userPrompt}\nTechnique: ${plan.technique}${ctx}\n\nGenerate: ${fileMeta.path}\nRole: ${fileMeta.description}`,
      systemPrompt, 8192, undefined, meter
    );

    return content.replace(/^```[\w]*\n?/, '').replace(/```\s*$/, '').trim();
  }

  // ─── Quality Pass ─────────────────────────────────────────────────────────────

  private async qualityPass(userPrompt: string, files: FileEntry[], meter: UsageMeter): Promise<FileEntry[]> {
    if (files.length === 0) return files;
    const summary = files.map(f => `=== ${f.path} ===\n${f.content}`).join('\n\n');

    const systemPrompt = `You are an animation code reviewer. Check and fix technical correctness and visual quality.

TECHNICAL CHECKS:
- Three.js: renderer.setClearColor set, resize handler present, RAF loop running, BufferGeometry used
- GSAP: plugins registered (ScrollTrigger, MotionPathPlugin), Lenis connected to ticker
- Canvas: canvas sized to viewport, context retrieved correctly, RAF loop present
- CDN scripts: all referenced globals actually loaded from CDN in index.html
- No broken JS references between files
- No ES6 import/require in browser scripts

QUALITY CHECKS:
- Animation runs on page load without any user interaction required
- Mouse interaction implemented (mousemove parallax OR click burst)
- Colors are vibrant and intentional — not default grey/white
- Performance: no synchronous heavy operations in RAF loop
- If any placeholder text exists → replace with real content

Return ONLY valid JSON array (no markdown): [{"path":"...","content":"...","fixed":true/false}]
Return ALL files even if unchanged.`;

    try {
      const response = await callClaudeSonnet(
        `Prompt: ${userPrompt.slice(0, 200)}\n\nReview:\n${summary.slice(0, 14000)}`,
        systemPrompt, 8192, undefined, meter
      );
      const cleaned = response.replace(/^```[\w]*\n?/gm, '').replace(/```\s*$/gm, '').trim();
      const start = cleaned.indexOf('[');
      const end = cleaned.lastIndexOf(']');
      if (start === -1 || end === -1) return files;
      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as FileEntry[];
      if (!Array.isArray(parsed) || parsed.length === 0) return files;
      const valid = parsed.every(f => typeof f.path === 'string' && typeof f.content === 'string');
      return valid ? parsed.map(f => ({ path: f.path, content: f.content })) : files;
    } catch {
      return files;
    }
  }
}
