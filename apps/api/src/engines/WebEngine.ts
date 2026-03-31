import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeSonnet } from '../connectors/claude';
import { taskService } from '../services/TaskService';
import { UsageMeter } from '../services/UsageMeter';
import { autoRepairEngine } from './AutoRepairEngine';
import { uiQualityEngine } from './UIQualityEngine';

// ─── Installed Library Stack (via CDN for browser preview) ────────────────────
//
// THREE.JS      https://cdnjs.cloudflare.com/ajax/libs/three.js/0.157.0/three.min.js
// GSAP          https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js
// ScrollTrigger https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js
// Lenis         https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/bundled/lenis.min.js
// tsParticles   https://cdn.jsdelivr.net/npm/@tsparticles/all@3.6.0/tsparticles.bundle.min.js
// Vanta         https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.waves.min.js
// Lottie        https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js
// AOS           https://unpkg.com/aos@2.3.4/dist/aos.js (+ aos.css)
// Swiper        https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js (+ css)
// React 18      https://unpkg.com/react@18/umd/react.development.js
// ReactDOM      https://unpkg.com/react-dom@18/umd/react-dom.development.js
// Babel         https://unpkg.com/@babel/standalone/babel.min.js
// Tailwind      https://cdn.tailwindcss.com
//
// npm equivalents also generated in package.json for local dev

interface FileEntry { path: string; content: string; }
interface FilePlan {
  files: { path: string; description: string; language: string }[];
  techStack: string[];
  notes: string;
}

// ─── CDN Boilerplate inserted into every index.html ───────────────────────────

const CDN_STACK = `
  <!-- CSS -->
  <link rel="stylesheet" href="https://unpkg.com/aos@2.3.4/dist/aos.css" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css" />

  <!-- Core UI -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- 3D & WebGL -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/0.157.0/three.min.js"></script>

  <!-- Animations -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@studio-freight/lenis@1.0.42/bundled/lenis.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>

  <!-- Particles & Visual FX -->
  <script src="https://cdn.jsdelivr.net/npm/@tsparticles/all@3.6.0/tsparticles.bundle.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.waves.min.js"></script>

  <!-- Components -->
  <script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js"></script>
  <script src="https://unpkg.com/aos@2.3.4/dist/aos.js"></script>

  <!-- React + Babel (for JSX components) -->
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>`;

const NPM_PACKAGE_JSON = (projectName: string) => JSON.stringify({
  name: projectName.toLowerCase().replace(/\s+/g, '-'),
  version: '1.0.0',
  type: 'module',
  scripts: {
    dev: 'vite',
    build: 'vite build',
    preview: 'vite preview',
  },
  dependencies: {
    react: '^18.3.0',
    'react-dom': '^18.3.0',
    three: '^0.157.0',
    '@react-three/fiber': '^8.15.0',
    '@react-three/drei': '^9.88.0',
    '@splinetool/react-spline': '^2.2.6',
    'framer-motion': '^11.0.0',
    gsap: '^3.12.2',
    '@studio-freight/lenis': '^1.0.42',
    '@tsparticles/react': '^3.0.0',
    '@tsparticles/all': '^3.6.0',
    'lottie-react': '^2.4.0',
    vanta: '^0.5.24',
    swiper: '^11.0.0',
    aos: '^2.3.4',
  },
  devDependencies: {
    vite: '^5.0.0',
    '@vitejs/plugin-react': '^4.2.0',
    tailwindcss: '^3.4.0',
    autoprefixer: '^10.4.0',
    postcss: '^8.4.0',
    typescript: '^5.4.0',
    '@types/react': '^18.3.0',
    '@types/react-dom': '^18.3.0',
    '@types/three': '^0.157.0',
  },
}, null, 2);

// ─── WebEngine ────────────────────────────────────────────────────────────────

