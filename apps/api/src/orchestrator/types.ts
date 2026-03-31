// ─── Orchestrator Types ───────────────────────────────────────────────────────

import type { TaskEvent } from '@arivarangam/types';

export type OnEvent = (event: TaskEvent) => Promise<void>;

// ─── Prompt Analysis ──────────────────────────────────────────────────────────

export interface PromptAnalysis {
  domain: string;          // e.g. "SaaS landing page", "Discord bot", "data dashboard"
  complexity: 'simple' | 'medium' | 'complex';
  hasAnimationRequest: boolean;
  hasSecurityRequirement: boolean;
  colorTheme: string | null;  // e.g. "dark", "minimal white", "neon cyberpunk"
  techStack: string[];        // detected tech hints from prompt
  specialRequirements: string[];
}

// ─── Build Plan ───────────────────────────────────────────────────────────────

export interface FilePlanEntry {
  path: string;
  description: string;
  dependsOn: string[];
}

export interface BuildPlan {
  files: FilePlanEntry[];
  colorPalette: string;
  fontPairing: string;
  animationStyle: string;
  layoutStyle: string;
  techStack: string[];
}

// ─── Review Result ────────────────────────────────────────────────────────────

export interface ReviewFailure {
  file: string;
  issue: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ReviewResult {
  passed: boolean;
  score: number;    // 0–10
  failures: ReviewFailure[];
  suggestions: string[];
}

// ─── Built File ───────────────────────────────────────────────────────────────

export interface BuiltFile {
  path: string;
  content: string;
  language?: string;
}

// ─── Job Package (what orchestrator sends to each phase) ─────────────────────

export interface JobPackage {
  taskId: string;
  userId: string;
  category: string;
  prompt: string;
  analysis: PromptAnalysis;
  plan: BuildPlan;
  categoryRules: CategoryRuleSet;
}

// ─── Category Rules ───────────────────────────────────────────────────────────

export interface FileSpec {
  path: string;
  description: string;
  required: boolean;
  dependsOn?: string[];
}

export interface CategoryRuleSet {
  id: string;
  name: string;
  fileSpecs: FileSpec[];
  systemPromptCore: string;   // injected into EVERY Claude call for this category
  planningHints: string;      // injected into PlanPhase only
  buildHints: string;         // injected into BuildPhase only
  reviewCriteria: string;     // injected into ReviewPhase
  qualityThreshold: number;   // 0–10, must score above this to skip repair
  maxRepairAttempts: number;
  appliedRuleSets: string[];  // e.g. ['design', 'motion', 'security']
}
