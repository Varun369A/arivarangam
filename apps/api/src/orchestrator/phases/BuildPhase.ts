// ─── Build Phase ──────────────────────────────────────────────────────────────
// Generates each file sequentially (respecting dependencies) using Claude Sonnet.

import { callClaudeSonnet } from '../../connectors/claude';
import { DESIGN_RULES } from '../../rules/design';
import { MOTION_RULES } from '../../rules/motion';
import { SECURITY_RULES } from '../../rules/security';
import type { PromptAnalysis, BuildPlan, CategoryRuleSet, BuiltFile, OnEvent } from '../types';
import type { UsageMeter } from '../../services/UsageMeter';

function buildRuleContext(ruleSets: string[], analysis: PromptAnalysis): string {
  const parts: string[] = [];
  if (ruleSets.includes('design')) parts.push(DESIGN_RULES);
  if (ruleSets.includes('motion') || analysis.hasAnimationRequest) parts.push(MOTION_RULES);
  if (ruleSets.includes('security') || analysis.hasSecurityRequirement) parts.push(SECURITY_RULES);
  return parts.join('\n\n');
}

export async function buildFiles(
  prompt: string,
  category: string,
  analysis: PromptAnalysis,
  plan: BuildPlan,
  categoryRules: CategoryRuleSet,
  onEvent: OnEvent,
  meter: UsageMeter
): Promise<BuiltFile[]> {
  const builtFiles: BuiltFile[] = [];
  const fileMap = new Map<string, string>(); // path → content for dependency injection
  const ruleContext = buildRuleContext(categoryRules.appliedRuleSets, analysis);

  const systemBase = `${categoryRules.systemPromptCore}

${ruleContext}

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
- Do not truncate or leave TODO comments`;

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

    try {
      await callClaudeSonnet(
        userMsg,
        systemBase,
        8192,
        (token: string) => { content += token; },
        meter
      );
    } catch (err: any) {
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
