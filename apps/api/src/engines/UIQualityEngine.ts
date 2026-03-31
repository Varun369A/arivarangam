import type { TaskEvent } from '@arivarangam/types';
import { callClaudeHaiku, callClaudeSonnet } from '../connectors/claude';
import { UsageMeter } from '../services/UsageMeter';

// ─── UIQualityEngine ──────────────────────────────────────────────────────────
//
// Scores web/animation output on 5 dimensions, then regenerates failing sections.
// Used as a post-processor by WebEngine and AnimationEngine.
//
// Scoring dimensions (each 0-20):
//  1. Visual Impact     — gradients, animations, typography quality
//  2. Interactivity     — mouse events, hover states, click interactions
//  3. Technical Correctness — CDN order, GSAP registered, no broken refs
//  4. Content Quality   — no placeholders, real content matching prompt
//  5. Performance       — no layout thrashing in RAF, efficient selectors
//
// Threshold: total ≥ 75/100 to pass.
// Max 2 regeneration attempts before accepting current output.

interface FileEntry { path: string; content: string; }

interface QualityScore {
  visualImpact: number;       // 0-20
  interactivity: number;      // 0-20
  technical: number;          // 0-20
  contentQuality: number;     // 0-20
  performance: number;        // 0-20
  total: number;              // 0-100
  feedback: string[];         // Issues to fix in next iteration
}

const PASS_THRESHOLD = 75;
const MAX_ATTEMPTS = 2;

export class UIQualityEngine {
  /**
   * Grade and optionally regenerate web output until quality threshold is met.
   * @param files - Output files from WebEngine/AnimationEngine
   * @param prompt - Original user prompt
   * @param onEvent - Optional event emitter for progress
   * @param meter - Optional UsageMeter
   * @param regenerateFn - Optional callback to regenerate files if score fails
   */
  async gradeAndImprove(
    files: FileEntry[],
    prompt: string,
    onEvent?: (e: TaskEvent) => void,
    meter?: UsageMeter,
    regenerateFn?: (feedback: string[]) => Promise<FileEntry[]>
  ): Promise<{ files: FileEntry[]; score: QualityScore; attempts: number }> {
    const emit = async (event: TaskEvent) => { if (onEvent) await onEvent(event); };
    const useMeter = meter ?? new UsageMeter();

    let currentFiles = files;
    let attempts = 0;
    let score: QualityScore;

    while (attempts < MAX_ATTEMPTS) {
      attempts++;

      await emit({ type: 'log', data: { message: `🎯 UIQuality: scoring output (attempt ${attempts})...` }, timestamp: new Date().toISOString() });

      score = await this.scoreOutput(currentFiles, prompt, useMeter);

      await emit({
        type: 'log',
        data: {
          message: `📊 Quality score: ${score.total}/100 (Visual:${score.visualImpact} Interactive:${score.interactivity} Technical:${score.technical} Content:${score.contentQuality} Perf:${score.performance})`,
        },
        timestamp: new Date().toISOString(),
      });

      if (score.total >= PASS_THRESHOLD) {
        await emit({ type: 'log', data: { message: `✅ UIQuality: passed with ${score.total}/100` }, timestamp: new Date().toISOString() });
        return { files: currentFiles, score, attempts };
      }

      if (attempts >= MAX_ATTEMPTS || !regenerateFn) {
        await emit({ type: 'log', data: { message: `⚠️ UIQuality: score ${score.total}/100 below threshold but max attempts reached — accepting` }, timestamp: new Date().toISOString() });
        return { files: currentFiles, score, attempts };
      }

      // Below threshold — try to improve
      await emit({ type: 'log', data: { message: `🔧 UIQuality: improving output (score ${score.total}/100, need ${PASS_THRESHOLD})...` }, timestamp: new Date().toISOString() });

      const improved = await this.improveOutput(currentFiles, score, prompt, useMeter);
      if (improved) {
        currentFiles = improved;
        for (const f of improved) {
          const original = currentFiles.find(o => o.path === f.path);
          if (original && original.content !== f.content) {
            await emit({ type: 'file_updated', data: { path: f.path, content: f.content, reason: 'UIQuality improvement' }, timestamp: new Date().toISOString() });
          }
        }
      }
    }

    return { files: currentFiles, score: score!, attempts };
  }

  // ─── Score Output ─────────────────────────────────────────────────────────────

