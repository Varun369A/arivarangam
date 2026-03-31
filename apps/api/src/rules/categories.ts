// ─── Category Rule Sets ───────────────────────────────────────────────────────
// Per-category rules: file manifests, system prompt cores, quality targets.

import type { CategoryRuleSet } from '../orchestrator/types';

// ─── WEB / CODE ───────────────────────────────────────────────────────────────

export const WEB_RULES: CategoryRuleSet = {
  id: 'web',
  name: 'Web Application',
  appliedRuleSets: ['design', 'motion', 'security'],
  qualityThreshold: 7,
  maxRepairAttempts: 2,
  fileSpecs: [
    { path: 'index.html',  description: 'Main HTML entry point',       required: true },
    { path: 'styles.css',  description: 'All styles and CSS variables', required: true },
    { path: 'app.js',      description: 'All JS logic and animations',  required: true },
  ],
  systemPromptCore: `You are building a premium web application.
TECH STACK: Vanilla HTML/CSS/JS with CDN libraries (GSAP, Lenis, Google Fonts).
NO React, NO Vue, NO build tools — pure browser-ready files.
Every file must be complete and production-ready.`,
  planningHints: `Plan a complete file structure. Consider: hero section, navigation, features/services, about, testimonials/stats, CTA, footer.
Choose a specific color palette and font pair before planning files.`,
  buildHints: `Build each file completely. CSS file must define all :root variables first.
JS file must initialize GSAP + Lenis at the top. All animations use ScrollTrigger.`,
  reviewCriteria: `Check: (1) All CDN scripts present and in correct order, (2) GSAP registered and initialized,
(3) Lenis smooth scroll setup, (4) ScrollTrigger on all sections, (5) Responsive CSS,
(6) Google Fonts loaded, (7) Color variables defined at :root, (8) No hardcoded colors outside :root,
(9) All external links have rel="noopener noreferrer", (10) Meta viewport present.`,
};

// ─── ANIMATION ────────────────────────────────────────────────────────────────

export const ANIMATION_RULES: CategoryRuleSet = {
  id: 'animation',
  name: 'Interactive Animation',
  appliedRuleSets: ['design', 'motion'],
  qualityThreshold: 7,
  maxRepairAttempts: 2,
  fileSpecs: [
    { path: 'index.html', description: 'HTML canvas/container',   required: true },
    { path: 'styles.css', description: 'Layout and base styles',  required: true },
    { path: 'scene.js',   description: 'Animation scene code',    required: true },
  ],
  systemPromptCore: `You are building a premium interactive animation/visual experience.
Choose the best approach: Three.js (3D), GSAP (motion), Canvas API (2D), or tsParticles (particles).
The result must be visually stunning — think award-winning creative coding.`,
  planningHints: `Decide: WebGL/Three.js scene, canvas 2D art, or GSAP timeline animation?
Plan the visual concept: what moves, what colors, what mood.`,
  buildHints: `The scene.js must initialize immediately on DOMContentLoaded.
Include a render loop if using Three.js or Canvas. Use requestAnimationFrame.`,
  reviewCriteria: `Check: (1) Animation starts immediately, (2) Render loop present,
(3) Responsive canvas size, (4) No console errors in logic, (5) Smooth 60fps (no blocking sync operations).`,
};

// ─── MOBILE ───────────────────────────────────────────────────────────────────

export const MOBILE_RULES: CategoryRuleSet = {
  id: 'mobile',
  name: 'React Native / Expo App',
  appliedRuleSets: ['design'],
  qualityThreshold: 7,
  maxRepairAttempts: 2,
  fileSpecs: [
    { path: 'App.tsx',              description: 'Root component with navigation', required: true },
    { path: 'package.json',         description: 'Expo dependencies',             required: true },
    { path: 'app.json',             description: 'Expo config',                   required: true },
    { path: 'components/index.tsx', description: 'Reusable UI components',        required: false },
    { path: 'screens/index.tsx',    description: 'Screen components',             required: false },
  ],
  systemPromptCore: `You are building a React Native app with Expo SDK 51+.
Use: expo-router for navigation, react-native-reanimated v3 for animations,
expo-linear-gradient, @expo/vector-icons, and react-native-safe-area-context.
Style with StyleSheet.create() — no inline styles except for dynamic values.`,
  planningHints: `Plan: screen flow, navigation structure, main data entities, key components.
Use TypeScript throughout. Expo Router file-based routing.`,
  buildHints: `All animated values use useSharedValue + useAnimatedStyle.
All screens wrapped in SafeAreaView. Keyboard handling with KeyboardAvoidingView.`,
  reviewCriteria: `Check: (1) expo-router structure valid, (2) No React Native Web-only APIs,
(3) Reanimated v3 API used (not v2), (4) TypeScript types defined, (5) No hardcoded device dimensions.`,
};

