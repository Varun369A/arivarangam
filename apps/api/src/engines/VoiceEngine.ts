import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeHaiku } from '../connectors/claude';
import { textToSpeech, estimateAudioMinutes } from '../connectors/elevenlabs';
import { sarvamTTS, translateText, isIndianLanguage, getLangLabel, isSarvamConfigured } from '../connectors/sarvam';
import { uploadFile } from '../connectors/storage';
import { taskService } from '../services/TaskService';

// ─── VoiceEngine ──────────────────────────────────────────────────────────────

export class VoiceEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (event: TaskEvent) => { await onEvent(event); };

    await prisma.task.update({ where: { id: task.id }, data: { status: 'running' } });

    try {
      // Detect language from task context
      const language = this.detectLanguage(task.prompt, task.context);
      const useIndianLang = isIndianLanguage(language) && isSarvamConfigured();

      await emit({
        type: 'log',
        data: { message: useIndianLang
          ? `Preparing speech in ${getLangLabel(language)}...`
          : 'Preparing speech text...' },
        timestamp: new Date().toISOString(),
      });

      // Step 1: Prepare script
      const speechText = await this.prepareSpeechText(task.prompt, language, useIndianLang);
      const estimatedMinutes = estimateAudioMinutes(speechText);

      await emit({
        type: 'log',
        data: { message: `Script ready (~${estimatedMinutes.toFixed(1)} min, ${speechText.split(/\s+/).length} words)` },
        timestamp: new Date().toISOString(),
      });

      // Step 2: Generate audio
      let audioBuffer: Buffer;
      let audioMime = 'audio/mpeg';

      if (useIndianLang) {
        await emit({
          type: 'log',
          data: { message: `Generating voice with Sarvam AI — ${getLangLabel(language)}...` },
          timestamp: new Date().toISOString(),
        });
        audioBuffer = await this.sarvamTTSChunked(speechText, language as any);
        audioMime = 'audio/wav';
      } else {
        const voiceId = this.selectVoice(task.prompt);
        await emit({
          type: 'log',
          data: { message: `Converting to speech via ElevenLabs (voice: ${voiceId})...` },
          timestamp: new Date().toISOString(),
        });
        audioBuffer = await textToSpeech(speechText, voiceId);
      }

      await emit({
        type: 'log',
        data: { message: `Audio generated — ${(audioBuffer.length / 1024).toFixed(1)} KB` },
        timestamp: new Date().toISOString(),
      });

      // Step 3: Upload to R2
      const ext = audioMime === 'audio/wav' ? 'wav' : 'mp3';
      const r2Key = `tasks/${task.id}/audio.${ext}`;
      const audioUrl = await uploadFile(r2Key, audioBuffer, audioMime);

      await prisma.task.update({ where: { id: task.id }, data: { previewUrl: audioUrl } });

      await emit({
        type: 'preview_ready',
        data: { audioUrl, audioSize: audioBuffer.length, format: audioMime },
        timestamp: new Date().toISOString(),
      });

      const creditsUsed = Math.max(8, Math.ceil(estimatedMinutes * 8));
      const metadata = { speechText, language, audioSizeBytes: audioBuffer.length, estimatedMinutes, audioUrl };
      await taskService.completeTask(task.id, creditsUsed, metadata);

      await emit({
        type: 'completed',
        data: { creditsUsed, audioSize: audioBuffer.length, durationMinutes: estimatedMinutes, message: 'Voice generation complete' },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({ type: 'error', data: { message: err.message ?? 'Voice generation failed' }, timestamp: new Date().toISOString() });
      throw err;
    }
  }

  // ─── Sarvam TTS with chunking (500-char limit per request) ────────────────

  private async sarvamTTSChunked(text: string, language: any): Promise<Buffer> {
    // Split into sentences, batch into ≤500-char chunks
    const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) ?? [text];
    const chunks: string[] = [];
    let current = '';

    for (const s of sentences) {
      if ((current + s).length <= 480) {
        current += s;
      } else {
        if (current) chunks.push(current.trim());
        current = s;
      }
    }
    if (current.trim()) chunks.push(current.trim());

    const buffers: Buffer[] = [];
    for (const chunk of chunks) {
      buffers.push(await sarvamTTS(chunk, language));
    }

    // Concatenate WAV buffers (simple concatenation — good enough for single-speaker)
    return Buffer.concat(buffers);
  }

  // ─── Detect language from prompt / context ────────────────────────────────

  private detectLanguage(prompt: string, context?: string): string {
    // Context JSON may carry { language: 'hi-IN' }
    if (context) {
      try {
        const ctx = JSON.parse(context);
        if (ctx.language && typeof ctx.language === 'string') return ctx.language;
      } catch { /* ignore */ }
    }

    // Keyword detection in prompt
    const lower = prompt.toLowerCase();
    if (lower.includes('hindi') || lower.includes('हिंदी')) return 'hi-IN';
    if (lower.includes('tamil') || lower.includes('தமிழ்')) return 'ta-IN';
    if (lower.includes('telugu') || lower.includes('తెలుగు')) return 'te-IN';
    if (lower.includes('kannada') || lower.includes('ಕನ್ನಡ')) return 'kn-IN';
    if (lower.includes('malayalam') || lower.includes('മലയാളം')) return 'ml-IN';
    if (lower.includes('marathi') || lower.includes('मराठी')) return 'mr-IN';
    if (lower.includes('bengali') || lower.includes('বাংলা')) return 'bn-IN';
    if (lower.includes('gujarati') || lower.includes('ગુજરાતી')) return 'gu-IN';
    if (lower.includes('punjabi') || lower.includes('ਪੰਜਾਬੀ')) return 'pa-IN';
    if (lower.includes('odia') || lower.includes('ओड़िया')) return 'od-IN';

    return 'en'; // Default: English via ElevenLabs
  }

  // ─── Prepare Speech Text ──────────────────────────────────────────────────

  private async prepareSpeechText(prompt: string, language: string, isIndian: boolean): Promise<string> {
    if (prompt.length > 200 && !prompt.toLowerCase().startsWith('generate') && !prompt.toLowerCase().startsWith('create')) {
      // Already a script — just translate if needed
      if (isIndian && isSarvamConfigured()) {
        try {
          return await translateText(prompt, language as any);
        } catch { return prompt; }
      }
      return prompt;
    }

    const langNote = isIndian ? ` Write in ${getLangLabel(language)}.` : '';
    const systemPrompt = `You are a professional voice script writer. Create a natural-sounding speech script based on the user's request.${langNote}
Rules:
- Write naturally spoken language
- Include natural pauses with commas and periods
- Avoid abbreviations that don't read well aloud
- Return ONLY the script text, no stage directions or notes
- Keep it concise but complete`;

    try {
      const script = await callClaudeHaiku(prompt, systemPrompt, 1024);
      const trimmed = script.trim();

      // If script is in English but Indian language requested, translate it
      if (isIndian && isSarvamConfigured()) {
        try {
          return await translateText(trimmed, language as any);
        } catch { return trimmed; }
      }
      return trimmed;
    } catch {
      return prompt;
    }
  }

  // ─── Select ElevenLabs Voice ──────────────────────────────────────────────

  private selectVoice(prompt: string): string {
    const lower = prompt.toLowerCase();
    if (lower.includes('male') || lower.includes('man') || lower.includes('deep')) return 'VR6AewLTigWG4xSOukaG';
    if (lower.includes('child') || lower.includes('young'))                         return 'AZnzlk1XvdvUeBnXmlld';
    if (lower.includes('british') || lower.includes('uk'))                          return 'CYw3kZ02Hs0563khs1Fj';
    if (lower.includes('news') || lower.includes('professional'))                   return 'ErXwobaYiN019PkySvjV';
    return '21m00Tcm4TlvDq8ikWAM'; // Rachel (default)
  }
}
