import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeSonnet } from '../connectors/claude';
import { taskService } from '../services/TaskService';
import { UsageMeter } from '../services/UsageMeter';

// ─── Installed Library Stack (React Native / Expo) ────────────────────────────
//
// CORE:         expo ~51, react-native, react@18, typescript
// NAVIGATION:   @react-navigation/native, @react-navigation/native-stack,
//               @react-navigation/bottom-tabs, react-native-screens,
//               react-native-safe-area-context
// ANIMATIONS:   react-native-reanimated@3, react-native-gesture-handler
//               moti (framer-motion for React Native, uses Reanimated)
//               react-native-animatable
// VISUALS:      expo-linear-gradient, expo-blur, react-native-svg,
//               lottie-react-native, react-native-fast-image
// UI:           react-native-paper OR @rneui/themed, react-native-vector-icons,
//               expo-font, @expo-google-fonts/inter
// STORAGE:      @react-native-async-storage/async-storage, expo-secure-store
// UTILS:        expo-status-bar, expo-splash-screen, expo-image-picker,
//               react-native-mmkv, date-fns, axios
// STATE:        zustand, react-query (@tanstack/react-query)

interface FileEntry { path: string; content: string; }
interface FilePlan {
  files: { path: string; description: string; language: string }[];
  techStack: string[];
  notes: string;
}

const EXPO_PACKAGE_JSON = (projectName: string, extras: string[] = []) => {
  const name = projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'mobile-app';
  return JSON.stringify({
    name,
    version: '1.0.0',
    main: 'node_modules/expo/AppEntry.js',
    scripts: { start: 'expo start', android: 'expo start --android', ios: 'expo start --ios', web: 'expo start --web' },
    dependencies: {
      expo: '~51.0.0',
      'expo-status-bar': '~1.12.1',
      'expo-linear-gradient': '~13.0.2',
      'expo-blur': '~13.0.2',
      'expo-font': '~12.0.9',
      'expo-splash-screen': '~0.27.5',
      'expo-image-picker': '~15.0.7',
      'expo-secure-store': '~13.0.2',
      react: '18.2.0',
      'react-native': '0.74.5',
      'react-native-reanimated': '~3.10.1',
      'react-native-gesture-handler': '~2.16.1',
      'react-native-screens': '~3.31.1',
      'react-native-safe-area-context': '4.10.5',
      'react-native-svg': '15.2.0',
      '@react-navigation/native': '^6.1.17',
      '@react-navigation/native-stack': '^6.9.26',
      '@react-navigation/bottom-tabs': '^6.5.20',
      'lottie-react-native': '7.1.0',
      moti: '^0.29.0',
      'react-native-animatable': '^1.4.0',
      '@react-native-async-storage/async-storage': '1.23.1',
      zustand: '^4.5.2',
      '@tanstack/react-query': '^5.45.0',
      axios: '^1.7.2',
      'date-fns': '^3.6.0',
    },
    devDependencies: {
      '@babel/core': '^7.24.0',
      '@types/react': '~18.2.45',
      '@types/react-native': '~0.73.0',
      typescript: '^5.3.0',
    },
  }, null, 2);
};

// ─── MobileEngine ─────────────────────────────────────────────────────────────

