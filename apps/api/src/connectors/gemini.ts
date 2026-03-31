// ─── Google Gemini Connector ──────────────────────────────────────────────────
// Uses Gemini REST API — no SDK required.
// Model: gemini-2.0-flash (fast, capable, good for code review)

const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE  = 'https://generativelanguage.googleapis.com/v1beta/models';

function getApiKey(): string | null {
  return process.env.GEMINI_API_KEY ?? null;
}

interface GeminiPart { text: string }
interface GeminiContent { role: 'user' | 'model'; parts: GeminiPart[] }

interface GeminiResponse {
  candidates: {
    content: { parts: GeminiPart[]; role: string };
    finishReason: string;
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// ─── Core Call ────────────────────────────────────────────────────────────────

export async function callGemini(
  prompt: string,
  systemInstruction?: string,
  maxTokens = 4096
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const body: any = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }] as GeminiContent[],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 0.3,
    },
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  let response: Response;
  try {
    response = await fetch(
      `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
  } catch (err: any) {
    throw new Error(`Gemini network error: ${err?.message ?? err}`);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Gemini API error ${response.status}: ${text}`);
  }

  const data = await response.json() as GeminiResponse;
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) throw new Error('Gemini returned empty response');
  return content;
}

// ─── Review Helper ────────────────────────────────────────────────────────────
// Returns structured review JSON for ReviewPhase

export async function geminiReviewCode(
  files: { path: string; content: string }[],
  qualityThreshold: number,
  reviewCriteria: string
): Promise<{ score: number; passed: boolean; failures: { file: string; issue: string; severity: string }[]; suggestions: string[] } | null> {
  if (!getApiKey()) return null;

  const filesSummary = files
    .map(f => `\n\n=== ${f.path} ===\n${f.content.slice(0, 1500)}${f.content.length > 1500 ? '\n...(truncated)' : ''}`)
    .join('');

  const system = `You are a senior code/design quality reviewer.
Review the generated files against these criteria:
${reviewCriteria}

Quality threshold: ${qualityThreshold}/10

Return ONLY a valid JSON object — no markdown, no commentary:
{
  "score": number (0-10),
  "passed": boolean (true if score >= ${qualityThreshold} and no high severity failures),
  "failures": [
    { "file": "path", "issue": "specific description", "severity": "low|medium|high" }
  ],
  "suggestions": ["string — nice-to-have improvements"]
}`;

  try {
    const raw = await callGemini(filesSummary, system, 1024);
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return {
      score:       Math.max(0, Math.min(10, parsed.score ?? 5)),
      passed:      parsed.passed ?? (parsed.score >= qualityThreshold),
      failures:    Array.isArray(parsed.failures)    ? parsed.failures    : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch {
    return null;
  }
}

// ─── Health Check ─────────────────────────────────────────────────────────────

export async function pingGemini(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const result = await callGemini('Reply with exactly: ok');
    return { ok: result.toLowerCase().includes('ok'), latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
