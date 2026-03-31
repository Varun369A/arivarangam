/**
 * TaskOrchestrator — The Brain
 *
 * Single entry point for ALL task categories.
 * Replaces the 17 individual engine files with a unified:
 *   Analyze → Plan → Build → Review → Repair → Complete
 *
 * Adding a new category = add a CategoryRuleSet in rules/categories.ts
 */

import { prisma } from '@arivarangam/db';
import { UsageMeter } from '../services/UsageMeter';
import { CATEGORY_RULES } from '../rules/categories';
import { analyzePrompt }    from './phases/AnalyzePhase';
import { createDesignSpec } from './phases/DesignSpecPhase';
import { planBuild }        from './phases/PlanPhase';
import { buildFiles }       from './phases/BuildPhase';
import { reviewFiles }      from './phases/ReviewPhase';
import { repairFiles }      from './phases/RepairPhase';
import type { OnEvent, BuiltFile } from './types';

// ─── Character event helpers ──────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function charSpeak(onEvent: OnEvent, character: string, text: string, durationMs = 5500): Promise<void> {
  await onEvent({ type: 'log', data: { isCharacterEvent: true, character, action: 'speak', text, duration: durationMs }, timestamp: new Date().toISOString() });
}

async function charThink(onEvent: OnEvent, character: string, text: string, durationMs = 5000): Promise<void> {
  await onEvent({ type: 'log', data: { isCharacterEvent: true, character, action: 'think', text, duration: durationMs }, timestamp: new Date().toISOString() });
}

async function charCall(onEvent: OnEvent, from: string, to: string, text: string, waitMs = 3500): Promise<void> {
  await onEvent({ type: 'log', data: { isCharacterEvent: true, character: from, action: 'call', text, targetCharacter: to }, timestamp: new Date().toISOString() });
  await sleep(waitMs);
}

async function charReturn(onEvent: OnEvent, character: string, text: string, waitMs = 3200): Promise<void> {
  await onEvent({ type: 'log', data: { isCharacterEvent: true, character, action: 'return', text }, timestamp: new Date().toISOString() });
  await sleep(waitMs);
}

// ─── Credit update helper ─────────────────────────────────────────────────────

