// ─── Pricing constants (USD per unit) ────────────────────────────────────────

const SONNET_IN_PER_M  = 3.0;    // claude-sonnet-4-6  input  $/M tokens
const SONNET_OUT_PER_M = 15.0;   // claude-sonnet-4-6  output $/M tokens
const HAIKU_IN_PER_M   = 0.80;   // claude-haiku-4-5   input  $/M tokens
const HAIKU_OUT_PER_M  = 4.0;    // claude-haiku-4-5   output $/M tokens
const DALLE3_HD_SQ     = 0.08;   // DALL-E 3 HD 1024×1024    $/image
const DALLE3_HD_WIDE   = 0.12;   // DALL-E 3 HD 1792×1024    $/image
const SARVAM_PER_CHAR  = 0.0002; // Sarvam TTS                $/char (estimated)
const PERPLEXITY_PER   = 0.008;  // Perplexity sonar          $/search call

// ─── INR conversion & platform margin ────────────────────────────────────────

const USD_TO_INR      = 85;   // USD → INR exchange rate
const MARGIN          = 2.5;  // 150% margin over cost (2.5× = cost + 150% profit)
const INR_PER_CREDIT  = 0.33; // ₹0.33 per credit
const MIN_CREDITS     = 10;   // Minimum credits charged per task

// ─── UsageMeter ───────────────────────────────────────────────────────────────

/**
 * Per-task accumulator that tracks exact API usage across all providers,
 * then converts to platform credits with margin.
 *
 * Usage:
 *   const meter = new UsageMeter();
 *   await callClaudeHaiku(prompt, system, maxTokens, meter);
 *   await callClaudeSonnet(prompt, system, maxTokens, undefined, meter);
 *   meter.addImage('1024x1024');
 *   meter.addAudio(speechText.length);
 *   const credits = meter.toCredits();
 */
export class UsageMeter {
  private sonnetIn    = 0;
  private sonnetOut   = 0;
  private haikuIn     = 0;
  private haikuOut    = 0;
  private imagesSquare = 0;
  private imagesWide   = 0;
  private audioChars   = 0;
  private searches     = 0;

  // ─── Accumulators ──────────────────────────────────────────────────────────

  addClaude(model: 'sonnet' | 'haiku', inputTokens: number, outputTokens: number): void {
    if (model === 'sonnet') {
      this.sonnetIn  += inputTokens;
      this.sonnetOut += outputTokens;
    } else {
      this.haikuIn  += inputTokens;
      this.haikuOut += outputTokens;
    }
  }

  addImage(size: '1024x1024' | '1792x1024' = '1024x1024'): void {
    if (size === '1792x1024') {
      this.imagesWide++;
    } else {
      this.imagesSquare++;
    }
  }

  /** Track Sarvam TTS usage by character count of input text. */
  addAudio(chars: number): void {
    this.audioChars += chars;
  }

  /** Track one Perplexity search call. */
  addSearch(): void {
    this.searches++;
  }

  // ─── Conversion ────────────────────────────────────────────────────────────

  toUSD(): number {
    return (
      (this.sonnetIn * SONNET_IN_PER_M + this.sonnetOut * SONNET_OUT_PER_M) / 1_000_000 +
      (this.haikuIn * HAIKU_IN_PER_M + this.haikuOut * HAIKU_OUT_PER_M) / 1_000_000 +
      this.imagesSquare * DALLE3_HD_SQ +
      this.imagesWide   * DALLE3_HD_WIDE +
      this.audioChars   * SARVAM_PER_CHAR +
      this.searches     * PERPLEXITY_PER
    );
  }

  /**
   * Convert total API cost → credits to charge the user.
   * Formula: ceil( (usd × 85 × 2.5) / 0.33 )
   * Never less than MIN_CREDITS (10).
   */
  toCredits(): number {
    const usd     = this.toUSD();
    const inr     = usd * USD_TO_INR;
    const credits = Math.ceil((inr * MARGIN) / INR_PER_CREDIT);
    return Math.max(MIN_CREDITS, credits);
  }

  /** Structured summary for logging / task metadata. */
  summary(): {
    sonnetTokens: { in: number; out: number };
    haikuTokens:  { in: number; out: number };
    images:       { square: number; wide: number };
    audioChars:   number;
    searches:     number;
    costUSD:      string;
    creditsCharged: number;
  } {
    return {
      sonnetTokens:   { in: this.sonnetIn, out: this.sonnetOut },
      haikuTokens:    { in: this.haikuIn,  out: this.haikuOut  },
      images:         { square: this.imagesSquare, wide: this.imagesWide },
      audioChars:     this.audioChars,
      searches:       this.searches,
      costUSD:        this.toUSD().toFixed(4),
      creditsCharged: this.toCredits(),
    };
  }
}
