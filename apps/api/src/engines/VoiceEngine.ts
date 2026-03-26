import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeHaiku } from '../connectors/claude';
import { textToSpeech, estimateAudioMinutes } from '../connectors/elevenlabs';
import { uploadFile } from '../connectors/storage';
import { taskService } from '../services/TaskService';
import { getConfig } from '@arivarangam/config';

// ─── VoiceEngine ──────────────────────────────────────────────────────────────

export class VoiceEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (event: TaskEvent) => {
      await onEvent(event);
    };

    // Update task to running
    await prisma.task.update({
      where: { id: task.id },
      data: { status: 'running' },
    });

    try {
      // Step 1: Determine if we need to prepare a script or use prompt directly
      await emit({
        type: 'log',
        data: { message: 'Preparing speech text...' },
        timestamp: new Date().toISOString(),
      });

      const speechText = await this.prepareSpeechText(task.prompt);
      const estimatedMinutes = estimateAudioMinutes(speechText);

      await emit({
        type: 'log',
        data: {
          message: `Speech text ready. Estimated duration: ~${estimatedMinutes.toFixed(1)} minutes`,
          wordCount: speechText.split(/\s+/).length,
        },
        timestamp: new Date().toISOString(),
      });

      // Step 2: Determine voice ID from prompt
      const voiceId = this.selectVoice(task.prompt);

      await emit({
        type: 'log',
        data: { message: `Converting text to speech using voice: ${voiceId}...` },
        timestamp: new Date().toISOString(),
      });

      // Step 3: Generate audio
      const audioBuffer = await textToSpeech(speechText, voiceId);

      await emit({
        type: 'log',
        data: {
          message: `Audio generated. Size: ${(audioBuffer.length / 1024).toFixed(1)}KB`,
        },
        timestamp: new Date().toISOString(),
      });

      // Step 4: Upload audio to Cloudflare R2
      const r2Key = `tasks/${task.id}/audio.mp3`
      const audioUrl = await uploadFile(r2Key, audioBuffer, 'audio/mpeg')

      // Update previewUrl with the R2 URL
      await prisma.task.update({
        where: { id: task.id },
        data: { previewUrl: audioUrl },
      });

      await emit({
        type: 'preview_ready',
        data: { audioUrl, audioSize: audioBuffer.length, format: 'audio/mpeg' },
        timestamp: new Date().toISOString(),
      });

      // Calculate credits: 8 per minute
      const creditsUsed = Math.max(8, Math.ceil(estimatedMinutes * 8));

      const metadata = {
        speechText,
        voiceId,
        audioSizeBytes: audioBuffer.length,
        estimatedMinutes,
        audioUrl,
      };

      await taskService.completeTask(task.id, creditsUsed, metadata);

      await emit({
        type: 'completed',
        data: {
          creditsUsed,
          audioSize: audioBuffer.length,
          durationMinutes: estimatedMinutes,
          message: 'Voice generation complete',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({
        type: 'error',
        data: { message: err.message ?? 'Voice generation failed' },
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  }

  // ─── Prepare Speech Text ──────────────────────────────────────────────────────

  private async prepareSpeechText(prompt: string): Promise<string> {
    // If prompt looks like it's already a script (long text)
    if (prompt.length > 200 && !prompt.toLowerCase().startsWith('generate') && !prompt.toLowerCase().startsWith('create')) {
      return prompt;
    }

    const systemPrompt = `You are a professional voice script writer. Create a natural-sounding speech script based on the user's request.

Rules:
- Write naturally spoken language (not academic or overly formal)
- Include natural pauses with commas and periods
- Avoid abbreviations that don't read well aloud
- Return ONLY the script text, no stage directions or notes
- Keep it concise but complete`;

    try {
      const script = await callClaudeHaiku(prompt, systemPrompt, 1024);
      return script.trim();
    } catch {
      return prompt;
    }
  }

  // ─── Select Voice ─────────────────────────────────────────────────────────────

  private selectVoice(prompt: string): string {
    const lower = prompt.toLowerCase();

    // Simple keyword-based voice selection
    if (lower.includes('male') || lower.includes('man') || lower.includes('deep')) {
      return 'VR6AewLTigWG4xSOukaG'; // Arnold (deep male)
    }
    if (lower.includes('child') || lower.includes('young')) {
      return 'AZnzlk1XvdvUeBnXmlld'; // Domi (young)
    }
    if (lower.includes('british') || lower.includes('uk')) {
      return 'CYw3kZ02Hs0563khs1Fj'; // Dave (British)
    }
    if (lower.includes('news') || lower.includes('professional') || lower.includes('corporate')) {
      return 'ErXwobaYiN019PkySvjV'; // Antoni (professional)
    }

    // Default: Rachel (friendly female)
    return '21m00Tcm4TlvDq8ikWAM';
  }
}