async function emitCreditUpdate(onEvent: OnEvent, meter: UsageMeter, isAdmin: boolean): Promise<void> {
  const creditsUsed = isAdmin ? 0 : meter.toCredits();
  await onEvent({
    type: 'credit_update',
    data: { creditsUsed, isAdmin },
    timestamp: new Date().toISOString(),
  });
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class TaskOrchestrator {
  async execute(task: any, onEvent: OnEvent): Promise<void> {
    const meter = new UsageMeter();
    const { id: taskId, userId, category, prompt } = task;
    const isAdmin: boolean = !!(task as any).isAdmin;

    // ── Phase 0: Route check ─────────────────────────────────────────────────
    // Some categories have dedicated engines that handle non-file output
    if (['image', 'voice', 'research'].includes(category)) {
      await this.delegateToLegacyEngine(task, onEvent);
      return;
    }

    const categoryRules = CATEGORY_RULES[category];
    if (!categoryRules) {
      throw new Error(`No rules defined for category: ${category}`);
    }

    // ── Phase 1: Analyze ─────────────────────────────────────────────────────
    await charThink(onEvent, 'claude', `Let me understand what you need — ${category} task…`, 3000);
    const analysis = await analyzePrompt(prompt, category, onEvent);
    await charSpeak(onEvent, 'claude', `Got it — ${analysis.domain}. Let me plan this out.`, 3000);

    // ── Phase 2: Design Spec (visual blueprint) ───────────────────────────────
    const VISUAL_CATEGORIES = ['web', 'animation', 'presentation', 'banner', 'brand', 'design_system', 'dataviz', 'logo', 'mobile', 'content', 'code'];
    let designSpec = null;
    if (VISUAL_CATEGORIES.includes(category)) {
      // Call Perplexity for design research on all non-trivial tasks
      if (analysis.complexity !== 'simple') {
        await charCall(onEvent, 'claude', 'perplexity', `I need design research for this ${analysis.domain}. Perplexity, you're up!`, 1500);
        await charSpeak(onEvent, 'perplexity', `On it! Researching ${analysis.domain} design patterns, trends, and best practices…`, 5500);
      }
      designSpec = await createDesignSpec(prompt, category, analysis, onEvent, meter);
      if (analysis.complexity !== 'simple') {
        await charSpeak(onEvent, 'perplexity', `Found great references for ${analysis.domain}. Here's the research summary for Claude!`, 5000);
        await charReturn(onEvent, 'perplexity', 'All done — research passed to Claude. See you next time!', 1500);
      }
      await charSpeak(onEvent, 'claude', `Design blueprint ready. Starting to build…`, 2500);
    }

    // ── Phase 3: Plan ────────────────────────────────────────────────────────
    // Bring ChatGPT for suggestions on complex tasks
    if (analysis.complexity === 'complex') {
      await charCall(onEvent, 'claude', 'chatgpt', 'Hey ChatGPT — any creative suggestions on the approach for this one?', 1500);
      await charSpeak(onEvent, 'chatgpt', `For a ${analysis.domain}, I'd focus on UX-first design — make it feel intuitive before making it look fancy.`, 5500);
      await charSpeak(onEvent, 'chatgpt', `Also consider the user journey: clear CTAs, smooth transitions, and a strong visual hierarchy.`, 5000);
      await charReturn(onEvent, 'chatgpt', 'Good luck Claude — you\'ve totally got this. Build something amazing!', 1500);
    }
    const plan = await planBuild(prompt, category, analysis, categoryRules, onEvent, meter);
    await emitCreditUpdate(onEvent, meter, isAdmin);
    await charThink(onEvent, 'claude', `Building ${plan.files.length} files…`, 2000);

    // ── Phase 4: Build ───────────────────────────────────────────────────────
    let files = await buildFiles(prompt, category, analysis, plan, categoryRules, onEvent, meter, designSpec);
    await emitCreditUpdate(onEvent, meter, isAdmin);

    // ── Phase 5: Review ──────────────────────────────────────────────────────
    if (process.env.GEMINI_API_KEY) {
      await charCall(onEvent, 'claude', 'gemini', 'Gemini — can you review this output for me?', 2000);
      await charSpeak(onEvent, 'gemini', `Reviewing your ${analysis.domain} — checking quality and consistency…`, 3000);
    } else {
      await charThink(onEvent, 'claude', 'Reviewing the output…', 2500);
    }
    const review = await reviewFiles(files, categoryRules, onEvent, meter);
    if (process.env.GEMINI_API_KEY) {
      await charReturn(onEvent, 'gemini', `Review done — scored ${review.score}/10. ${review.passed ? 'Looks solid!' : 'Found a few things to fix.'}`, 2500);
    }

    // ── Phase 6: Repair (if needed) ──────────────────────────────────────────
    if (!review.passed && categoryRules.maxRepairAttempts > 0) {
      await charSpeak(onEvent, 'claude', 'Found a few things to fix — one moment…', 3000);
      files = await repairFiles(files, review, categoryRules, onEvent, meter);
      const review2 = await reviewFiles(files, categoryRules, onEvent, meter);
      if (!review2.passed && categoryRules.maxRepairAttempts > 1) {
        files = await repairFiles(files, review2, categoryRules, onEvent, meter);
      }
    }

    // ── Phase 7: Complete ────────────────────────────────────────────────────
    await this.completeTask(taskId, userId, files, meter, onEvent, isAdmin);
  }

  // ─── Complete Task ──────────────────────────────────────────────────────────

  private async completeTask(
    taskId: string,
    userId: string,
    files: BuiltFile[],
    meter: UsageMeter,
    onEvent: OnEvent,
    isAdmin = false
  ): Promise<void> {
    const creditsUsed = isAdmin ? 0 : meter.toCredits();

    // Store files in task metadata
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        creditsActuallyUsed: creditsUsed,
        completedAt: new Date(),
        metadata: {
          files: files.map(f => ({
            path: f.path,
            content: f.content,
            language: f.language,
          })),
          engineData: { orchestrated: true, fileCount: files.length },
        } as any,
      },
    });

    // Celebrate!
    await onEvent({ type: 'log', data: { isCharacterEvent: true, character: 'claude', action: 'celebrate', text: `Done! Built ${files.length} files. Let me show you around!`, duration: 4000 }, timestamp: new Date().toISOString() });

    await onEvent({
      type: 'completed',
      data: {
        message: `Build complete — ${files.length} file(s) generated`,
        fileCount: files.length,
        creditsUsed,
        files: files.map(f => ({ path: f.path, language: f.language })),
      },
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Legacy Engine Delegation ───────────────────────────────────────────────
  // image/voice/research have specialized output (URL, audio, web search) — keep their engines

  private async delegateToLegacyEngine(task: any, onEvent: OnEvent): Promise<void> {
    const category = task.category as string;
    switch (category) {
      case 'image': {
        const { ImageEngine } = await import('../engines/ImageEngine');
        await new ImageEngine().execute(task, onEvent);
        break;
      }
      case 'voice': {
        const { VoiceEngine } = await import('../engines/VoiceEngine');
        await new VoiceEngine().execute(task, onEvent);
        break;
      }
      case 'research': {
        const { ResearchEngine } = await import('../engines/ResearchEngine');
        await new ResearchEngine().execute(task, onEvent);
        break;
      }
      default:
        throw new Error(`Unknown legacy category: ${category}`);
    }
  }
}

export const taskOrchestrator = new TaskOrchestrator();