// ─── PRESENTATION ─────────────────────────────────────────────────────────────

export const PRESENTATION_RULES: CategoryRuleSet = {
  id: 'presentation',
  name: 'Reveal.js Presentation',
  appliedRuleSets: ['design', 'motion'],
  qualityThreshold: 7,
  maxRepairAttempts: 1,
  fileSpecs: [
    { path: 'index.html', description: 'Complete self-contained Reveal.js presentation', required: true },
    { path: 'styles.css', description: 'Custom slide theme and animations',              required: true },
  ],
  systemPromptCore: `You are building a premium Reveal.js presentation (v5 CDN).
Each slide section must have a unique visual design. Use fragment animations, code highlighting (highlight.js),
and custom CSS transitions. The presentation must feel like a designer made it.`,
  planningHints: `Plan: slide count (8–20 for typical request), key narrative structure, visual theme.
Each slide should have a clear purpose: title, overview, detail, demo, CTA.`,
  buildHints: `Use Reveal.js 5 CDN. Add speaker notes in <aside class="notes">.
Style with CSS custom properties. Add fragment animations on key points.`,
  reviewCriteria: `Check: (1) Reveal.initialize() called, (2) All slides have content,
(3) Speaker notes present on most slides, (4) Custom theme applied, (5) Code blocks highlighted.`,
};

// ─── CONTENT ──────────────────────────────────────────────────────────────────

export const CONTENT_RULES: CategoryRuleSet = {
  id: 'content',
  name: 'Content Creation',
  appliedRuleSets: [],
  qualityThreshold: 6,
  maxRepairAttempts: 1,
  fileSpecs: [
    { path: 'article.md',        description: 'Main content piece',     required: true },
    { path: 'meta.json',         description: 'SEO metadata',           required: true },
    { path: 'social-copy.md',    description: 'Social media variations', required: false },
  ],
  systemPromptCore: `You are an expert content writer and SEO specialist.
Write in a confident, engaging voice. Use clear H2/H3 structure, short paragraphs (3–4 lines max),
and include data/statistics where relevant. Optimize for both readers and search engines.`,
  planningHints: `Plan: target audience, key points (5–8 for typical article), SEO keywords, word count.`,
  buildHints: `Lead with a hook in the first 2 sentences. Include a clear takeaway in the conclusion.
SEO: title 50–60 chars, meta description 150–160 chars, H2s contain keywords naturally.`,
  reviewCriteria: `Check: (1) Adequate word count, (2) Clear structure with H2/H3, (3) No fluff or filler,
(4) Meta description present, (5) Call to action included.`,
};

// ─── AGENT ────────────────────────────────────────────────────────────────────

export const AGENT_RULES: CategoryRuleSet = {
  id: 'agent',
  name: 'AI Agent',
  appliedRuleSets: ['security'],
  qualityThreshold: 7,
  maxRepairAttempts: 2,
  fileSpecs: [
    { path: 'agent.py',           description: 'Main agent entry point', required: true },
    { path: 'requirements.txt',   description: 'Python dependencies',    required: true },
    { path: 'tools.py',           description: 'Tool definitions',       required: false },
    { path: 'README.md',          description: 'Setup and usage guide',  required: true },
    { path: '.env.example',       description: 'Required env vars',      required: true },
  ],
  systemPromptCore: `You are building a Python AI agent using LangChain or CrewAI.
Use proper async patterns, comprehensive error handling, and clear logging.
Every tool must have a docstring describing its purpose, inputs, and outputs.`,
  planningHints: `Decide: LangChain (single agent + tools) or CrewAI (multi-agent crew)?
Plan: what tools are needed, what the agent's main task loop looks like.`,
  buildHints: `Use python-dotenv for env vars. Add retry logic on LLM calls.
Logging: use Python logging module, not print statements.`,
  reviewCriteria: `Check: (1) All imports resolve, (2) Error handling on all tool calls,
(3) .env.example has all required vars, (4) README has clear setup steps, (5) No hardcoded API keys.`,
};

