import OpenAI from 'openai';
import { getConfig } from '@arivarangam/config';

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: getConfig().OPENAI_API_KEY });
  }
  return _client;
}

// ─── Image Generation ─────────────────────────────────────────────────────────

export async function generateImage(
  prompt: string,
  size: '1024x1024' | '1792x1024' = '1024x1024'
): Promise<string> {
  const client = getClient();

  try {
    const response = await client.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size,
      quality: 'hd',
      response_format: 'url',
    });

    const imageData = response.data?.[0];

    if (!imageData) {
      throw new Error('No image data returned');
    }

    if (imageData.url) {
      return imageData.url;
    }

    if ((imageData as any).b64_json) {
      return `data:image/png;base64,${(imageData as any).b64_json}`;
    }

    throw new Error('Image generation returned no output');
  } catch (err: any) {
    console.error('[Image] generateImage error:', err?.message ?? err);
    throw new Error(`Image generation failed: ${err?.message ?? 'Unknown error'}`);
  }
}

// ─── Chat Completion (GPT-4o) ─────────────────────────────────────────────────

export async function callGPT4o(
  prompt: string,
  system?: string,
  maxTokens = 4096
): Promise<string> {
  const client = getClient();

  try {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (system) {
      messages.push({ role: 'system', content: system });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      messages,
      max_tokens: maxTokens,
    });

    return response.choices[0]?.message?.content ?? '';
  } catch (err: any) {
    console.error('[OpenAI] callGPT4o error:', err?.message ?? err);
    throw new Error(`OpenAI GPT-4o failed: ${err?.message ?? 'Unknown error'}`);
  }
}

// ─── Health Check ─────────────────────────────────────────────────────────────

export async function pingOpenAI(): Promise<{ ok: boolean; latencyMs: number }> {
  const start = Date.now();
  try {
    const client = getClient();
    await client.models.retrieve('gpt-4o');
    return { ok: true, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, latencyMs: Date.now() - start };
  }
}
