import Anthropic from '@anthropic-ai/sdk';
import { getConfig } from '@arivarangam/config';
import type { UsageMeter } from '../services/UsageMeter';

// ─── Model IDs ────────────────────────────────────────────────────────────────

const CLAUDE_HAIKU = 'claude-haiku-4-5-20251001';
const CLAUDE_SONNET = 'claude-sonnet-4-6';

// ─── Options ──────────────────────────────────────────────────────────────────

export interface ClaudeOptions {
  model?: 'haiku' | 'sonnet';
  maxTokens?: number;
  system?: string;
  onToken?: (token: string) => void;
  temperature?: number;
  /** Optional UsageMeter to accumulate exact token usage for credit billing. */
  meter?: UsageMeter;
}

// ─── Retry Helper ────────────────────────────────────────────────────────────

function parseRetryAfter(errorMessage: string): number {
  // Anthropic returns: "overloaded_error" or "try again in Xs" style messages
  const match = errorMessage.match(/try again in (\d+(?:\.\d+)?)(s| seconds)/i);
  if (match) {
    return Math.ceil(parseFloat(match[1]) * 1000);
  }
  return 5000; // default 5s
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Main Connector ──────────────────────────────────────────────────────────

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: getConfig().ANTHROPIC_API_KEY });
  }
  return _client;
}

export async function callClaude(
  prompt: string,
  options: ClaudeOptions = {}
): Promise<string> {
  const {
    model = 'haiku',
    maxTokens = 4096,
    system,
    onToken,
    temperature = 0.7,
    meter,
  } = options;

  const modelId = model === 'sonnet' ? CLAUDE_SONNET : CLAUDE_HAIKU;
  const client = getClient();

  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: prompt },
  ];

  const systemPrompt = system ?? 'You are a helpful AI assistant for the Arrivarangam platform.';

  const MAX_RETRIES = 3;
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      if (onToken) {
        // Streaming mode
        let fullText = '';

        const stream = client.messages.stream({
          model: modelId,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages,
          temperature,
        });

        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const token = chunk.delta.text;
            fullText += token;
            onToken(token);
          }
        }

        // Capture usage from the completed stream
        if (meter) {
          try {
            const finalMsg = await stream.finalMessage();
            meter.addClaude(model, finalMsg.usage.input_tokens, finalMsg.usage.output_tokens);
          } catch {
            // Usage capture is best-effort — don't fail the task
          }
        }

        return fullText;
      } else {
        // Non-streaming mode
        const response = await client.messages.create({
          model: modelId,
          max_tokens: maxTokens,
          system: systemPrompt,
          messages,
          temperature,
        });

        // Capture exact token usage
        if (meter) {
          meter.addClaude(model, response.usage.input_tokens, response.usage.output_tokens);
        }

        const block = response.content[0];
        if (block.type !== 'text') {
          throw new Error('Unexpected response type from Claude');
        }
        return block.text;
      }
    } catch (err: any) {
      const status = err?.status ?? err?.statusCode;
      const isRateLimit = status === 429 || err?.message?.includes('rate') || err?.message?.includes('overloaded');
      const isRetryable = isRateLimit || status === 529;

      if (isRetryable && attempt < MAX_RETRIES) {
        const waitMs = parseRetryAfter(err?.message ?? '');
        console.warn(`[Claude] Rate limited (attempt ${attempt + 1}/${MAX_RETRIES}). Waiting ${waitMs}ms...`);
        await sleep(waitMs);
        attempt++;
        continue;
      }

      console.error('[Claude] Error:', err?.message ?? err);
      throw new Error(`Claude API error: ${err?.message ?? 'Unknown error'}`);
    }
  }

  throw new Error('Claude API: max retries exceeded');
}

// ─── Convenience Wrappers ─────────────────────────────────────────────────────

export async function callClaudeHaiku(
  prompt: string,
  system?: string,
  maxTokens = 2048,
  meter?: UsageMeter
): Promise<string> {
  return callClaude(prompt, { model: 'haiku', system, maxTokens, meter });
}

export async function callClaudeSonnet(
  prompt: string,
  system?: string,
  maxTokens = 8192,
  onToken?: (t: string) => void,
  meter?: UsageMeter
): Promise<string> {
  return callClaude(prompt, { model: 'sonnet', system, maxTokens, onToken, meter });
}