// ─── WORKFLOW ─────────────────────────────────────────────────────────────────

export const WORKFLOW_RULES: CategoryRuleSet = {
  id: 'workflow',
  name: 'Automation Workflow',
  appliedRuleSets: ['security'],
  qualityThreshold: 6,
  maxRepairAttempts: 1,
  fileSpecs: [
    { path: 'workflow.json', description: 'n8n workflow export or config', required: true },
    { path: 'README.md',     description: 'Setup and trigger instructions', required: true },
    { path: '.env.example',  description: 'Required credentials',           required: true },
  ],
  systemPromptCore: `You are building an automation workflow (n8n, Make.com, or shell scripts).
Be explicit about trigger conditions, data transformations, and error handling nodes.
Every workflow needs a clear description of what triggers it and what it produces.`,
  planningHints: `Plan: trigger type, data flow between nodes, error handling path, output format.`,
  buildHints: `n8n JSON must be valid and importable. Shell scripts must be POSIX-compatible.
Add comments explaining non-obvious logic.`,
  reviewCriteria: `Check: (1) Valid JSON structure, (2) All node connections defined, (3) Error handling node present.`,
};

// ─── RESEARCH ─────────────────────────────────────────────────────────────────

export const RESEARCH_RULES: CategoryRuleSet = {
  id: 'research',
  name: 'Research Report',
  appliedRuleSets: [],
  qualityThreshold: 7,
  maxRepairAttempts: 1,
  fileSpecs: [
    { path: 'report.md',     description: 'Full research report with sources', required: true },
    { path: 'summary.md',    description: 'Executive summary (1 page)',        required: true },
    { path: 'sources.json',  description: 'Structured source list',            required: false },
  ],
  systemPromptCore: `You are a research analyst. Synthesize information into clear, structured reports.
Use numbered citations [1], [2] etc. Distinguish between established facts and analysis.
Every claim needs a basis — avoid speculation presented as fact.`,
  planningHints: `Plan: key research questions, structure (executive summary, analysis sections, conclusions).`,
  buildHints: `Start report with executive summary. Use tables for comparisons. End with actionable conclusions.`,
  reviewCriteria: `Check: (1) All claims sourced or clearly marked as analysis, (2) Executive summary present,
(3) Clear section structure, (4) Actionable conclusions.`,
};

// ─── DATA VIZ ─────────────────────────────────────────────────────────────────

export const DATAVIZ_RULES: CategoryRuleSet = {
  id: 'dataviz',
  name: 'Data Visualization Dashboard',
  appliedRuleSets: ['design'],
  qualityThreshold: 7,
  maxRepairAttempts: 2,
  fileSpecs: [
    { path: 'index.html', description: 'Dashboard HTML layout',      required: true },
    { path: 'styles.css', description: 'Dashboard styles and theme', required: true },
    { path: 'charts.js',  description: 'Chart initialization code',  required: true },
    { path: 'data.js',    description: 'Sample data arrays',         required: true },
  ],
  systemPromptCore: `You are building an interactive data visualization dashboard.
Use Chart.js 4 (CDN) as the primary charting library. Add D3.js for advanced visualizations if needed.
All charts must have: proper labels, tooltips, responsive sizing, and animation on load.
Use a dark theme by default for dashboard aesthetics.`,
  planningHints: `Plan: what charts are needed (bar, line, pie, scatter, etc.), layout grid, data story.
Decide the color palette for chart series (consistent across all charts).`,
  buildHints: `Initialize all charts inside DOMContentLoaded. Each chart in its own canvas element.
Add filter/toggle controls where useful. charts.js depends on data.js — build data.js first.`,
  reviewCriteria: `Check: (1) All canvas elements have Chart.js initialized, (2) Responsive sizing,
(3) Tooltips configured, (4) Legend present on multi-series charts, (5) Data is realistic sample data.`,
};

// ─── LOGO ─────────────────────────────────────────────────────────────────────

