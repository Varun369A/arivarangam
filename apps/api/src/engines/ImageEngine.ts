import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeHaiku } from '../connectors/claude';
import { generateImage } from '../connectors/openai';
import { taskService } from '../services/TaskService';
import { UsageMeter } from '../services/UsageMeter';

// ─── ImageEngine ──────────────────────────────────────────────────────────────

export class ImageEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (event: TaskEvent) => {
      await onEvent(event);
    };
    const meter = new UsageMeter();

    // Update task to running
    await prisma.task.update({
      where: { id: task.id },
      data: { status: 'running' },
    });

    try {
      // Step 1: Enhance prompt with Claude
      await emit({
        type: 'log',
        data: { message: 'Enhancing image prompt for best results...' },
        timestamp: new Date().toISOString(),
      });

      const enhancedPrompt = await this.enhancePrompt(task.prompt, meter);

      await emit({
        type: 'log',
        data: {
          message: 'Prompt enhanced. Starting image generation...',
          enhancedPrompt,
        },
        timestamp: new Date().toISOString(),
      });

      // Step 2: Determine image dimensions from prompt
      const size = this.determineSizeFromPrompt(task.prompt);

      await emit({
        type: 'log',
        data: { message: `Generating ${size} image in high quality...` },
        timestamp: new Date().toISOString(),
      });

      // Step 3: Generate image
      const imageUrl = await generateImage(enhancedPrompt, size, meter);

      await emit({
        type: 'log',
        data: { message: 'Image generated successfully.' },
        timestamp: new Date().toISOString(),
      });

      // Step 4: Mark preview ready
      await prisma.task.update({
        where: { id: task.id },
        data: { previewUrl: imageUrl },
      });

      await emit({
        type: 'preview_ready',
        data: { url: imageUrl },
        timestamp: new Date().toISOString(),
      });

      const creditsUsed = meter.toCredits();

      const metadata = {
        imageUrl,
        enhancedPrompt,
        originalPrompt: task.prompt,
        size,
        usage: meter.summary(),
      };

      await taskService.completeTask(task.id, creditsUsed, metadata);

      await emit({
        type: 'completed',
        data: {
          imageUrl,
          creditsUsed,
          message: 'Image generation complete',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({
        type: 'error',
        data: { message: err.message ?? 'Image generation failed' },
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  }

  // ─── Enhance Prompt ───────────────────────────────────────────────────────────

  private async enhancePrompt(userPrompt: string, meter: UsageMeter): Promise<string> {
    const systemPrompt = `You are an expert image prompt engineer. Transform the user's request into a rich, detailed prompt for image generation.

Rules:
- Add artistic style details (lighting, perspective, medium)
- Include quality modifiers (high detail, professional, etc.)
- Keep it focused and coherent
- Return ONLY the enhanced prompt, no explanation
- Max 500 characters`;

    try {
      const enhanced = await callClaudeHaiku(userPrompt, systemPrompt, 512, meter);
      return enhanced.trim().slice(0, 500);
    } catch {
      return userPrompt.slice(0, 500);
    }
  }

  // ─── Determine Size ───────────────────────────────────────────────────────────

  private determineSizeFromPrompt(prompt: string): '1024x1024' | '1792x1024' {
    const lower = prompt.toLowerCase();
    const wideKeywords = ['landscape', 'banner', 'wide', 'panorama', 'horizontal', 'wallpaper', 'cover'];

    if (wideKeywords.some(k => lower.includes(k))) {
      return '1792x1024';
    }

    return '1024x1024';
  }
}
