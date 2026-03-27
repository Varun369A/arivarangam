import { FastifyRequest, FastifyReply } from 'fastify';

// ─── Auth Rate Limits (per-route, tighter than global 100/min) ────────────────
// Used in route config: { config: { rateLimit: AUTH_RATE_LIMIT } }

export const LOGIN_RATE_LIMIT = {
  max: 5,
  timeWindow: '15 minutes',
  errorResponseBuilder: () => ({
    success: false,
    error: 'Too many login attempts. Please wait 15 minutes.',
    code: 'RATE_LIMIT',
  }),
};

export const SIGNUP_RATE_LIMIT = {
  max: 3,
  timeWindow: '1 hour',
  errorResponseBuilder: () => ({
    success: false,
    error: 'Too many sign-up attempts from this IP. Please try again later.',
    code: 'RATE_LIMIT',
  }),
};

export const OTP_RATE_LIMIT = {
  max: 3,
  timeWindow: '15 minutes',
  errorResponseBuilder: () => ({
    success: false,
    error: 'Too many OTP requests. Please wait 15 minutes.',
    code: 'RATE_LIMIT',
  }),
};

export const FORGOT_PASSWORD_RATE_LIMIT = {
  max: 3,
  timeWindow: '1 hour',
  errorResponseBuilder: () => ({
    success: false,
    error: 'Too many password reset requests. Please try again later.',
    code: 'RATE_LIMIT',
  }),
};

export const TASK_CREATE_RATE_LIMIT = {
  max: 20,
  timeWindow: '10 minutes',
  errorResponseBuilder: () => ({
    success: false,
    error: 'Too many tasks created. Please slow down.',
    code: 'RATE_LIMIT',
  }),
};

// ─── Prompt Injection Sanitization ────────────────────────────────────────────
// Defends against users trying to override system instructions sent to AI agents.

const INJECTION_PATTERNS = [
  // Direct override attempts
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /disregard\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /forget\s+(all\s+)?(previous|prior|above)\s+instructions?/gi,
  /override\s+(your\s+)?(system\s+)?(prompt|instructions?)/gi,

  // Role hijacking
  /you\s+are\s+now\s+(a|an|the)\s+/gi,
  /act\s+as\s+(a|an|the)\s+/gi,
  /pretend\s+(you\s+are|to\s+be)\s+/gi,
  /from\s+now\s+on\s+you\s+are\s+/gi,
  /your\s+new\s+(role|identity|persona)\s+is/gi,

  // System prompt leakage attempts
  /reveal\s+(your|the)\s+system\s+prompt/gi,
  /show\s+me\s+(your|the)\s+(system\s+prompt|instructions?)/gi,
  /what\s+(are\s+your|is\s+your)\s+(system\s+)?instructions?/gi,
  /print\s+(your|the)\s+system\s+prompt/gi,
  /output\s+(your|the)\s+(system\s+)?instructions?/gi,

  // DAN / jailbreak patterns
  /do\s+anything\s+now/gi,
  /\bDAN\b/g,
  /jailbreak/gi,

  // Delimiter injection
  /<\|?system\|?>/gi,
  /\[INST\]/gi,
  /\[\/INST\]/gi,
  /<<SYS>>/gi,
];

/**
 * Sanitizes a user-supplied prompt to remove prompt injection attempts.
 * Returns the cleaned prompt and a flag indicating if it was modified.
 */
export function sanitizePrompt(prompt: string): { sanitized: string; wasModified: boolean } {
  let sanitized = prompt;
  let wasModified = false;

  for (const pattern of INJECTION_PATTERNS) {
    const replaced = sanitized.replace(pattern, '[redacted]');
    if (replaced !== sanitized) {
      wasModified = true;
      sanitized = replaced;
    }
  }

  // Collapse whitespace left by replacements
  sanitized = sanitized.replace(/\s{3,}/g, '  ').trim();

  return { sanitized, wasModified };
}

// ─── Tenant Isolation Guard ────────────────────────────────────────────────────
// Use this to verify a resource belongs to the authenticated user before returning it.

export function assertOwnership(
  resourceUserId: string,
  requestUserId: string,
  reply: FastifyReply
): boolean {
  if (resourceUserId !== requestUserId) {
    reply.code(404).send({ success: false, error: 'Resource not found', code: 'NOT_FOUND' });
    return false;
  }
  return true;
}

// ─── Safe Error Response ───────────────────────────────────────────────────────
// Strips internal details before sending 500 errors to clients.

export function safeError(err: unknown): string {
  if (process.env.NODE_ENV === 'development') {
    return err instanceof Error ? err.message : String(err);
  }
  return 'An unexpected error occurred.';
}
