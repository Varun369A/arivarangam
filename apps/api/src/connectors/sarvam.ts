/**
 * Sarvam AI connector — Indian language translation & TTS.
 * API docs: https://docs.sarvam.ai/
 */

const SARVAM_BASE = 'https://api.sarvam.ai';

// ─── Language Registry ────────────────────────────────────────────────────────

export const SARVAM_LANGUAGES = [
  { code: 'hi-IN', name: 'Hindi',      nativeName: 'हिन्दी'    },
  { code: 'ta-IN', name: 'Tamil',      nativeName: 'தமிழ்'     },
  { code: 'te-IN', name: 'Telugu',     nativeName: 'తెలుగు'    },
  { code: 'kn-IN', name: 'Kannada',    nativeName: 'ಕನ್ನಡ'    },
  { code: 'ml-IN', name: 'Malayalam',  nativeName: 'മലയാളം'   },
  { code: 'mr-IN', name: 'Marathi',    nativeName: 'मराठी'     },
  { code: 'bn-IN', name: 'Bengali',    nativeName: 'বাংলা'     },
  { code: 'gu-IN', name: 'Gujarati',   nativeName: 'ગુજરાતી'   },
  { code: 'pa-IN', name: 'Punjabi',    nativeName: 'ਪੰਜਾਬੀ'   },
  { code: 'od-IN', name: 'Odia',       nativeName: 'ଓଡ଼ିଆ'     },
  { code: 'en-IN', name: 'English',    nativeName: 'English'   },
] as const;

export type SarvamLanguageCode = typeof SARVAM_LANGUAGES[number]['code'];

// Bulbul v1 speaker per language
const SPEAKERS: Record<string, string> = {
  'hi-IN': 'meera',
  'ta-IN': 'anitha',
  'te-IN': 'pavithra',
  'kn-IN': 'suresh',
  'ml-IN': 'iniya',
  'mr-IN': 'kalpana',
  'bn-IN': 'arjun',
  'gu-IN': 'manisha',
  'pa-IN': 'deepa',
  'od-IN': 'subhash',
  'en-IN': 'jessica',
};

function getApiKey(): string {
  const key = process.env.SARVAM_API_KEY;
  if (!key) throw new Error('SARVAM_API_KEY is not set');
  return key;
}

// ─── Translation ──────────────────────────────────────────────────────────────

/**
 * Translate text to any supported Indian language.
 * sourceLanguage defaults to 'auto-detect'.
 */
export async function translateText(
  text: string,
  targetLanguage: SarvamLanguageCode,
  sourceLanguage = 'auto-detect',
): Promise<string> {
  const apiKey = getApiKey();

  const response = await fetch(`${SARVAM_BASE}/translate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': apiKey,
    },
    body: JSON.stringify({
      input: text,
      source_language_code: sourceLanguage,
      target_language_code: targetLanguage,
      speaker_gender: 'Female',
      mode: 'formal',
      enable_preprocessing: true,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`Sarvam translate ${response.status}: ${err}`);
  }

  const data = await response.json() as { translated_text?: string };
  if (!data.translated_text) throw new Error('Sarvam translate returned empty result');
  return data.translated_text;
}

// ─── Text-To-Speech (Bulbul) ──────────────────────────────────────────────────

/**
 * Generate speech audio in any supported Indian language.
 * Returns a WAV audio Buffer (base64-decoded from Sarvam's response).
 * Sarvam has a ~500-char input limit per request; caller should chunk if needed.
 */
export async function sarvamTTS(
  text: string,
  languageCode: SarvamLanguageCode,
): Promise<Buffer> {
  const apiKey = getApiKey();
  const speaker = SPEAKERS[languageCode] ?? 'meera';

  const response = await fetch(`${SARVAM_BASE}/text-to-speech`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': apiKey,
    },
    body: JSON.stringify({
      inputs: [text.slice(0, 500)],
      target_language_code: languageCode,
      speaker,
      model: 'bulbul:v1',
      pitch: 0,
      pace: 1.0,
      loudness: 1.5,
      speech_sample_rate: 22050,
      enable_preprocessing: true,
      eng_interpolation_wt: 123,
    }),
  });

  if (!response.ok) {
    const err = await response.text().catch(() => '');
    throw new Error(`Sarvam TTS ${response.status}: ${err}`);
  }

  const data = await response.json() as { audios?: string[] };
  const base64Audio = data.audios?.[0];
  if (!base64Audio) throw new Error('Sarvam TTS returned no audio');
  return Buffer.from(base64Audio, 'base64');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function isIndianLanguage(code: string): boolean {
  return SARVAM_LANGUAGES.some(l => l.code === code) && code !== 'en-IN';
}

export function getLangLabel(code: string): string {
  const lang = SARVAM_LANGUAGES.find(l => l.code === code);
  return lang ? `${lang.nativeName} (${lang.name})` : code;
}

export function isSarvamConfigured(): boolean {
  return !!process.env.SARVAM_API_KEY;
}

export async function pingSarvam(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const apiKey = getApiKey();
    const r = await fetch(`${SARVAM_BASE}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-subscription-key': apiKey },
      body: JSON.stringify({ input: 'hi', source_language_code: 'auto-detect', target_language_code: 'hi-IN' }),
    });
    return { ok: r.ok, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
