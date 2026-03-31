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

async function charSpeak(onEvent: OnEvent, character: string, text: string, durationMs = 4000): Promise<void> {
  await onEvent({ type: 'log', data: { isCharacterEvent: true, character, action: 'speak', text, duration: durationMs }, timestamp: new Date().toISOString() });
}

async function charThink(onEvent: OnEvent, character: string, text: string, durationMs = 3500): Promise<void> {
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

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class TaskOrchestrator {
  async execute(task: any, onEvent: OnEvent): Promise<void> {
    const meter = new UsageMeter();
    const { id: taskId, userId, category, prompt } = task;

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
    const VISUAL_CATEGORIES = ['web', 'animation', 'presentation', 'banner', 'brand', 'design-system', 'dataviz', 'logo', 'mobile', 'content', 'code'];
    let designSpec = null;
    if (VISUAL_CATEGORIES.includes(category)) {
      // Call Perplexity for research/design reference if complex
      if (analysis.complexity === 'complex' || analysis.hasAnimationRequest) {
        await charCall(onEvent, 'claude', 'perplexity', 'I need design research for this one. Perplexity!', 2500);
        await charSpeak(onEvent, 'perplexity', `Researching ${analysis.domain} design patterns…`, 3000);
      }
      designSpec = await createDesignSpec(prompt, category, analysis, onEvent, meter);
      if (analysis.complexity === 'complex' || analysis.hasAnimationRequest) {
        await charReturn(onEvent, 'perplexity', 'Research done — here\'s what I found for Claude.', 2500);
      }
      await charSpeak(onEvent, 'claude', `Design blueprint ready. Starting to build…`, 2500);
    }

    // ── Phase 3: Plan ────────────────────────────────────────────────────────
    // Optionally bring ChatGPT for suggestions on complex tasks
    if (analysis.complexity === 'complex') {
      await charCall(onEvent, 'claude', 'chatgpt', 'Hey ChatGPT — any suggestions on the approach?', 2000);
      await charSpeak(onEvent, 'chatgpt', `For a ${analysis.domain}, I'd suggest focusing on UX first.`, 2500);
      await charReturn(onEvent, 'chatgpt', 'Good luck, Claude — you\'ve got this!', 2000);
    }
    const plan = await planBuild(prompt, category, analysis, categoryRules, onEvent, meter);
    await charThink(onEvent, 'claude', `Building ${plan.files.length} files…`, 2000);

    // ── Phase 4: Build ───────────────────────────────────────────────────────
    let files = await buildFiles(prompt, category, analysis, plan, categoryRules, onEvent, meter, designSpec);

    // ── Phase 5: Review ──────────────────────────────────────────────────────
    await charThink(onEvent, 'claude', 'Reviewing the output…', 2500);
    const review = await reviewFiles(files, categoryRules, onEvent, meter);

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
    await this.completeTask(taskId, userId, files, meter, onEvent);
  }

  // ─── Complete Task ──────────────────────────────────────────────────────────

  private async completeTask(
    taskId: string,
    userId: string,
    files: BuiltFile[],
    meter: UsageMeter,
    onEvent: OnEvent
  ): Promise<void> {
    const creditsUsed = meter.toCredits();

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
