// ─── Environment Configuration Validator ─────────────────────────────────────
// Validates all required environment variables at startup.

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`[Config] Missing required environment variable: ${key}`);
  }
  return value.trim();
}

function optionalEnv(key: string, defaultValue: string): string {
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : defaultValue;
}

function optionalEnvBool(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

function optionalEnvInt(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// ─── Validate & Export Config ─────────────────────────────────────────────────

export interface AppConfig {
  // Database
  DATABASE_URL: string;
  // DIRECT_URL: direct (non-pooled) Neon connection — used by Prisma for migrations
  // Falls back to DATABASE_URL when not set (fine for local/non-Neon setups)
  DIRECT_URL: string;
  REDIS_URL: string;

  // Auth
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;

  // AI APIs
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
  PERPLEXITY_API_KEY: string;
  GEMINI_API_KEY: string;
  ELEVENLABS_API_KEY: string;

  // Razorpay
  RAZORPAY_KEY_ID: string;
  RAZORPAY_KEY_SECRET: string;
  RAZORPAY_WEBHOOK_SECRET: string;

  // Cloudflare R2 storage
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_URL: string;

  // App URLs
  CORS_ORIGINS: string[];
  API_URL: string;
  WEB_URL: string;

  // Admin
  ADMIN_EMAIL: string;

  // Environment
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;

  // Feature flags
  ENABLE_SELF_IMPROVE: boolean;
  ENABLE_PLATFORM_MONITOR: boolean;
}

function loadConfig(): AppConfig {
  const nodeEnv = optionalEnv('NODE_ENV', 'development') as AppConfig['NODE_ENV'];

  // In test mode some env vars may be mocked
  const isTest = nodeEnv === 'test';

  const corsOriginsRaw = optionalEnv('CORS_ORIGINS', 'http://localhost:3000');
  const corsOrigins = corsOriginsRaw.split(',').map(s => s.trim()).filter(Boolean);

  return {
    // Database
    DATABASE_URL: isTest ? optionalEnv('DATABASE_URL', 'postgresql://localhost/arivarangam_test') : requireEnv('DATABASE_URL'),
    // DIRECT_URL falls back to DATABASE_URL — only needed for Neon pooled setups
    DIRECT_URL: optionalEnv('DIRECT_URL', isTest ? 'postgresql://localhost/arivarangam_test' : ''),
    REDIS_URL: optionalEnv('REDIS_URL', 'redis://localhost:6379'),

    // Auth
    JWT_SECRET: isTest ? optionalEnv('JWT_SECRET', 'test-secret-key-32-chars-minimum-!') : requireEnv('JWT_SECRET'),
    JWT_EXPIRES_IN: optionalEnv('JWT_EXPIRES_IN', '7d'),

    // AI APIs
    ANTHROPIC_API_KEY: isTest ? optionalEnv('ANTHROPIC_API_KEY', 'test-key') : requireEnv('ANTHROPIC_API_KEY'),
    OPENAI_API_KEY: isTest ? optionalEnv('OPENAI_API_KEY', 'test-key') : requireEnv('OPENAI_API_KEY'),
    PERPLEXITY_API_KEY: isTest ? optionalEnv('PERPLEXITY_API_KEY', 'test-key') : requireEnv('PERPLEXITY_API_KEY'),
    GEMINI_API_KEY: optionalEnv('GEMINI_API_KEY', ''), // optional — Gemini reviewer
    ELEVENLABS_API_KEY: optionalEnv('ELEVENLABS_API_KEY', ''), // optional — only needed for voice tasks

    // Razorpay (optional — configure before enabling billing)
    RAZORPAY_KEY_ID: optionalEnv('RAZORPAY_KEY_ID', ''),
    RAZORPAY_KEY_SECRET: optionalEnv('RAZORPAY_KEY_SECRET', ''),
    RAZORPAY_WEBHOOK_SECRET: optionalEnv('RAZORPAY_WEBHOOK_SECRET', ''),

    // Cloudflare R2 storage
    R2_ACCOUNT_ID: isTest ? optionalEnv('R2_ACCOUNT_ID', 'test') : requireEnv('R2_ACCOUNT_ID'),
    R2_ACCESS_KEY_ID: isTest ? optionalEnv('R2_ACCESS_KEY_ID', 'test') : requireEnv('R2_ACCESS_KEY_ID'),
    R2_SECRET_ACCESS_KEY: isTest ? optionalEnv('R2_SECRET_ACCESS_KEY', 'test') : requireEnv('R2_SECRET_ACCESS_KEY'),
    R2_BUCKET_NAME: optionalEnv('R2_BUCKET_NAME', 'arivarangam'),
    R2_PUBLIC_URL: optionalEnv('R2_PUBLIC_URL', ''),

    // App URLs
    CORS_ORIGINS: corsOrigins,
    API_URL: optionalEnv('API_URL', 'http://localhost:3001'),
    WEB_URL: optionalEnv('WEB_URL', 'http://localhost:3000'),

    // Admin
    ADMIN_EMAIL: optionalEnv('ADMIN_EMAIL', 'admin@arivarangam.com'),

    // Environment
    NODE_ENV: nodeEnv,
    PORT: optionalEnvInt('PORT', 3001),

    // Feature flags
    ENABLE_SELF_IMPROVE: optionalEnvBool('ENABLE_SELF_IMPROVE', true),
    ENABLE_PLATFORM_MONITOR: optionalEnvBool('ENABLE_PLATFORM_MONITOR', true),
  };
}

// Singleton — load once
let _config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

// Reset for testing
export function resetConfig(): void {
  _config = null;
}

export const config = new Proxy({} as AppConfig, {
  get(_target, prop: string) {
    return getConfig()[prop as keyof AppConfig];
  },
});

export default config;
