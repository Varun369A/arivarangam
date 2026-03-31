// ─── Build Phase ──────────────────────────────────────────────────────────────
// Generates each file sequentially (respecting dependencies) using Claude Sonnet.

import { callClaudeSonnet } from '../../connectors/claude';
import { DESIGN_RULES } from '../../rules/design';
import { MOTION_RULES } from '../../rules/motion';
import { SECURITY_RULES } from '../../rules/security';
import type { PromptAnalysis, BuildPlan, CategoryRuleSet, BuiltFile, DesignSpec, OnEvent } from '../types';
import type { UsageMeter } from '../../services/UsageMeter';

function buildRuleContext(ruleSets: string[], analysis: PromptAnalysis): string {
  const parts: string[] = [];
  if (ruleSets.includes('design')) parts.push(DESIGN_RULES);
  if (ruleSets.includes('motion') || analysis.hasAnimationRequest) parts.push(MOTION_RULES);
  if (ruleSets.includes('security') || analysis.hasSecurityRequirement) parts.push(SECURITY_RULES);
  return parts.join('\n\n');
}

function formatDesignSpec(spec: DesignSpec): string {
  const cs = spec.colorSystem;
  const ty = spec.typography;

  const colorBlock = `CSS DESIGN TOKENS (use EXACTLY these values):
--color-bg:          ${cs.bg};
--color-surface:     ${cs.surface};
--color-surface-alt: ${cs.surfaceAlt};
--color-primary:     ${cs.primary};
--color-secondary:   ${cs.secondary};
--color-accent:      ${cs.accent};
--color-text:        ${cs.text};
--color-text-muted:  ${cs.textMuted};
--color-border:      ${cs.border};
Key gradients: ${cs.gradients.join(' | ')}`;

  const typoBlock = `TYPOGRAPHY:
Display font: ${ty.displayFont}
Body font: ${ty.bodyFont}
Google Fonts URL: ${ty.googleFontsUrl}
Hero size: ${ty.heroSize} | weight ${ty.heroWeight} | letter-spacing ${ty.letterSpacingHero}
H2 size: ${ty.h2Size}
H3 size: ${ty.h3Size}`;

  const sectionsBlock = spec.sections.map(s =>
    `SECTION "${s.name}":
  Layout: ${s.layout}
  Elements (in order): ${s.elements.join(' → ')}
  Colors: ${s.colors}
  Animation: ${s.animation}`
  ).join('\n\n');

  const componentsBlock = spec.components.map(c =>
    `COMPONENT "${c.name}": ${c.style}`
  ).join('\n');

  return `═══ DESIGN BLUEPRINT (FOLLOW EXACTLY) ═══

Overall mood: ${spec.overallMood}

${colorBlock}

${typoBlock}

PAGE STRUCTURE:
${sectionsBlock}

${componentsBlock}

Special effects: ${spec.specialEffects?.join(', ') || 'none'}

═══ END DESIGN BLUEPRINT ═══`;
}

export async function buildFiles(
  prompt: string,
  category: string,
  analysis: PromptAnalysis,
  plan: BuildPlan,
  categoryRules: CategoryRuleSet,
  onEvent: OnEvent,
  meter: UsageMeter,
  designSpec?: DesignSpec | null
): Promise<BuiltFile[]> {
  const builtFiles: BuiltFile[] = [];
  const fileMap = new Map<string, string>(); // path → content for dependency injection
  const ruleContext = buildRuleContext(categoryRules.appliedRuleSets, analysis);

  const specBlock = designSpec ? formatDesignSpec(designSpec) : '';

  const systemBase = `${categoryRules.systemPromptCore}

${ruleContext}

${specBlock}

${categoryRules.buildHints}

BUILD CONTEXT:
- Domain: ${analysis.domain}
- Color palette: ${plan.colorPalette}
- Font pairing: ${plan.fontPairing}
- Animation style: ${plan.animationStyle}
- Layout style: ${plan.layoutStyle}
- Tech stack: ${plan.techStack.join(', ')}
- Special requirements: ${analysis.specialRequirements.join(', ') || 'none'}

ORIGINAL REQUEST: ${prompt}

OUTPUT RULES:
- Output ONLY the raw file content — no markdown fences, no explanation
- The file must be complete and production-ready
- Do not truncate or leave TODO comments
- If a DESIGN BLUEPRINT is provided above, follow it exactly — do not deviate from the specified colors, fonts, sections, or animations`;

  for (const filePlan of plan.files) {
    await onEvent({
      type: 'log',
      data: { message: `⚙️ Building ${filePlan.path}...` },
      timestamp: new Date().toISOString(),
    });

    // Build dependency context
    const depContext = filePlan.dependsOn
      .filter(dep => fileMap.has(dep))
      .map(dep => `\n\n// ── ${dep} (already built) ──\n${fileMap.get(dep)?.slice(0, 2000)}`)
      .join('');

    const userMsg = `Generate the file: ${filePlan.path}

Purpose: ${filePlan.description}
${depContext ? `\nReference files already built:${depContext}` : ''}

Output ONLY the complete file content for ${filePlan.path}.`;

    let content = '';
    let streamTimer: ReturnType<typeof setTimeout> | null = null;

    const flushCodeStream = () => {
      const lines = content.split('\n');
      const snippet = lines.slice(Math.max(0, lines.length - 10)).join('\n');
      // fire-and-forget stream event (Redis only, no DB write)
      onEvent({
        type: 'log',
        data: { streamOnly: true, isCodeStream: true, path: filePlan.path, snippet },
        timestamp: new Date().toISOString(),
      }).catch(() => {});
    };

    try {
      await callClaudeSonnet(
        userMsg,
        systemBase,
        8192,
        (token: string) => {
          content += token;
          // debounce: emit live code snippet every 300ms
          if (streamTimer) clearTimeout(streamTimer);
          streamTimer = setTimeout(flushCodeStream, 300);
        },
        meter
      );
      if (streamTimer) clearTimeout(streamTimer);
    } catch (err: any) {
      if (streamTimer) clearTimeout(streamTimer);
      await onEvent({
        type: 'log',
        data: { message: `⚠️ Error building ${filePlan.path}: ${err.message}` },
        timestamp: new Date().toISOString(),
      });
      content = `// Error generating ${filePlan.path}: ${err.message}`;
    }

    // Strip accidental markdown fences
    content = content
      .replace(/^```[\w]*\n?/m, '')
      .replace(/\n?```\s*$/m, '')
      .trim();

    const builtFile: BuiltFile = {
      path: filePlan.path,
      content,
      language: filePlan.path.split('.').pop(),
    };

    builtFiles.push(builtFile);
    fileMap.set(filePlan.path, content);

    await onEvent({
      type: 'file_created',
      data: { path: filePlan.path, content, language: builtFile.language },
      timestamp: new Date().toISOString(),
    });
  }

  await onEvent({
    type: 'log',
    data: { message: `✅ Built ${builtFiles.length} files` },
    timestamp: new Date().toISOString(),
  });

  return builtFiles;
}