  async scoreOutput(files: FileEntry[], prompt: string, meter: UsageMeter): Promise<QualityScore> {
    const htmlFile = files.find(f => f.path.endsWith('.html'));
    const jsFile = files.find(f => f.path === 'animation.js' || f.path === 'app.js');

    const contentToReview = [
      htmlFile ? `--- index.html ---\n${htmlFile.content.slice(0, 6000)}` : '',
      jsFile ? `--- ${jsFile.path} ---\n${jsFile.content.slice(0, 3000)}` : '',
    ].filter(Boolean).join('\n\n');

    const systemPrompt = `You are a senior UI/UX engineer and creative director reviewing web output.

Score each dimension 0-20, then list specific issues to fix.

Return ONLY valid JSON (no markdown):
{
  "visualImpact": 15,
  "interactivity": 12,
  "technical": 18,
  "contentQuality": 10,
  "performance": 14,
  "feedback": [
    "Hero section uses flat background — add animated gradient or particle system",
    "Buttons have no hover states — add transform:scale(1.05) + box-shadow glow",
    "GSAP ScrollTrigger not registered before use"
  ]
}

SCORING GUIDE:
visualImpact (0-20):
  20: Stunning — gradients, GSAP animations, glassmorphism, floating elements
  15: Good — some animations, decent colors, gradient text
  10: Average — basic styling, minimal animation
  <10: Poor — flat colors, no animation, generic

interactivity (0-20):
  20: Rich — mouse parallax, click bursts, hover glows, smooth transitions
  15: Good — hover states on all interactive elements, smooth cursor
  10: Average — some hover states
  <10: Poor — no hover effects, static UI

technical (0-20):
  20: Perfect — CDN order correct, GSAP registered, Lenis connected, no broken refs
  15: Good — minor issues, all core functionality works
  10: Average — some CDN issues or missing registrations
  <10: Critical — broken CDN, missing gsap.registerPlugin, ES6 imports in browser

contentQuality (0-20):
  20: Perfect — all content matches prompt, no placeholders, real data
  15: Good — mostly real content, minor placeholder
  10: Average — some placeholder text
  <10: Poor — Lorem ipsum or heavy placeholders

performance (0-20):
  20: Optimised — RAF loop, will-change on animated elements, no DOM queries in loops
  15: Good — mostly efficient
  10: Average — minor perf issues
  <10: Poor — heavy sync ops, layout thrashing`;

    try {
      const response = await callClaudeHaiku(contentToReview || `Prompt: ${prompt}`, systemPrompt, 1024, meter);
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        const parsed = JSON.parse(cleaned.slice(start, end + 1));
        const total = (parsed.visualImpact ?? 0) + (parsed.interactivity ?? 0) + (parsed.technical ?? 0) + (parsed.contentQuality ?? 0) + (parsed.performance ?? 0);
        return { ...parsed, total };
      }
    } catch { /* fallback */ }

    // Fallback: neutral score
    return { visualImpact: 15, interactivity: 12, technical: 16, contentQuality: 14, performance: 14, total: 71, feedback: ['Could not score automatically'] };
  }

  // ─── Improve Output ───────────────────────────────────────────────────────────

  private async improveOutput(
    files: FileEntry[],
    score: QualityScore,
    prompt: string,
    meter: UsageMeter
  ): Promise<FileEntry[] | null> {
    const htmlFile = files.find(f => f.path.endsWith('.html'));
    const jsFile = files.find(f => f.path === 'animation.js' || f.path === 'app.js');

    if (!htmlFile && !jsFile) return null;

    const targetFile = htmlFile ?? jsFile!;
    const feedbackList = score.feedback.map(f => `- ${f}`).join('\n');

    const systemPrompt = `You are a world-class UI engineer. Improve this web output to address specific quality issues.

QUALITY ISSUES TO FIX:
${feedbackList}

VISUAL IMPACT FIXES (if score < 16):
- If no animated background: add CSS keyframe gradient animation or GSAP floating orbs
- If flat colors: replace with linear-gradient(135deg, ...) backgrounds
- If no gradient text: add background-clip:text on h1/h2

INTERACTIVITY FIXES (if score < 16):
- Add :hover { transform: scale(1.05); box-shadow: 0 0 20px rgba(99,102,241,0.4); transition: 0.3s ease; } on all buttons/cards
- Add mousemove parallax: document.addEventListener('mousemove', (e) => { ... })

TECHNICAL FIXES (if score < 16):
- Add gsap.registerPlugin(ScrollTrigger, MotionPathPlugin) in DOMContentLoaded
- Ensure Lenis is connected: lenis.on('scroll', ScrollTrigger.update); gsap.ticker.add(t => lenis.raf(t * 1000))
- Fix any CDN script ordering issues

Output ONLY the complete improved file content — no markdown fences.`;

    try {
      const improved = await callClaudeSonnet(
        `Prompt: ${prompt}\n\nImprove this file:\n\n${targetFile.content}`,
        systemPrompt,
        8192,
        undefined,
        meter
      );
      const cleaned = improved.replace(/^```[\w]*\n?/, '').replace(/```\s*$/, '').trim();
      return files.map(f => f.path === targetFile.path ? { path: f.path, content: cleaned } : f);
    } catch {
      return null;
    }
  }
}

export const uiQualityEngine = new UIQualityEngine();