export const LOGO_RULES: CategoryRuleSet = {
  id: 'logo',
  name: 'SVG Logo Kit',
  appliedRuleSets: ['design'],
  qualityThreshold: 7,
  maxRepairAttempts: 2,
  fileSpecs: [
    { path: 'logo-primary.svg',    description: 'Full color primary logo',     required: true },
    { path: 'logo-dark.svg',       description: 'Dark/reversed logo variant',  required: true },
    { path: 'logo-mark.svg',       description: 'Icon-only logomark',          required: true },
    { path: 'logo-horizontal.svg', description: 'Horizontal layout variant',   required: true },
    { path: 'favicon.svg',         description: 'Favicon-optimized SVG',       required: true },
    { path: 'brand-colors.css',    description: 'CSS custom properties',       required: true },
    { path: 'usage-guide.md',      description: 'Logo usage guidelines',       required: true },
  ],
  systemPromptCore: `You are a professional logo designer creating SVG logos.
Each SVG must be clean, scalable vector art using only <path>, <circle>, <rect>, <polygon>, <text>.
No raster images, no embedded photos. viewBox must be set. Include title element for accessibility.
The logo must look professional and work at both 32px and 500px sizes.`,
  planningHints: `Plan the visual concept: what does the logo symbolize? geometric/wordmark/lettermark/combination?
Choose: primary color, secondary, accent. Font for wordmark.`,
  buildHints: `Use precise SVG paths. Test at both small (32px) and large (500px) sizes mentally.
Colors via CSS custom properties in <defs><style>. Dark variant uses white/light fills.`,
  reviewCriteria: `Check: (1) All SVGs have viewBox, (2) No external image references, (3) title element present,
(4) Works at small sizes (simple enough), (5) brand-colors.css has all used custom properties.`,
};

// ─── BANNER ───────────────────────────────────────────────────────────────────

export const BANNER_RULES: CategoryRuleSet = {
  id: 'banner',
  name: 'Social Media Banner Kit',
  appliedRuleSets: ['design'],
  qualityThreshold: 7,
  maxRepairAttempts: 1,
  fileSpecs: [
    { path: 'facebook-1200x630.html',     description: 'Facebook OG banner',       required: true },
    { path: 'instagram-1080x1080.html',   description: 'Instagram post',           required: true },
    { path: 'instagram-story-1080x1920.html', description: 'Instagram story',      required: true },
    { path: 'linkedin-1200x627.html',     description: 'LinkedIn banner',          required: true },
    { path: 'twitter-1600x900.html',      description: 'Twitter/X banner',         required: true },
    { path: 'youtube-1280x720.html',      description: 'YouTube thumbnail',        required: true },
    { path: 'google-300x250.html',        description: 'Google Display Ad',        required: true },
    { path: 'README.md',                  description: 'Export and usage guide',   required: true },
  ],
  systemPromptCore: `You are a professional banner designer creating social media graphics.
Each banner is a self-contained HTML file with EXACT pixel dimensions set on html, body, and the main container.
html, body, .banner { width: Npx; height: Mpx; margin: 0; padding: 0; overflow: hidden; }
Use CSS animations and gradients. No external images — use CSS shapes, gradients, and SVG inline.`,
  planningHints: `Plan: brand name, tagline, CTA text, color palette, visual style.
Each banner has the same message but adapted layout for its dimensions.`,
  buildHints: `CRITICAL: Every banner must have exact px dimensions. No responsive CSS.
Use em/rem for typography. CSS animations for visual interest.`,
  reviewCriteria: `Check: (1) All 7 HTML files present, (2) Exact pixel dimensions on html+body,
(3) No external image src, (4) Consistent branding across all banners.`,
};

// ─── BRAND ────────────────────────────────────────────────────────────────────

