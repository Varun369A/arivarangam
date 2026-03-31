import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeSonnet, callClaudeHaiku } from '../connectors/claude';
import { taskService } from '../services/TaskService';
import { UsageMeter } from '../services/UsageMeter';

// ─── ContentEngine ────────────────────────────────────────────────────────────
//
// Generates professional, publication-ready written content:
//  - Long-form articles and blog posts
//  - Marketing copy (landing pages, email sequences, ads)
//  - Technical documentation
//  - Social media content packages
//  - Product descriptions and UX copy
//  - SEO-optimised content with meta strategy

interface FileEntry { path: string; content: string; }

type ContentType =
  | 'article'       // Long-form blog / editorial
  | 'marketing'     // Landing page copy, ads, email
  | 'technical'     // Docs, README, API guides
  | 'social'        // Multi-platform social package
  | 'product'       // Product descriptions, UX copy
  | 'general';      // Catch-all

export class ContentEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (event: TaskEvent) => { await onEvent(event); };
    const meter = new UsageMeter();

    await prisma.task.update({ where: { id: task.id }, data: { status: 'running' } });

    try {
      await emit({ type: 'log', data: { message: '📝 Classifying content type and planning structure...' }, timestamp: new Date().toISOString() });

      const plan = await this.planContent(task.prompt, meter);

      await emit({ type: 'log', data: { message: `📋 Type: ${plan.type} | ${plan.files.length} deliverables` }, timestamp: new Date().toISOString() });

      const generatedFiles: FileEntry[] = [];

      for (let i = 0; i < plan.files.length; i++) {
        const fileMeta = plan.files[i];
        await emit({ type: 'log', data: { message: `✍️ Writing ${fileMeta.path} (${i + 1}/${plan.files.length})...` }, timestamp: new Date().toISOString() });

        const content = await this.generateFile(task.prompt, fileMeta, plan, meter);
        generatedFiles.push({ path: fileMeta.path, content });

        await emit({
          type: 'file_created',
          data: { path: fileMeta.path, content, language: fileMeta.language, index: i + 1, total: plan.files.length },
          timestamp: new Date().toISOString(),
        });
      }

      const creditsUsed = meter.toCredits();
      const wordCount = generatedFiles.reduce((sum, f) => sum + f.content.split(/\s+/).length, 0);

      await taskService.completeTask(task.id, creditsUsed, {
        files: generatedFiles, contentType: plan.type, wordCount, usage: meter.summary(),
      });

      await emit({
        type: 'completed',
        data: { files: generatedFiles, creditsUsed, wordCount, message: `✅ ${plan.files.length} content files ready (${wordCount.toLocaleString()} words)` },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({ type: 'error', data: { message: err.message ?? 'ContentEngine failed' }, timestamp: new Date().toISOString() });
      throw err;
    }
  }

  // ─── Plan Content ─────────────────────────────────────────────────────────────

  private async planContent(prompt: string, meter: UsageMeter): Promise<{
    type: ContentType;
    audience: string;
    tone: string;
    files: { path: string; description: string; language: string }[];
  }> {
    const systemPrompt = `You are a content strategist. Analyze the content request and return ONLY valid JSON:
{
  "type": "article",
  "audience": "B2B SaaS founders",
  "tone": "authoritative, data-driven, conversational",
  "files": [
    {"path": "main.md", "description": "Primary long-form content", "language": "markdown"},
    {"path": "outline.md", "description": "Detailed content outline", "language": "markdown"},
    {"path": "seo.md", "description": "SEO strategy and meta tags", "language": "markdown"},
    {"path": "variations.md", "description": "3 angle/tone variations", "language": "markdown"},
    {"path": "social.md", "description": "Social media repurposing", "language": "markdown"}
  ]
}

Type options: article, marketing, technical, social, product, general
- article → main.md (1500-3000 words), outline.md, seo.md, variations.md, social.md
- marketing → copy.md (headlines+body), email.md, ads.md, landing-page.md, brief.md
- technical → docs.md, api-reference.md, quickstart.md, faq.md
- social → twitter.md, linkedin.md, instagram.md, threads.md, hashtags.md
- product → descriptions.md (10 variations), features.md, ux-copy.md, emails.md
- general → content.md, outline.md, variations.md, seo.md`;

    try {
      const response = await callClaudeHaiku(prompt, systemPrompt, 1024, meter);
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end !== -1) return JSON.parse(cleaned.slice(start, end + 1));
    } catch { /* fallback */ }

    return {
      type: 'general',
      audience: 'General audience',
      tone: 'Professional, clear, engaging',
      files: [
        { path: 'content.md', description: 'Main content', language: 'markdown' },
        { path: 'outline.md', description: 'Content outline', language: 'markdown' },
        { path: 'variations.md', description: 'Alternative angles', language: 'markdown' },
        { path: 'seo.md', description: 'SEO strategy', language: 'markdown' },
      ],
    };
  }

  // ─── Generate File ────────────────────────────────────────────────────────────

  private async generateFile(
    userPrompt: string,
    fileMeta: { path: string; description: string; language: string },
    plan: { type: ContentType; audience: string; tone: string },
    meter: UsageMeter
  ): Promise<string> {
    const fileTypeInstructions: Record<string, string> = {
      'main.md': `Write a comprehensive long-form article (minimum 1500 words). Include:
- Compelling headline with power words and SEO keyword
- Hook opening paragraph with surprising statistic or bold claim
- Clear H2/H3 structure with scannable subheadings
- Real data points, statistics, expert quotes (cite sources)
- Practical actionable advice in numbered lists or steps
- Case studies or real examples
- Internal linking suggestions [link: topic]
- Strong conclusion with clear CTA
- Meta description (150-160 chars) at the top`,

      'seo.md': `Provide a complete SEO strategy:
- Primary keyword + search intent analysis
- 10 LSI keywords to naturally include
- Title tag options (3 variations, under 60 chars each)
- Meta description (2 variations, 150-160 chars)
- H1, H2, H3 structure recommendation
- Internal linking opportunities
- Featured snippet optimization tips
- Schema markup recommendations
- Estimated word count for competitive ranking`,

      'outline.md': `Create a detailed content outline:
- Working title and angle
- Target reader persona
- Content goal (inform / persuade / convert)
- Section-by-section breakdown with word count targets
- Key points per section
- Data/stat opportunities per section
- CTA placement recommendations`,

      'variations.md': `Write 3 complete angle variations of the content:
1. Data-driven / Research-backed (lead with statistics)
2. Story-led / Narrative (lead with a compelling anecdote)
3. Contrarian / Thought leadership (challenge conventional wisdom)
Each variation: 300-500 words, full opening paragraphs`,

      'social.md': `Create a social media repurposing package:
- 5 Twitter/X threads (numbered tweets, hook tweet first)
- 3 LinkedIn posts (250-300 words each, storytelling format)
- 5 Instagram captions (with emoji, hashtag sets)
- 3 short-form quotes optimised for sharing
- 10 relevant hashtags per platform`,

      'copy.md': `Write conversion-focused marketing copy:
- 5 headline variations (curiosity, benefit, social proof, urgency, question)
- Hero subheadline (under 30 words, expands on headline)
- Feature-benefit bullets (6-8, format: [Feature] → [Benefit] → [Emotional outcome])
- Social proof block (testimonial templates)
- FAQ objection-handling (5 most common objections)
- CTA variations (5 different button texts + surrounding copy)`,
    };

    const basename = fileMeta.path.split('/').pop() ?? fileMeta.path;
    const fileInstructions = fileTypeInstructions[basename] ?? `Write comprehensive ${fileMeta.description}. Be specific, use real examples, and match the user's topic exactly.`;

    const systemPrompt = `You are a world-class content writer and copywriter working for top-tier brands.

Content type: ${plan.type}
Target audience: ${plan.audience}
Tone: ${plan.tone}

${fileInstructions}

QUALITY MANDATES:
- ZERO generic filler — every sentence must add value
- Use real industry-specific terminology and examples
- Include concrete data points and statistics where relevant
- Match the user's actual topic perfectly — no off-topic generic content
- Professional formatting with proper markdown headers, lists, blockquotes
- Output ONLY the content — no preamble, no "Here is the content:" intro`;

    return await callClaudeSonnet(
      `Topic/Request: ${userPrompt}\n\nGenerate: ${fileMeta.path} — ${fileMeta.description}`,
      systemPrompt, 6000, undefined, meter
    );
  }
}
