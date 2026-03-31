import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeSonnet } from '../connectors/claude';
import { search } from '../connectors/perplexity';
import { taskService } from '../services/TaskService';
import { UsageMeter } from '../services/UsageMeter';

// ─── ResearchEngine ───────────────────────────────────────────────────────────

export class ResearchEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (event: TaskEvent) => {
      await onEvent(event);
    };
    const meter = new UsageMeter();

    // Update task status to running
    await prisma.task.update({
      where: { id: task.id },
      data: { status: 'running' },
    });

    try {
      // Step 1: Use Claude to refine the search query
      await emit({
        type: 'log',
        data: { message: 'Analyzing query and formulating search strategy...' },
        timestamp: new Date().toISOString(),
      });

      const searchQuery = await this.refineQuery(task.prompt, meter);

      await emit({
        type: 'log',
        data: { message: `Searching the web for: "${searchQuery}"` },
        timestamp: new Date().toISOString(),
      });

      // Step 2: Perplexity search
      let rawResults: string;
      try {
        rawResults = await search(searchQuery);
        meter.addSearch();
      } catch (err: any) {
        await emit({
          type: 'log',
          data: { message: 'Web search encountered an error, using available knowledge...' },
          timestamp: new Date().toISOString(),
        });
        rawResults = `Unable to perform live search. Generating report from training knowledge for: ${searchQuery}`;
      }

      await emit({
        type: 'log',
        data: { message: 'Search complete. Synthesizing research report...' },
        timestamp: new Date().toISOString(),
      });

      // Step 3: Claude synthesizes into structured report
      const report = await this.synthesizeReport(task.prompt, rawResults, meter);

      await emit({
        type: 'log',
        data: { message: 'Report generated. Finalizing...' },
        timestamp: new Date().toISOString(),
      });

      const sources = this.extractSources(rawResults);
      const creditsUsed = meter.toCredits();

      // Emit files so the task page can display and download them
      await emit({
        type: 'file_created',
        data: { path: 'report.md', content: report, language: 'markdown' },
        timestamp: new Date().toISOString(),
      });

      if (sources.length > 0) {
        const sourcesContent = `# Sources\n\n${sources.map((s, i) => `${i + 1}. ${s}`).join('\n')}`;
        await emit({
          type: 'file_created',
          data: { path: 'sources.md', content: sourcesContent, language: 'markdown' },
          timestamp: new Date().toISOString(),
        });
      }

      const readmeSummary = `# Research Report\n\n**Query:** ${task.prompt}\n\n**Search term:** ${searchQuery}\n\n**Word count:** ${report.split(/\s+/).length}\n\n**Sources found:** ${sources.length}\n`;
      await emit({
        type: 'file_created',
        data: { path: 'README.md', content: readmeSummary, language: 'markdown' },
        timestamp: new Date().toISOString(),
      });

      const metadata = {
        report,
        searchQuery,
        sources,
        wordCount: report.split(/\s+/).length,
        usage: meter.summary(),
      };

      await taskService.completeTask(task.id, creditsUsed, metadata);

      await emit({
        type: 'completed',
        data: {
          report,
          creditsUsed,
          message: 'Research report complete',
          wordCount: metadata.wordCount,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({
        type: 'error',
        data: { message: err.message ?? 'Research failed' },
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  }

  // ─── Refine Query ─────────────────────────────────────────────────────────────

  private async refineQuery(prompt: string, meter: UsageMeter): Promise<string> {
    const systemPrompt = `You are a research query optimizer. Convert the user's request into an optimal search query.
Return ONLY the search query string, nothing else. Make it specific and searchable.`;

    try {
      const refined = await callClaudeSonnet(prompt, systemPrompt, 256, undefined, meter);
      return refined.trim().slice(0, 300);
    } catch {
      return prompt.slice(0, 300);
    }
  }

  // ─── Synthesize Report ────────────────────────────────────────────────────────

  private async synthesizeReport(originalPrompt: string, rawResults: string, meter: UsageMeter): Promise<string> {
    const systemPrompt = `You are an expert research analyst. Synthesize the provided search results into a comprehensive, well-structured report.

Format requirements:
- Start with an executive summary
- Use clear sections with ## headers
- Include key findings as bullet points where appropriate
- End with conclusions and recommendations
- Preserve and properly cite sources
- Write in professional, clear English
- Aim for 500-1500 words depending on topic complexity`;

    const report = await callClaudeSonnet(
      `Original research request: ${originalPrompt}\n\nSearch results:\n${rawResults}`,
      systemPrompt,
      4096,
      undefined,
      meter
    );

    return report;
  }

  // ─── Extract Sources ──────────────────────────────────────────────────────────

  private extractSources(text: string): string[] {
    const sources: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      // Extract URLs
      const urlMatches = line.match(/https?:\/\/[^\s)>\]]+/g);
      if (urlMatches) {
        sources.push(...urlMatches.map(u => u.replace(/[.,;]$/, '')));
      }
    }

    return [...new Set(sources)].slice(0, 20); // unique, max 20
  }
}