export class MobileEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (e: TaskEvent) => onEvent(e);
    const meter = new UsageMeter();

    await prisma.task.update({ where: { id: task.id }, data: { status: 'running' } });

    try {
      await emit({ type: 'log', data: { message: '📱 Initializing mobile build with Expo + Reanimated + Lottie stack...' }, timestamp: new Date().toISOString() });

      const plan = await this.planStructure(task.prompt, meter);

      await emit({ type: 'log', data: { message: `📁 ${plan.files.length} files planned | ${plan.techStack.join(', ')}` }, timestamp: new Date().toISOString() });

      const generatedFiles: FileEntry[] = [];

      for (let i = 0; i < plan.files.length; i++) {
        const fileMeta = plan.files[i];
        await emit({ type: 'log', data: { message: `⚡ Generating ${fileMeta.path} (${i + 1}/${plan.files.length})...` }, timestamp: new Date().toISOString() });

        const content = await this.generateFile(task.prompt, fileMeta, generatedFiles, plan, meter);
        generatedFiles.push({ path: fileMeta.path, content });

        await emit({
          type: 'file_created',
          data: { path: fileMeta.path, content, language: fileMeta.language, index: i + 1, total: plan.files.length },
          timestamp: new Date().toISOString(),
        });
      }

      await emit({ type: 'log', data: { message: '🔍 Running type-check and consistency pass...' }, timestamp: new Date().toISOString() });
      const fixedFiles = await this.reviewPass(task.prompt, generatedFiles, meter);

      for (const fixed of fixedFiles) {
        const original = generatedFiles.find(f => f.path === fixed.path);
        if (original && original.content !== fixed.content) {
          await emit({
            type: 'file_updated',
            data: { path: fixed.path, content: fixed.content, reason: 'TypeScript and consistency fix' },
            timestamp: new Date().toISOString(),
          });
        }
      }

      const creditsUsed = meter.toCredits();
      await taskService.completeTask(task.id, creditsUsed, {
        files: fixedFiles, techStack: plan.techStack, fileCount: fixedFiles.length, usage: meter.summary(),
      });

      await emit({
        type: 'completed',
        data: { files: fixedFiles, creditsUsed, fileCount: fixedFiles.length, message: `✅ React Native Expo app built with ${plan.techStack.length} libraries. Run: npx expo start` },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({ type: 'error', data: { message: err.message ?? 'MobileEngine build failed' }, timestamp: new Date().toISOString() });
      throw err;
    }
  }

  private async planStructure(prompt: string, meter: UsageMeter): Promise<FilePlan> {
    const systemPrompt = `You are a React Native architect planning an Expo mobile app.

INSTALLED LIBRARY STACK:
- expo ~51, react-native 0.74, React 18, TypeScript
- react-native-reanimated@3 — spring animations, shared element transitions, gesture-driven animations
- moti — declarative animations built on Reanimated (like Framer Motion for RN)
- react-native-animatable — simple declarative animations (bounce, fadeIn, slideIn)
- react-native-gesture-handler — swipe, pan, pinch gestures
- expo-linear-gradient — gradient backgrounds and buttons
- expo-blur — blur views for modals and overlays
- lottie-react-native — After Effects JSON animations for loading, empty states, success
- react-native-svg — custom SVG icons and illustrations
- @react-navigation/native + native-stack + bottom-tabs — navigation
- zustand — state management
- @tanstack/react-query — data fetching
- @react-native-async-storage/async-storage — local storage
- axios — HTTP client

DECIDE WHICH TO USE based on prompt:
- E-commerce/marketplace → product screens, cart, checkout, lottie success animation
- Social/feed → animated list items (moti), gesture swipe, tab navigation
- Finance/banking → animated numbers (reanimated), chart screens, secure storage
- Health/fitness → progress animations, streak animations (lottie), gesture interactions
- Education → quiz animations, progress bars, tab navigation

FILE STRUCTURE (always include):
- App.tsx — root with NavigationContainer + gesture handler + query provider
- package.json — full Expo dependencies
- app.json — Expo config with correct name, icon, splash
- babel.config.js — with reanimated plugin
- tsconfig.json — TypeScript config
- src/screens/ — all screen components (minimum 3 screens)
- src/components/ — reusable UI components (Button, Card, Header, etc.)
- src/navigation/ — navigation stacks
- src/theme.ts — colors, typography, spacing, shadows design system
- src/hooks/ — custom hooks (useAnimatedValue, useAuth, etc.)
- src/store/ — zustand stores
- README.md — expo start instructions, preview with Expo Go

Return ONLY valid JSON: {"files":[{"path":"...","description":"...","language":"..."}],"techStack":[...],"notes":"..."}`;

    const response = await callClaudeSonnet(
      `Plan React Native Expo app for: ${prompt}`,
      systemPrompt, 2048, undefined, meter
    );
    return this.parseJSON<FilePlan>(response, {
      files: [
        { path: 'App.tsx', description: 'Root app component', language: 'typescript' },
        { path: 'package.json', description: 'Expo dependencies', language: 'json' },
        { path: 'app.json', description: 'Expo config', language: 'json' },
        { path: 'babel.config.js', description: 'Babel config with Reanimated', language: 'javascript' },
        { path: 'tsconfig.json', description: 'TypeScript config', language: 'json' },
        { path: 'src/theme.ts', description: 'Design tokens', language: 'typescript' },
        { path: 'README.md', description: 'Setup instructions', language: 'markdown' },
      ],
      techStack: ['Expo', 'React Native', 'Reanimated', 'Moti', 'Lottie', 'React Navigation'],
      notes: '',
    });
  }

  private async generateFile(
    userPrompt: string,
    fileMeta: { path: string; description: string; language: string },
    existingFiles: FileEntry[],
    plan: FilePlan,
    meter: UsageMeter
  ): Promise<string> {
    if (fileMeta.path === 'package.json') {
      return EXPO_PACKAGE_JSON(userPrompt.split(' ').slice(0, 3).join('-'));
    }
    if (fileMeta.path === 'babel.config.js') {
      return `module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-reanimated/plugin'],
  };
};`;
    }
    if (fileMeta.path === 'tsconfig.json') {
      return JSON.stringify({ extends: 'expo/tsconfig.base', compilerOptions: { strict: true, paths: { '@/*': ['./src/*'] } } }, null, 2);
    }

    const ctx = existingFiles.length > 0
      ? `\n\nExisting files:\n${existingFiles.map(f => `--- ${f.path} ---\n${f.content.slice(0, 500)}...`).join('\n\n')}`
      : '';

    const systemPrompt = `You are a senior React Native developer building a premium mobile app for Arivarangam — India's AI platform.

LIBRARY STACK: ${plan.techStack.join(', ')}
NOTES: ${plan.notes}

ANIMATION QUALITY MANDATE:
- Use moti for all entry animations: <MotiView from={{opacity:0,translateY:20}} animate={{opacity:1,translateY:0}} transition={{type:'spring',damping:18}}>
- Use reanimated useSharedValue + useAnimatedStyle for gesture-driven animations
- Use react-native-animatable for simple declarative: <Animatable.View animation="fadeInUp" delay={200}>
- Use expo-linear-gradient for ALL gradient backgrounds and buttons — never flat colors
- Use expo-blur for modal backgrounds
- All list items must animate in with stagger (index * 100ms delay)
- Success/empty states must use Lottie animations
- Every touchable must have scale feedback: pressIn → scale 0.96, pressOut → scale 1.0

DESIGN QUALITY MANDATE:
- Dark theme: #0a0a1a background, #1a1a2e surface cards
- OR Light theme: #f8faff background, #ffffff cards — pick based on the app type
- Always use expo-linear-gradient for gradient buttons and header backgrounds
- Card styles: borderRadius:16, overflow:'hidden', shadow with elevation:8
- Typography: use a consistent font size scale (12,14,16,18,22,28,36)
- Color system from src/theme.ts — always import colors from there

COMPLETENESS:
- ZERO placeholders — every screen has real content matching the app domain
- All navigation routes must have screen components that are generated
- All touchable elements must do something (navigate, show modal, trigger animation)
- Include proper TypeScript types for all props and state
- babel.config.js MUST include 'react-native-reanimated/plugin'

Output: raw file content only, no markdown fences, no explanations`;

    const content = await callClaudeSonnet(
      `USER PROMPT: ${userPrompt}\nSTACK: ${plan.techStack.join(', ')}\n${ctx}\n\nGenerate: ${fileMeta.path}\nRole: ${fileMeta.description}`,
      systemPrompt, 8192, undefined, meter
    );
    return this.stripFences(content);
  }

  private async reviewPass(userPrompt: string, files: FileEntry[], meter: UsageMeter): Promise<FileEntry[]> {
    if (files.length === 0) return files;
    const summary = files.map(f => `=== ${f.path} ===\n${f.content}`).join('\n\n');

    try {
      const response = await callClaudeSonnet(
        `Prompt: ${userPrompt.slice(0, 200)}\n\nReview:\n${summary.slice(0, 12000)}`,
        `You are a React Native code reviewer. Return ONLY valid JSON array: [{"path":"...","content":"...","fixed":true/false}]
Check: babel.config.js has reanimated plugin, package.json has all imported packages, navigation routes match screen files, no broken imports, TypeScript types correct, reanimated import from 'react-native-reanimated' not old path, moti imported from 'moti', expo-linear-gradient imported correctly. Return ALL files.`,
        8192, undefined, meter
      );
      const parsed = this.parseJSON<FileEntry[]>(response, []);
      if (!Array.isArray(parsed) || parsed.length === 0) return files;
      return parsed.every(f => f.path && f.content) ? parsed.map(f => ({ path: f.path, content: f.content })) : files;
    } catch { return files; }
  }

  private stripFences(text: string): string {
    return text.replace(/^```[\w]*\n?/gm, '').replace(/^```$/gm, '').trim();
  }

  private parseJSON<T>(text: string, fallback: T): T {
    const isArray = Array.isArray(fallback);
    const open = isArray ? '[' : '{';
    const close = isArray ? ']' : '}';
    const cleaned = text.replace(/^```[\w]*\n?/gm, '').replace(/^```$/gm, '');
    const start = cleaned.indexOf(open);
    if (start === -1) return fallback;
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\' && inStr) { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === open) depth++;
      else if (ch === close && --depth === 0) {
        try { return JSON.parse(cleaned.slice(start, i + 1)); } catch { return fallback; }
      }
    }
    return fallback;
  }
}
