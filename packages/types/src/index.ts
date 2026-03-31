// ─── Core Enumerations ───────────────────────────────────────────────────────

export type AIModel =
  | 'claude-haiku'
  | 'claude-sonnet'
  | 'gpt-4o'
  | 'gpt-image-1'
  | 'perplexity-sonar'
  | 'sarvam';

export type TaskCategory = 'code' | 'research' | 'image' | 'content' | 'mobile' | 'presentation' | 'agent' | 'workflow' | 'animation';

export type TaskStatus =
  | 'pending'
  | 'analyzing'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type UserTier = 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS' | 'ADMIN';

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';

// ─── Credit Types ─────────────────────────────────────────────────────────────

export interface CreditPack {
  id: string;
  name: string;
  price_inr: number;
  credits: number;
  popular: boolean;
  description?: string;
}

export interface CreditEstimate {
  min: number;
  max: number;
  typical: number;
  disclaimer: string;
}

export type CreditTransactionType =
  | 'PURCHASE'
  | 'USAGE'
  | 'REFUND'
  | 'SIGNUP_BONUS'
  | 'ADMIN_GRANT';

export type CreditTransactionStatus =
  | 'PENDING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REFUNDED';

// ─── Task Event Types ─────────────────────────────────────────────────────────

export type TaskEventType =
  | 'file_created'
  | 'file_updated'
  | 'command_run'
  | 'error'
  | 'error_fixed'
  | 'preview_ready'
  | 'completed'
  | 'log';

export interface TaskEvent {
  type: TaskEventType;
  data: any;
  timestamp: string; // ISO 8601
}

// ─── JWT ──────────────────────────────────────────────────────────────────────

export interface JWTPayload {
  sub: string;       // userId
  email: string;
  tier: UserTier;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

// ─── User Types ───────────────────────────────────────────────────────────────

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  tier: UserTier;
  credits: number;
  totalCreditsUsed: number;
  isAdmin: boolean;
  isEmailVerified: boolean;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithStats extends PublicUser {
  tasksCount: number;
  reposCount: number;
  totalTransactions: number;
  totalSpentInr: number;
}

// ─── Task Types ───────────────────────────────────────────────────────────────

export interface TaskFile {
  path: string;
  content: string;
  language?: string;
}

export interface TaskMetadata {
  files?: TaskFile[];
  imageUrl?: string;
  audioUrl?: string;
  report?: string;
  engineData?: Record<string, any>;
  followUpCount?: number;
}

export interface Task {
  id: string;
  userId: string;
  category: TaskCategory;
  status: TaskStatus;
  prompt: string;
  creditsEstimatedMin: number;
  creditsEstimatedMax: number;
  creditsActuallyUsed: number | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  previewUrl: string | null;
  deployUrl: string | null;
  isPublic: boolean;
  repoId: string | null;
  metadata: TaskMetadata | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskWithEvents extends Task {
  events: StoredTaskEvent[];
}

export interface StoredTaskEvent {
  id: string;
  taskId: string;
  type: TaskEventType;
  data: any;
  createdAt: string;
}

// ─── Repo Types ───────────────────────────────────────────────────────────────

export interface RepoFile {
  path: string;
  content: string;
}

export interface RepoVersion {
  version: number;
  files: RepoFile[];
  savedAt: string;
  message: string;
}

export interface Repo {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  taskId: string | null;
  files: RepoFile[];
  versions: RepoVersion[];
  currentVersion: number;
  isPublic: boolean;
  deployUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Billing Types ────────────────────────────────────────────────────────────

export interface CreditTransaction {
  id: string;
  userId: string;
  type: CreditTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  razorpaySignature: string | null;
  packId: string | null;
  taskId: string | null;
  status: CreditTransactionStatus;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

// ─── Platform Log Types ───────────────────────────────────────────────────────

export type PlatformLogType =
  | 'ERROR'
  | 'FIX_APPLIED'
  | 'IMPROVEMENT'
  | 'SECURITY'
  | 'MODEL_ADDED'
  | 'MONITOR';

export type PlatformLogSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface PlatformLog {
  id: string;
  type: PlatformLogType;
  severity: PlatformLogSeverity;
  title: string;
  description: string;
  filePath: string | null;
  oldCode: string | null;
  newCode: string | null;
  approved: boolean;
  approvedAt: string | null;
  createdAt: string;
}

// ─── Security Types ───────────────────────────────────────────────────────────

export type SecurityEventType =
  | 'SUSPICIOUS_PURCHASE'
  | 'CHARGEBACK'
  | 'RATE_LIMIT'
  | 'VPN_DETECTED'
  | 'FAILED_AUTH'
  | 'ACCOUNT_FROZEN';

export type SecurityEventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SecurityEvent {
  id: string;
  userId: string | null;
  type: SecurityEventType;
  severity: SecurityEventSeverity;
  description: string;
  ipAddress: string | null;
  metadata: Record<string, any> | null;
  resolved: boolean;
  resolvedAt: string | null;
  createdAt: string;
}

// ─── Model Performance Types ──────────────────────────────────────────────────

export interface ModelPerformance {
  id: string;
  model: string;
  taskCategory: string;
  promptVersion: string;
  successRate: number;
  avgLatencyMs: number;
  avgCostUsd: number;
  sampleSize: number;
  createdAt: string;
}

// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, string>;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Admin Types ──────────────────────────────────────────────────────────────

export interface AdminHealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  models: {
    claude: { status: string; latencyMs?: number };
    openai: { status: string; latencyMs?: number };
    perplexity: { status: string; latencyMs?: number };
    sarvam: { status: string; latencyMs?: number };
  };
  redis: { status: string };
  database: { status: string };
  activeTasks: number;
  errorRateLast1h: number;
}

export interface AdminRevenueStats {
  today: number;
  thisMonth: number;
  lastMonth: number;
  allTime: number;
  byPack: { packId: string; packName: string; count: number; totalInr: number }[];
  dailyBreakdown: { date: string; amount: number }[];
}

// ─── SSE Types ────────────────────────────────────────────────────────────────

export interface SSEMessage {
  event: string;
  data: string;
  id?: string;
  retry?: number;
}

// ─── Misc Utility Types ───────────────────────────────────────────────────────

export interface RequestUser {
  id: string;
  email: string;
  tier: UserTier;
  isAdmin: boolean;
}