export class WebEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (e: TaskEvent) => onEvent(e);
    const meter = new UsageMeter();

    await prisma.task.update({ where: { id: task.id }, data: { status: 'running' } });

    try {
      await emit({ type: 'log', data: { message: '🔍 Analyzing prompt and selecting visual libraries...' }, timestamp: new Date().toISOString() });

      const plan = await this.planStructure(task.prompt, meter);

      await emit({ type: 'log', data: { message: `📁 File plan ready: ${plan.files.length} files | Stack: ${plan.techStack.join(', ')}` }, timestamp: new Date().toISOString() });

      const generatedFiles: FileEntry[] = [];

      for (let i = 0; i < plan.files.length; i++) {
        const fileMeta = plan.files[i];
        await emit({ type: 'log', data: { message: `⚡ Building ${fileMeta.path} (${i + 1}/${plan.files.length})...` }, timestamp: new Date().toISOString() });

        const content = await this.generateFile(task.prompt, fileMeta, generatedFiles, plan, meter);
        generatedFiles.push({ path: fileMeta.path, content });

        await emit({
          type: 'file_created',
          data: { path: fileMeta.path, content, language: fileMeta.language, index: i + 1, total: plan.files.length },
          timestamp: new Date().toISOString(),
        });
      }

      // Auto-quality pass
      await emit({ type: 'log', data: { message: '🎨 Running visual quality & animation pass...' }, timestamp: new Date().toISOString() });
      const fixedFiles = await this.qualityPass(task.prompt, generatedFiles, meter);

      for (const fixed of fixedFiles) {
        const original = generatedFiles.find(f => f.path === fixed.path);
        if (original && original.content !== fixed.content) {
          await emit({
            type: 'file_updated',
            data: { path: fixed.path, content: fixed.content, reason: 'Visual quality enhancement applied' },
            timestamp: new Date().toISOString(),
          });
        }
      }

      // AutoRepair: validate CDN order, broken refs, GSAP registration
      const repairedFiles = await autoRepairEngine.repairFiles(fixedFiles, task.prompt, onEvent, meter);

      // UIQuality: grade and improve until score ≥ 75/100
      const { files: qualityFiles, score } = await uiQualityEngine.gradeAndImprove(repairedFiles, task.prompt, onEvent, meter);

      await emit({ type: 'log', data: { message: `📊 Final quality score: ${score.total}/100` }, timestamp: new Date().toISOString() });

      const creditsUsed = meter.toCredits();
      await taskService.completeTask(task.id, creditsUsed, {
        files: qualityFiles, techStack: plan.techStack, fileCount: qualityFiles.length, qualityScore: score.total, usage: meter.summary(),
      });

      await emit({
        type: 'completed',
        data: { files: fixedFiles, creditsUsed, fileCount: fixedFiles.length, message: `✅ Built ${fixedFiles.length} files with Three.js + GSAP + Lenis + tsParticles stack` },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({ type: 'error', data: { message: err.message ?? 'WebEngine build failed' }, timestamp: new Date().toISOString() });
      throw err;
    }
  }

  // ─── Plan File Structure ──────────────────────────────────────────────────────

  private async planStructure(prompt: string, meter: UsageMeter): Promise<FilePlan> {
    const systemPrompt = `You are an expert creative technologist planning an immersive web project.

LIBRARY STACK INSTALLED (choose which to use based on the prompt):
- Three.js (global: THREE) — for 3D scenes, rotating objects, particle geometry, WebGL backgrounds
- GSAP + ScrollTrigger (globals: gsap, ScrollTrigger) — scroll animations, timelines, stagger — ALWAYS USE
- Lenis (global: Lenis) — smooth scroll — ALWAYS USE
- tsParticles (global: tsParticles) — interactive particle systems, confetti, bubbles
- Vanta (global: VANTA) — animated backgrounds: VANTA.WAVES, VANTA.NET, VANTA.BIRDS, VANTA.FOG — use for hero bg
- Lottie (global: lottie) — After Effects animations, JSON animation files
- AOS (global: AOS) — simple scroll reveal via data-aos attributes (use as lightweight ScrollTrigger supplement)
- Swiper (global: Swiper) — touch sliders, carousels, testimonials
- React 18 + Babel (globals: React, ReactDOM) — for component-based UI if needed
- Tailwind CSS — utility classes

DECIDE WHICH LIBRARIES TO USE based on the prompt:
- Landing page / marketing → Three.js hero OR Vanta bg, GSAP ScrollTrigger, Lenis, Swiper for testimonials, tsParticles
- Portfolio → Three.js 3D models, GSAP, Lenis
- Dashboard/App → React + Babel, GSAP, Lottie icons
- Interactive/Game → Three.js, tsParticles, GSAP
- Product showcase → Three.js orbit controls, GSAP, Swiper gallery
- Blog/Article → GSAP ScrollTrigger, Lenis, AOS, NO Three.js

FILE STRUCTURE (always include):
- index.html — main entry, CDN scripts in <head>, complete working preview
- style.css — glassmorphism, animations, custom properties, 3D transforms, scrollbar
- app.js — main app logic, GSAP init, Lenis init, Three.js scene, all interactions
- animations.js — if heavy GSAP/Three.js sequences (split for clarity)
- particles.js — if tsParticles config is complex
- package.json — npm project for local dev (Vite + React + all npm equivalents)
- README.md — features, preview instructions, library credits

Return ONLY valid JSON:
{
  "files": [{"path": "...", "description": "...", "language": "..."}],
  "techStack": [...],
  "notes": "which libraries used and why"
}`;

    const response = await callClaudeSonnet(
      `Plan immersive web project for: ${prompt}`,
      systemPrompt, 2048, undefined, meter
    );
    return this.parseJSON<FilePlan>(response, {
      files: [
        { path: 'index.html', description: 'Main HTML with CDN libraries', language: 'html' },
        { path: 'style.css', description: 'Styles and animations', language: 'css' },
        { path: 'app.js', description: 'Main application logic', language: 'javascript' },
        { path: 'package.json', description: 'npm project config', language: 'json' },
        { path: 'README.md', description: 'Setup and preview instructions', language: 'markdown' },
      ],
      techStack: ['Three.js', 'GSAP', 'Lenis', 'tsParticles', 'Tailwind'],
      notes: '',
    });
  }

  // ─── Generate Single File ─────────────────────────────────────────────────────

  private async generateFile(
    userPrompt: string,
    fileMeta: { path: string; description: string; language: string },
    existingFiles: FileEntry[],
    plan: FilePlan,
    meter: UsageMeter
  ): Promise<string> {
    const isHtml = fileMeta.path.endsWith('.html');
    const isPackageJson = fileMeta.path === 'package.json';

    // For package.json — generate with all npm equivalents
    if (isPackageJson) {
      const name = userPrompt.split(' ').slice(0, 3).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'web-project';
      return NPM_PACKAGE_JSON(name);
    }

    const contextSummary = existingFiles.length > 0
      ? `\n\nAlready generated:\n${existingFiles.map(f => `--- ${f.path} ---\n${f.content.slice(0, 600)}${f.content.length > 600 ? '\n...' : ''}`).join('\n\n')}`
      : '';

    const htmlInstructions = isHtml ? `
CRITICAL HTML RULES:
1. Include ALL CDN scripts in this EXACT order in <head>:
${CDN_STACK}

2. GSAP init (in DOMContentLoaded):
   gsap.registerPlugin(ScrollTrigger);

3. Lenis init (smooth scroll):
   const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
   lenis.on('scroll', ScrollTrigger.update);
   gsap.ticker.add((time) => lenis.raf(time * 1000));
   gsap.ticker.lagSmoothing(0);

4. AOS init: AOS.init({ once: true, duration: 800, offset: 80 });
5. Swiper init (if using carousels): new Swiper('.swiper', { loop: true, autoplay: { delay: 3000 } });
6. CDN globals ONLY — never ES6 import in <script> tags` : '';

    const systemPrompt = `You are a world-class creative developer building an immersive web experience for Arivarangam — India's AI platform. You use cutting-edge web technologies to create experiences that compete with Awwwards-winning websites.

LIBRARY STACK INSTALLED IN THIS PROJECT:
${plan.techStack.join(', ')}

NOTES FROM ARCHITECT: ${plan.notes}

━━━ DESIGN INTELLIGENCE (ui-ux-pro-max v2.5) ━━━

COLOR PALETTE — select by domain:
- SaaS/AI/Tech:      #4F46E5 + #7C3AED + #0F172A + #818CF8 (indigo-violet dark)
- Fintech/Finance:   #1A1B4B + #00D4AA + #FFD700 + #0F0F23 (navy-mint-gold)
- Health/Wellness:   #059669 + #34D399 + #F0FDF4 + #065F46 (emerald fresh)
- Creative/Agency:   #FF6B6B + #4ECDC4 + #1A1A2E + #FFEAA7 (coral-teal)
- Gaming/Entertain:  #00FF87 + #FF007A + #0A0A0F + #7000FF (neon cosmic)
- E-commerce:        #F97316 + #EF4444 + #1C1917 + #FFF7ED (fire warm)
- Corporate/B2B:     #1E40AF + #3B82F6 + #0F172A + #E2E8F0 (trustworthy blue)
- Default (dark):    #4F46E5 + #7C3AED + #050714 + #818CF8

TYPOGRAPHY — Google Fonts CDN (pick one pairing):
- Modern SaaS:     Space Grotesk 700/800 + DM Sans 400/500
- Premium/Luxury:  Playfair Display 700/900 + Inter 400/500
- Tech/AI:         Sora 700/800 + IBM Plex Sans 400
- Startup:         Outfit 700/800 + Plus Jakarta Sans 400/500
- Creative Agency: Clash Display 700 + Satoshi 400
- Elegant Brand:   Cormorant Garamond 600i + Jost 300/400
Add to HTML: <link href="https://fonts.googleapis.com/css2?family=[choice]&display=swap" rel="stylesheet">

STYLE PRESETS — pick based on prompt mood:
- Glassmorphism (default dark): rgba cards + backdrop-blur-xl + white glow borders
- Bento Grid: CSS grid-template-areas, mixed colspan cells, colored accent cards, brutalist grid gaps
- Cosmic Dark: animated star field, nebula radial gradients, neon glow on text
- Claymorphism: border-radius:24-32px, pastel bg, double drop shadows, bubbly shapes
- Brutalism: 3-4px solid black borders, raw grid, ultra-high contrast, intentional rawness
- Neumorphism: #e0e5ec bg, dual inset/outset shadows, minimal flat design

UX MANDATES:
- Every button/card has :hover transform:translateY(-2px) + box-shadow glow
- Loading skeleton states on any async content
- Smooth scroll with Lenis, visible scroll-progress bar
- Mobile-first, touch targets min 44px, responsive breakpoints (320/768/1024/1280)
- Animated entrance: GSAP stagger for lists, fade-up for sections
- Micro-interactions: button press scale(0.97), icon rotate on hover
- 60fps guaranteed: use will-change:transform on animated elements

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

VISUAL QUALITY MANDATE — EVERY FILE MUST HAVE:
- Rich gradients (linear-gradient, radial-gradient) — NEVER flat solid colors
- Glassmorphism on cards: background:rgba(255,255,255,0.05); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1)
- Every interactive element: transform + box-shadow on :hover with 0.3s ease
- Premium dark theme default: #050714 or #0a0f1e as base
- Fluid typography: font-size:clamp(48px,8vw,96px) for heroes, letter-spacing:-0.04em, font-weight:900
- Gradient clip text: background:linear-gradient(135deg,#6366f1,#a855f7); -webkit-background-clip:text; -webkit-text-fill-color:transparent
- Depth: multi-layer box-shadows (near + far shadow)
- 3D card tilt: CSS perspective + JS mousemove rotateX/rotateY

ANIMATION REQUIREMENTS (for JS/HTML files):
- Hero entrance: GSAP timeline — stagger text chars, fade up subtitle, slide in CTA
- Section reveals: gsap.from('.section', {opacity:0, y:60, stagger:0.15, scrollTrigger:{trigger:'.section',start:'top 80%'}})
- Three.js scene: if in stack — animated rotation, ambient + point lights, environment map
- Vanta background: if in stack — VANTA.WAVES({el:'#hero', THREE, color:0x6366f1, waveHeight:15})
- tsParticles: if in stack — interactive particles that connect on mouse hover
- Floating orbs: 2-3 blurred gradient orbs in hero with GSAP x/y oscillation
- Counter animation: gsap.to counter when in view
- Custom cursor: gsap.quickTo for x,y follow with lag

CONTENT REQUIREMENTS:
- ZERO placeholders, ZERO "Lorem ipsum", ZERO "Coming soon"
- All text content must match the user's actual prompt domain
- Minimum sections for landing: Hero, Features (6 items), How It Works (3 steps), Stats (4 counters), CTA
- All features must be fully interactive and functional
${htmlInstructions}

OUTPUT: raw file content only — no markdown fences, no explanations`;

    const filePrompt = `USER PROMPT: ${userPrompt}

PROJECT TECH STACK: ${plan.techStack.join(', ')}
${contextSummary}

Generate the complete content for: ${fileMeta.path}
Role of this file: ${fileMeta.description}`;

    const content = await callClaudeSonnet(filePrompt, systemPrompt, 8192, undefined, meter);
    return this.stripFences(content, fileMeta.language);
  }

  // ─── Quality Pass ─────────────────────────────────────────────────────────────

  private async qualityPass(userPrompt: string, files: FileEntry[], meter: UsageMeter): Promise<FileEntry[]> {
    if (files.length === 0) return files;

    const summary = files.map(f => `=== ${f.path} ===\n${f.content}`).join('\n\n');

    const systemPrompt = `You are a creative director and senior developer reviewing a web project.

Return ONLY a valid JSON array: [{"path":"...","content":"...","fixed":true/false}]

CHECK AND FIX — Technical:
- CDN scripts in correct order: AOS.css, Swiper.css → Tailwind → THREE → gsap → ScrollTrigger → Lenis → lottie → tsParticles → Vanta → Swiper → AOS → React → ReactDOM → Babel → app scripts
- gsap.registerPlugin(ScrollTrigger) called before any ScrollTrigger usage
- Lenis initialized and connected to GSAP ticker
- Three.js scene has renderer, camera, scene, animation loop (renderer.setAnimationLoop)
- Vanta needs THREE passed as option: VANTA.WAVES({ el, THREE, ... })
- tsParticles initialized with tsParticles.load()
- AOS.init() called on DOMContentLoaded
- No broken JS references

CHECK AND FIX — Visual Quality:
- If any flat solid color backgrounds found → replace with gradients
- If hero has no animation → add GSAP timeline entrance animation
- If cards have no hover effect → add transform:translateY(-8px) + box-shadow glow on :hover
- If headings are not using gradient clip text → add gradient text to h1/h2
- If GSAP ScrollTrigger not used on sections → add scroll-triggered reveals
- If no floating orbs in hero → add 2 blurred gradient orbs with GSAP oscillation
- If placeholder content exists → replace with real domain-specific content
- Verify Lenis smooth scroll is working (raf connected to gsap ticker)

Return ALL files even if unchanged.`;

    try {
      const response = await callClaudeSonnet(
        `Original prompt: ${userPrompt.slice(0, 200)}\n\nReview:\n${summary.slice(0, 14000)}`,
        systemPrompt, 8192, undefined, meter
      );
      const parsed = this.parseJSON<FileEntry[]>(response, []);
      if (!parsed || !Array.isArray(parsed) || parsed.length === 0) return files;
      const valid = parsed.every(f => typeof f.path === 'string' && typeof f.content === 'string');
      return valid ? parsed.map(f => ({ path: f.path, content: f.content })) : files;
    } catch {
      return files;
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private stripFences(text: string, lang: string): string {
    return text
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/^```$/gm, '')
      .trim();
  }

  private parseJSON<T>(text: string, fallback: T): T {
    const isArray = Array.isArray(fallback);
    const open = isArray ? '[' : '{';
    const close = isArray ? ']' : '}';
    const cleaned = text.replace(/^```[\w]*\n?/gm, '').replace(/^```$/gm, '');
    const start = cleaned.indexOf(open);
    if (start === -1) return fallback;
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\' && inStr) { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === open) depth++;
      else if (ch === close && --depth === 0) {
        try { return JSON.parse(cleaned.slice(start, i + 1)); } catch { return fallback; }
      }
    }
    return fallback;
  }
}
