import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeHaiku } from '../connectors/claude';
import { sarvamTTS, translateText, getLangLabel, isSarvamConfigured, type SarvamLanguageCode } from '../connectors/sarvam';
import { uploadFile } from '../connectors/storage';
import { taskService } from '../services/TaskService';

// ─── VoiceEngine ──────────────────────────────────────────────────────────────

export class VoiceEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (event: TaskEvent) => { await onEvent(event); };

    await prisma.task.update({ where: { id: task.id }, data: { status: 'running' } });

    if (!isSarvamConfigured()) {
      await emit({ type: 'error', data: { message: 'Voice generation is not configured on this server.' }, timestamp: new Date().toISOString() });
      throw new Error('SARVAM_API_KEY not set');
    }

    try {
      const taskContext = (task.metadata as any)?.context ?? task.context;
      const language = this.detectLanguage(task.prompt, taskContext);
      const langLabel = getLangLabel(language);

      await emit({
        type: 'log',
        data: { message: `Preparing speech in ${langLabel}...` },
        timestamp: new Date().toISOString(),
      });

      // Step 1: Generate script
      const speechText = await this.prepareSpeechText(task.prompt, language);
      const wordCount = speechText.split(/\s+/).length;
      const estimatedMinutes = wordCount / 130; // ~130 wpm

      await emit({
        type: 'log',
        data: { message: `Script ready (~${estimatedMinutes.toFixed(1)} min, ${wordCount} words)` },
        timestamp: new Date().toISOString(),
      });

      // Step 2: Generate audio via Sarvam
      await emit({
        type: 'log',
        data: { message: `Generating voice in ${langLabel}...` },
        timestamp: new Date().toISOString(),
      });

      const audioBuffer = await this.sarvamTTSChunked(speechText, language as SarvamLanguageCode);

      await emit({
        type: 'log',
        data: { message: `Audio generated — ${(audioBuffer.length / 1024).toFixed(1)} KB` },
        timestamp: new Date().toISOString(),
      });

      // Step 3: Upload
      const r2Key = `tasks/${task.id}/audio.wav`;
      const audioUrl = await uploadFile(r2Key, audioBuffer, 'audio/wav');

      await prisma.task.update({ where: { id: task.id }, data: { previewUrl: audioUrl } });

      await emit({
        type: 'preview_ready',
        data: { audioUrl, audioSize: audioBuffer.length, format: 'audio/wav' },
        timestamp: new Date().toISOString(),
      });

      const creditsUsed = Math.max(30, Math.ceil(estimatedMinutes * 30));
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

  // ─── Sarvam TTS with chunking (500-char limit per request) ───────────────────

  private async sarvamTTSChunked(text: string, language: SarvamLanguageCode): Promise<Buffer> {
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
    return Buffer.concat(buffers);
  }

  // ─── Detect language from prompt / context ───────────────────────────────────

  private detectLanguage(prompt: string, context?: string): SarvamLanguageCode {
    if (context) {
      try {
        const ctx = JSON.parse(context);
        if (ctx.language && typeof ctx.language === 'string') return ctx.language as SarvamLanguageCode;
      } catch { /* ignore */ }
    }

    const lower = prompt.toLowerCase();
    if (lower.includes('hindi')     || lower.includes('हिंदी'))    return 'hi-IN';
    if (lower.includes('tamil')     || lower.includes('தமிழ்'))    return 'ta-IN';
    if (lower.includes('telugu')    || lower.includes('తెలుగు'))   return 'te-IN';
    if (lower.includes('kannada')   || lower.includes('ಕನ್ನಡ'))   return 'kn-IN';
    if (lower.includes('malayalam') || lower.includes('മലയാളം'))  return 'ml-IN';
    if (lower.includes('marathi')   || lower.includes('मराठी'))    return 'mr-IN';
    if (lower.includes('bengali')   || lower.includes('বাংলা'))    return 'bn-IN';
    if (lower.includes('gujarati')  || lower.includes('ગુજરાતી')) return 'gu-IN';
    if (lower.includes('punjabi')   || lower.includes('ਪੰਜਾਬੀ'))  return 'pa-IN';
    if (lower.includes('odia')      || lower.includes('ओड़िया'))    return 'od-IN';

    return 'en-IN'; // Default: English via Sarvam
  }

  // ─── Prepare Speech Text ──────────────────────────────────────────────────────

  private async prepareSpeechText(prompt: string, language: SarvamLanguageCode): Promise<string> {
    const isEnglish = language === 'en-IN';

    // Already a long script — just translate if not English
    if (prompt.length > 200 && !prompt.toLowerCase().startsWith('generate') && !prompt.toLowerCase().startsWith('create')) {
      if (!isEnglish) {
        try { return await translateText(prompt, language); } catch { return prompt; }
      }
      return prompt;
    }

    const langNote = isEnglish ? '' : ` Write in English — it will be translated to ${getLangLabel(language)}.`;
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
      if (!isEnglish) {
        try { return await translateText(trimmed, language); } catch { return trimmed; }
      }
      return trimmed;
    } catch {
      return prompt;
    }
  }
}
