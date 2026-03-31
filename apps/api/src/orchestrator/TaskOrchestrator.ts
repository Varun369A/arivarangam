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
import { analyzePrompt }  from './phases/AnalyzePhase';
import { planBuild }      from './phases/PlanPhase';
import { buildFiles }     from './phases/BuildPhase';
import { reviewFiles }    from './phases/ReviewPhase';
import { repairFiles }    from './phases/RepairPhase';
import type { OnEvent, BuiltFile } from './types';

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
    const analysis = await analyzePrompt(prompt, category, onEvent);

    // ── Phase 2: Plan ────────────────────────────────────────────────────────
    const plan = await planBuild(prompt, category, analysis, categoryRules, onEvent, meter);

    // ── Phase 3: Build ───────────────────────────────────────────────────────
    let files = await buildFiles(prompt, category, analysis, plan, categoryRules, onEvent, meter);

    // ── Phase 4: Review ──────────────────────────────────────────────────────
    const review = await reviewFiles(files, categoryRules, onEvent, meter);

    // ── Phase 5: Repair (if needed) ──────────────────────────────────────────
    if (!review.passed && categoryRules.maxRepairAttempts > 0) {
      files = await repairFiles(files, review, categoryRules, onEvent, meter);

      // Second review after repair
      const review2 = await reviewFiles(files, categoryRules, onEvent, meter);
      if (!review2.passed && categoryRules.maxRepairAttempts > 1) {
        files = await repairFiles(files, review2, categoryRules, onEvent, meter);
      }
    }

    // ── Phase 6: Complete ────────────────────────────────────────────────────
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