export const BRAND_RULES: CategoryRuleSet = {
  id: 'brand',
  name: 'Brand Identity Kit',
  appliedRuleSets: ['design'],
  qualityThreshold: 7,
  maxRepairAttempts: 1,
  fileSpecs: [
    { path: 'brand-guide.md',       description: '1500+ word brand guidelines',    required: true },
    { path: 'colors.css',           description: 'Color system as CSS variables',  required: true },
    { path: 'typography.css',       description: 'Typography system',              required: true },
    { path: 'logo.svg',             description: 'Primary SVG logo',               required: true },
    { path: 'logo-dark.svg',        description: 'Dark variant logo',              required: true },
    { path: 'brand-preview.html',   description: 'Interactive style guide page',  required: true },
    { path: 'README.md',            description: 'Setup instructions',             required: true },
  ],
  systemPromptCore: `You are a senior brand strategist and designer creating a complete brand identity.
The brand-preview.html must be a beautiful interactive style guide using Tailwind CDN + GSAP.
It showcases: color swatches, typography specimens, button states, card components.`,
  planningHints: `Define: brand personality (3–5 adjectives), industry, target audience, visual direction.`,
  buildHints: `brand-guide.md must cover: mission, values, voice, color rationale, typography rationale, logo usage, don'ts.
brand-preview.html should be a premium-looking style guide, not just a plain list.`,
  reviewCriteria: `Check: (1) brand-guide.md 1000+ words, (2) All CSS files have :root variables,
(3) brand-preview.html renders a complete style guide, (4) Logo SVG is complete.`,
};

// ─── DESIGN SYSTEM ────────────────────────────────────────────────────────────

export const DESIGN_SYSTEM_RULES: CategoryRuleSet = {
  id: 'design_system',
  name: 'Design System',
  appliedRuleSets: ['design'],
  qualityThreshold: 7,
  maxRepairAttempts: 1,
  fileSpecs: [
    { path: 'tokens/colors.json',     description: 'Color design tokens',   required: true },
    { path: 'tokens/typography.json', description: 'Type scale tokens',     required: true },
    { path: 'tokens/spacing.json',    description: 'Spacing scale tokens',  required: true },
    { path: 'styles/tokens.css',      description: 'CSS custom properties', required: true },
    { path: 'tailwind.config.js',     description: 'Tailwind config',       required: true },
    { path: 'components/Button.tsx',  description: 'Button component',      required: true },
    { path: 'components/Card.tsx',    description: 'Card component',        required: true },
    { path: 'components/Input.tsx',   description: 'Input component',       required: true },
    { path: 'components/Badge.tsx',   description: 'Badge component',       required: true },
    { path: 'components/Modal.tsx',   description: 'Modal component',       required: true },
    { path: 'README.md',              description: 'Usage documentation',   required: true },
  ],
  systemPromptCore: `You are a design systems engineer building a production-ready component library.
Use a 3-layer token architecture: primitive → semantic → component.
All components use TypeScript with explicit prop types. Tailwind CSS for styling.
Components must support dark mode via CSS custom properties.`,
  planningHints: `Plan token naming convention, color scales (50–950), component variants (size, variant, state).`,
  buildHints: `tokens.css depends on tokens/colors.json — build JSON tokens first, then CSS.
Each component must export its props interface. Use forwardRef for form elements.`,
  reviewCriteria: `Check: (1) Token files have complete scales, (2) tailwind.config.js extends tokens,
(3) All components have TypeScript types, (4) Dark mode handled, (5) README has code examples.`,
};

// ─── MCP ──────────────────────────────────────────────────────────────────────

export const MCP_RULES: CategoryRuleSet = {
  id: 'mcp',
  name: 'MCP Server',
  appliedRuleSets: ['security'],
  qualityThreshold: 8,
  maxRepairAttempts: 2,
  fileSpecs: [
    { path: 'src/index.ts',      description: 'MCP server entry point',    required: true },
    { path: 'src/tools/index.ts', description: 'Tool implementations',     required: true },
    { path: 'src/types.ts',       description: 'Shared TypeScript types',  required: true },
    { path: 'package.json',       description: 'Dependencies and scripts', required: true },
    { path: 'tsconfig.json',      description: 'TypeScript config',        required: true },
    { path: '.env.example',       description: 'Required environment vars', required: true },
    { path: 'README.md',          description: 'Setup and tool reference', required: true },
  ],
  systemPromptCore: `You are building a TypeScript Model Context Protocol (MCP) server using @modelcontextprotocol/sdk.
Use Zod for input schema validation. Every tool must have: name, description, inputSchema (Zod), handler.
Tools must handle errors gracefully and return structured {content: [{type, text}]} responses.
Use stdio transport by default. Add HTTP transport if user requests.`,
  planningHints: `Plan: list all tools with their names, descriptions, and input/output shapes.
Decide: stdio (CLI usage) or HTTP (remote usage)?`,
  buildHints: `src/tools/index.ts exports an array of tool definitions.
src/index.ts creates the McpServer, registers tools, and connects transport.
All imports use .js extension (ESM), package.json type: "module".`,
  reviewCriteria: `Check: (1) All tools have Zod schemas, (2) Error handling in every tool,
(3) .js extensions on imports, (4) package.json has type: "module", (5) README has example usage.`,
};

