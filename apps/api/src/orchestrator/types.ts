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

// ─── Design Spec (rich visual blueprint, produced after Analyze) ─────────────

export interface DesignColorSystem {
  bg: string;            // page background
  surface: string;       // card / panel background
  surfaceAlt: string;    // alternate surface (slightly lighter/darker)
  primary: string;       // primary accent
  secondary: string;     // secondary accent
  accent: string;        // highlight / glow
  text: string;          // body text
  textMuted: string;     // secondary text
  border: string;        // border color (rgba usually)
  gradients: string[];   // key gradient declarations
}

export interface DesignTypography {
  displayFont: string;       // heading font name
  bodyFont: string;          // body font name
  googleFontsUrl: string;    // full Google Fonts CDN link
  heroSize: string;          // e.g. "clamp(3rem, 7vw, 6rem)"
  h2Size: string;
  h3Size: string;
  heroWeight: number;        // 800 or 900
  letterSpacingHero: string; // e.g. "-0.04em"
}

export interface DesignSection {
  name: string;           // e.g. "hero", "features", "pricing", "cta", "footer"
  layout: string;         // describe the layout pattern
  elements: string[];     // exact elements in order: ["gradient mesh bg", "headline", ...]
  colors: string;         // which colors used where in this section
  animation: string;      // GSAP: what animates, from/to values, timing
}

export interface DesignComponent {
  name: string;
  style: string;  // full CSS description: bg, border, radius, padding, hover states
}

export interface DesignSpec {
  overallMood: string;        // e.g. "Premium dark SaaS, indigo/violet glow aesthetic"
  colorSystem: DesignColorSystem;
  typography: DesignTypography;
  sections: DesignSection[];
  components: DesignComponent[];
  specialEffects: string[];   // e.g. "Mesh gradient hero bg", "Noise texture overlay"
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
