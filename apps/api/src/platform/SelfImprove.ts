import { prisma } from '@arrivarangam/db';
import { callClaudeSonnet } from '../connectors/claude';

// ─── SelfImprove ─────────────────────────────────────────────────────────────
// Runs nightly at 2am IST. Analyzes past 24h, suggests improvements,
// stores ModelPerformance records.

export class SelfImprove {
  async run(): Promise<void> {
    console.log('[SelfImprove] Starting nightly self-improvement analysis...');

    try {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      // 1. Gather tasks from last 24h
      const tasks = await prisma.task.findMany({
        where: {
          createdAt: { gte: since },
          status: { in: ['completed', 'failed'] },
        },
        select: {
          id: true,
          category: true,
          status: true,
          prompt: true,
          creditsActuallyUsed: true,
          startedAt: true,
          completedAt: true,
          errorMessage: true,
          events: {
            where: { type: 'error' },
            select: { data: true },
            take: 3,
          },
        },
      });

      if (tasks.length === 0) {
        console.log('[SelfImprove] No tasks in last 24h, skipping analysis');
        return;
      }

      // 2. Group by category
      const byCategory: Record<string, typeof tasks> = {};
      for (const task of tasks) {
        const cat = task.category;
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(task);
      }

      // 3. Calculate success rates
      const stats = Object.entries(byCategory).map(([category, catTasks]) => {
        const completed = catTasks.filter(t => t.status === 'completed').length;
        const failed = catTasks.filter(t => t.status === 'failed').length;
        const total = catTasks.length;
        const successRate = total > 0 ? (completed / total) * 100 : 0;

        const failedTasks = catTasks.filter(t => t.status === 'failed');
        const errors = failedTasks
          .flatMap(t => t.events.map(e => (e.data as any)?.message ?? 'Unknown error'))
          .slice(0, 10);

        const avgCredits = catTasks
          .filter(t => t.creditsActuallyUsed !== null)
          .reduce((sum, t, _, arr) => sum + (t.creditsActuallyUsed ?? 0) / arr.length, 0);

        return { category, total, completed, failed, successRate, errors, avgCredits };
      });

      // 4. Ask Claude to analyze and suggest improvements
      const statsJson = JSON.stringify(stats, null, 2);

      const analysis = await this.analyzeWithClaude(statsJson);

      // 5. Store improvements in PlatformLog (pending approval)
      await prisma.platformLog.create({
        data: {
          type: 'IMPROVEMENT',
          severity: 'INFO',
          title: `Nightly Analysis — ${new Date().toISOString().slice(0, 10)}`,
          description: analysis,
          approved: false,
        },
      });

      // 6. Store ModelPerformance records
      await this.storeModelPerformance(byCategory, since);

      // 7. Flag critical failure categories
      for (const stat of stats) {
        if (stat.successRate < 50 && stat.total >= 5) {
          await prisma.platformLog.create({
            data: {
              type: 'ERROR',
              severity: 'CRITICAL',
              title: `Critical: ${stat.category} tasks failing at ${stat.successRate.toFixed(1)}%`,
              description:
                `Category "${stat.category}" had ${stat.failed}/${stat.total} failures in the last 24 hours. ` +
                `Common errors:\n${stat.errors.slice(0, 5).join('\n')}`,
              approved: false,
            },
          });
        }
      }

      console.log(`[SelfImprove] Analysis complete. Processed ${tasks.length} tasks across ${Object.keys(byCategory).length} categories.`);
    } catch (err: any) {
      console.error('[SelfImprove] Error:', err.message);

      await prisma.platformLog.create({
        data: {
          type: 'ERROR',
          severity: 'ERROR',
          title: 'Self-Improve Run Failed',
          description: `Nightly self-improvement run failed: ${err.message}`,
        },
      }).catch(() => {});
    }
  }

  // ─── Claude Analysis ──────────────────────────────────────────────────────────

  private async analyzeWithClaude(statsJson: string): Promise<string> {
    const systemPrompt = `You are an AI platform quality engineer. Analyze task success/failure statistics and provide actionable improvement suggestions.

Focus on:
1. Categories with low success rates
2. Common error patterns
3. Specific prompt engineering improvements
4. Engine configuration changes
5. Credit estimation accuracy

Format your response as a clear, structured report with sections and bullet points.
Be specific and technical — this will be reviewed by engineers.`;

    try {
      const analysis = await callClaudeSonnet(
        `Platform task statistics for last 24 hours:\n\n${statsJson}\n\nProvide a detailed improvement analysis.`,
        systemPrompt,
        4096
      );
      return analysis;
    } catch (err: any) {
      return `Analysis unavailable: ${err.message}`;
    }
  }

  // ─── Store Model Performance ──────────────────────────────────────────────────

  private async storeModelPerformance(
    byCategory: Record<string, any[]>,
    since: Date
  ): Promise<void> {
    // Map categories to primary model used
    const categoryModelMap: Record<string, string> = {
      code: 'claude-sonnet-4-6',
      research: 'llama-3.1-sonar-large-128k-online',
      image: 'gpt-image-1',
      voice: 'elevenlabs-multilingual-v2',
      content: 'claude-sonnet-4-6',
    };

    for (const [category, tasks] of Object.entries(byCategory)) {
      const model = categoryModelMap[category] ?? 'unknown';
      const completed = tasks.filter(t => t.status === 'completed');
      const total = tasks.length;

      if (total === 0) continue;

      const successRate = (completed.length / total);

      // Estimate avg latency from start/complete timestamps
      const completedWithTimes = completed.filter(
        t => t.startedAt && t.completedAt
      );

      const avgLatencyMs = completedWithTimes.length > 0
        ? completedWithTimes.reduce((sum, t) => {
            return sum + (new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime());
          }, 0) / completedWithTimes.length
        : 0;

      // Estimate avg cost (rough approximation based on category)
      const costMap: Record<string, number> = {
        code: 0.015,
        research: 0.008,
        image: 0.04,
        voice: 0.006,
        content: 0.01,
      };
      const avgCostUsd = costMap[category] ?? 0.01;

      await prisma.modelPerformance.create({
        data: {
          model,
          taskCategory: category,
          promptVersion: '1.0',
          successRate,
          avgLatencyMs: Math.round(avgLatencyMs),
          avgCostUsd,
          sampleSize: total,
        },
      }).catch(err => {
        console.error(`[SelfImprove] Failed to store performance for ${category}:`, err.message);
      });
    }
  }
}
