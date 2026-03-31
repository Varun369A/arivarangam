import { getConfig } from '@arivarangam/config';

// ─── Perplexity AI Connector ──────────────────────────────────────────────────
// Uses Perplexity's OpenAI-compatible API

const PERPLEXITY_BASE = 'https://api.perplexity.ai';
const SONAR_MODEL = 'sonar-pro';

interface PerplexityMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface PerplexityResponse {
  id: string;
  model: string;
  choices: {
    index: number;
    finish_reason: string;
    message: {
      role: string;
      content: string;
    };
    delta: {
      role: string;
      content: string;
    };
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  citations?: string[];
}

// ─── Main Search Function ────────────────────────────────────────────────────

export async function search(query: string): Promise<string> {
  const config = getConfig();

  const messages: PerplexityMessage[] = [
    {
      role: 'system',
      content:
        'You are a research assistant. Provide comprehensive, accurate, well-structured answers with citations. ' +
        'Include sources at the end of your response in a "Sources:" section.',
    },
    {
      role: 'user',
      content: query,
    },
  ];

  const body = {
    model: SONAR_MODEL,
    messages,
    max_tokens: 4096,
    temperature: 0.2,
    top_p: 0.9,
    return_citations: true,
    return_images: false,
    stream: false,
  };

  let response: Response;
  try {
    response = await fetch(`${PERPLEXITY_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.PERPLEXITY_API_KEY}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    throw new Error(`Perplexity network error: ${err?.message ?? err}`);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Perplexity API error ${response.status}: ${text}`);
  }

  const data = await response.json() as PerplexityResponse;

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Perplexity returned empty response');
  }

  // Append citations if available and not already in content
  if (data.citations && data.citations.length > 0 && !content.includes('Sources:')) {
    const citationsText = '\n\n**Sources:**\n' + data.citations.map((c, i) => `${i + 1}. ${c}`).join('\n');
    return content + citationsText;
  }

  return content;
}

// ─── Health Check ─────────────────────────────────────────────────────────────
// Lightweight: 1-token completion to verify API key and connectivity

export async function pingPerplexity(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const config = getConfig();
    const response = await fetch(`${PERPLEXITY_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.PERPLEXITY_API_KEY}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        model: SONAR_MODEL,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        stream: false,
      }),
    });
    return { ok: response.ok, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