// ─── BOT ──────────────────────────────────────────────────────────────────────

export const BOT_RULES: CategoryRuleSet = {
  id: 'bot',
  name: 'Discord / Telegram Bot',
  appliedRuleSets: ['security'],
  qualityThreshold: 7,
  maxRepairAttempts: 2,
  fileSpecs: [
    { path: 'src/index.ts',      description: 'Bot entry point',          required: true },
    { path: 'src/commands.ts',   description: 'Command handlers',         required: true },
    { path: 'src/handlers.ts',   description: 'Event/message handlers',   required: false },
    { path: 'package.json',      description: 'Dependencies',             required: true },
    { path: 'tsconfig.json',     description: 'TypeScript config',        required: true },
    { path: '.env.example',      description: 'Required token/env vars',  required: true },
    { path: 'README.md',         description: 'Setup and invite guide',   required: true },
  ],
  systemPromptCore: `For Discord: use discord.js v14 with SlashCommandBuilder, GatewayIntentBits, EmbedBuilder.
For Telegram: use grammy with Composer, InlineKeyboard, session middleware.
All slash commands must be registered in a separate deploy-commands.ts file.
Use dotenv for token management. Add proper error handling and logging.`,
  planningHints: `Detect platform from prompt. Plan: all commands/handlers, any AI integration, data persistence needs.`,
  buildHints: `Discord: Client uses GatewayIntentBits. Commands use builders. Handle interactionCreate.
Telegram: Bot uses bot.command(). Callback queries for inline keyboards.`,
  reviewCriteria: `Check: (1) Token loaded from .env, (2) All commands defined and handled,
(3) Error handling on all API calls, (4) README has bot invite link instructions.`,
};

// ─── IMAGE ────────────────────────────────────────────────────────────────────

export const IMAGE_RULES: CategoryRuleSet = {
  id: 'image',
  name: 'AI Image Generation',
  appliedRuleSets: [],
  qualityThreshold: 6,
  maxRepairAttempts: 0,
  fileSpecs: [],  // Image engine handles output separately
  systemPromptCore: `Enhance the user's image prompt for maximum visual quality.
Add: lighting description, style reference, composition details, quality modifiers.`,
  planningHints: `Analyze the prompt for: subject, style, mood, lighting. Enhance each dimension.`,
  buildHints: `Output an enhanced prompt optimized for DALL-E 3. Include aspect ratio guidance.`,
  reviewCriteria: `Check: prompt is vivid, specific, and includes style/lighting/composition details.`,
};

// ─── VOICE ────────────────────────────────────────────────────────────────────

export const VOICE_RULES: CategoryRuleSet = {
  id: 'voice',
  name: 'Voice/Audio Generation',
  appliedRuleSets: [],
  qualityThreshold: 6,
  maxRepairAttempts: 0,
  fileSpecs: [],  // Voice engine handles output separately
  systemPromptCore: `Prepare the text for high-quality text-to-speech synthesis.
Optimize for natural speech: punctuation for pacing, clear sentence breaks, pronunciation hints.`,
  planningHints: `Check: is the text ready for TTS? Add pauses via punctuation if needed.`,
  buildHints: `Output speech-ready text. Add [pause] markers if needed.`,
  reviewCriteria: `Check: text flows naturally when spoken aloud.`,
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const CATEGORY_RULES: Record<string, CategoryRuleSet> = {
  code:           WEB_RULES,
  web:            WEB_RULES,
  animation:      ANIMATION_RULES,
  mobile:         MOBILE_RULES,
  presentation:   PRESENTATION_RULES,
  content:        CONTENT_RULES,
  agent:          AGENT_RULES,
  workflow:       WORKFLOW_RULES,
  research:       RESEARCH_RULES,
  dataviz:        DATAVIZ_RULES,
  logo:           LOGO_RULES,
  banner:         BANNER_RULES,
  brand:          BRAND_RULES,
  'design_system': DESIGN_SYSTEM_RULES,
  mcp:            MCP_RULES,
  bot:            BOT_RULES,
  image:          IMAGE_RULES,
  voice:          VOICE_RULES,
};
