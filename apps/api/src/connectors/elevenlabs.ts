import { getConfig } from '@arrivarangam/config';

// ─── ElevenLabs Connector ─────────────────────────────────────────────────────

const ELEVENLABS_BASE = 'https://api.elevenlabs.io/v1';
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel

export interface VoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
}

// ─── Text To Speech ───────────────────────────────────────────────────────────

export async function textToSpeech(
  text: string,
  voiceId: string = DEFAULT_VOICE_ID,
  voiceSettings?: VoiceSettings
): Promise<Buffer> {
  const config = getConfig();

  const body = {
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: voiceSettings?.stability ?? 0.5,
      similarity_boost: voiceSettings?.similarity_boost ?? 0.75,
      style: voiceSettings?.style ?? 0.0,
      use_speaker_boost: voiceSettings?.use_speaker_boost ?? true,
    },
  };

  let response: Response;
  try {
    response = await fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': config.ELEVENLABS_API_KEY,
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    throw new Error(`ElevenLabs network error: ${err?.message ?? err}`);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`ElevenLabs API error ${response.status}: ${text}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ─── List Available Voices ────────────────────────────────────────────────────

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description: string | null;
  preview_url: string | null;
}

export async function listVoices(): Promise<ElevenLabsVoice[]> {
  const config = getConfig();

  const response = await fetch(`${ELEVENLABS_BASE}/voices`, {
    headers: {
      'xi-api-key': config.ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`ElevenLabs list voices error: ${response.status}`);
  }

  const data = await response.json() as { voices: ElevenLabsVoice[] };
  return data.voices ?? [];
}

// ─── Estimate Duration (credits calc helper) ──────────────────────────────────

export function estimateAudioMinutes(text: string): number {
  // Average speaking rate: ~150 words per minute
  const words = text.trim().split(/\s+/).length;
  return words / 150;
}

// ─── Health Check ─────────────────────────────────────────────────────────────

export async function pingElevenLabs(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const config = getConfig();
    const response = await fetch(`${ELEVENLABS_BASE}/user`, {
      headers: { 'xi-api-key': config.ELEVENLABS_API_KEY },
    });
    return { ok: response.ok, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
