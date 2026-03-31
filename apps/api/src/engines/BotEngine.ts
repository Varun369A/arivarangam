import { prisma } from '@arivarangam/db';
import type { TaskEvent } from '@arivarangam/types';
import { callClaudeSonnet, callClaudeHaiku } from '../connectors/claude';
import { taskService } from '../services/TaskService';
import { UsageMeter } from '../services/UsageMeter';

// ─── BotEngine ────────────────────────────────────────────────────────────────
//
// Generates complete Discord (discord.js v14) or Telegram (grammy) bot code.
//
// Platform is auto-detected from the prompt via Claude Haiku.
//
// Discord output:
//   src/index.ts                  — Client setup, event handlers, command deploy
//   src/commands/index.ts         — All slash commands with full implementations
//   src/events/ready.ts           — Bot ready handler, activity status
//   src/events/interactionCreate.ts — Command dispatcher with error handling
//   src/utils/embed.ts            — EmbedBuilder helpers for consistent styling
//   package.json                  — discord.js v14, @discordjs/rest, dotenv
//   .env.example                  — DISCORD_TOKEN, CLIENT_ID, GUILD_ID
//   Dockerfile                    — node:20-alpine, pnpm install
//   README.md                     — Setup, invite link, command table
//
// Telegram output:
//   src/index.ts                  — Grammy bot, middleware, command handlers
//   src/commands/index.ts         — All command handlers via Grammy composer
//   src/middleware/logger.ts      — Request logging middleware
//   src/utils/keyboard.ts         — InlineKeyboard and ReplyKeyboard helpers
//   package.json                  — grammy, dotenv
//   .env.example                  — BOT_TOKEN, WEBHOOK_URL (optional)
//   Dockerfile                    — node:20-alpine
//   README.md                     — BotFather setup, polling vs webhook, deploy

interface FileEntry {
  path: string;
  content: string;
}

type BotPlatform = 'discord' | 'telegram';

type BotFeature =
  | 'slash-commands'
  | 'welcome-message'
  | 'moderation'
  | 'music'
  | 'games'
  | 'ai-responses';

interface BotPlan {
  platform: BotPlatform;
  botName: string;
  commands: {
    name: string;
    description: string;
    options: {
      name: string;
      description: string;
      type: string;
      required?: boolean;
    }[];
  }[];
  features: BotFeature[];
  hasAI: boolean;
}

// ─── BotEngine ────────────────────────────────────────────────────────────────

export class BotEngine {
  async execute(task: any, onEvent: (e: TaskEvent) => void): Promise<void> {
    const emit = async (event: TaskEvent) => { await onEvent(event); };
    const meter = new UsageMeter();

    await prisma.task.update({
      where: { id: task.id },
      data: { status: 'running' },
    });

    try {
      // Step 1: Detect platform and plan
      await emit({
        type: 'log',
        data: { message: 'Detecting platform (Discord / Telegram) and planning bot structure...' },
        timestamp: new Date().toISOString(),
      });

      const plan = await this.planBot(task.prompt, meter);

      await emit({
        type: 'log',
        data: {
          message: `Platform: ${plan.platform.toUpperCase()} | Bot: "${plan.botName}" | ${plan.commands.length} commands | Features: ${plan.features.join(', ')}`,
        },
        timestamp: new Date().toISOString(),
      });

      // Step 2: Build file list based on platform
      const fileMetas = plan.platform === 'discord'
        ? this.discordFileList(plan)
        : this.telegramFileList(plan);

      await emit({
        type: 'log',
        data: { message: `Generating ${fileMetas.length} files for ${plan.platform} bot...` },
        timestamp: new Date().toISOString(),
      });

      const generatedFiles: FileEntry[] = [];

      for (let i = 0; i < fileMetas.length; i++) {
        const fileMeta = fileMetas[i];

        await emit({
          type: 'log',
          data: { message: `Building ${fileMeta.path} (${i + 1}/${fileMetas.length})...` },
          timestamp: new Date().toISOString(),
        });

        const content = await this.generateFile(task.prompt, fileMeta, generatedFiles, plan, meter);
        generatedFiles.push({ path: fileMeta.path, content });

        await emit({
          type: 'file_created',
          data: {
            path: fileMeta.path,
            content,
            language: fileMeta.language,
            index: i + 1,
            total: fileMetas.length,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Step 3: Review and consistency check
      await emit({
        type: 'log',
        data: { message: 'Running consistency review and import validation...' },
        timestamp: new Date().toISOString(),
      });

      const fixedFiles = await this.reviewPass(task.prompt, generatedFiles, plan, meter);

      for (const fixed of fixedFiles) {
        const original = generatedFiles.find(f => f.path === fixed.path);
        if (original && original.content !== fixed.content) {
          await emit({
            type: 'file_updated',
            data: { path: fixed.path, content: fixed.content, reason: 'Consistency fix applied' },
            timestamp: new Date().toISOString(),
          });
        }
      }

      const creditsUsed = meter.toCredits();
      const metadata = {
        files: fixedFiles,
        platform: plan.platform,
        botName: plan.botName,
        commands: plan.commands.map(c => c.name),
        features: plan.features,
        hasAI: plan.hasAI,
        fileCount: fixedFiles.length,
        usage: meter.summary(),
      };

      await taskService.completeTask(task.id, creditsUsed, metadata);

      await emit({
        type: 'completed',
        data: {
          files: fixedFiles,
          creditsUsed,
          fileCount: fixedFiles.length,
          message: `${plan.platform === 'discord' ? 'Discord' : 'Telegram'} bot "${plan.botName}" generated — ${fixedFiles.length} files, ${plan.commands.length} commands`,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      await emit({
        type: 'error',
        data: { message: err.message ?? 'Bot generation failed' },
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  }

  // ─── Plan Bot ─────────────────────────────────────────────────────────────────

  private async planBot(prompt: string, meter: UsageMeter): Promise<BotPlan> {
    const systemPrompt = `You are a bot architect. Analyze the user's request and return ONLY a valid JSON object:
{
  "platform": "discord",
  "botName": "MyBot",
  "commands": [
    {
      "name": "command_name",
      "description": "What this command does",
      "options": [
        { "name": "param", "description": "Parameter description", "type": "STRING", "required": true }
      ]
    }
  ],
  "features": ["slash-commands", "welcome-message"],
  "hasAI": false
}

Platform detection rules:
- "discord" if the prompt mentions Discord, server, guild, slash commands, channels, roles, embed, bot token DISCORD_TOKEN
- "telegram" if the prompt mentions Telegram, @BotFather, inline keyboard, webhook, grammy, python-telegram-bot, BOT_TOKEN
- Default to "discord" if ambiguous

botName: PascalCase, 1-2 words, no "Bot" suffix unless specifically requested

commands: 2-8 commands that make sense for the request
- name: lowercase, underscores only (Discord slash command format)
- options type: one of STRING, INTEGER, BOOLEAN, USER, CHANNEL, ROLE, MENTIONABLE, NUMBER, ATTACHMENT

features: pick from [slash-commands, welcome-message, moderation, music, games, ai-responses]
- Always include "slash-commands"
- Add others if the prompt implies them

hasAI: true only if the bot should call an external AI/LLM API

Return ONLY the JSON — no prose before or after.`;

    try {
      const response = await callClaudeHaiku(prompt, systemPrompt, 512, meter);
      const plan = this.parseJSON<BotPlan>(response, this.defaultPlan(prompt));
      if (!plan.platform || !plan.botName || !Array.isArray(plan.commands)) {
        return this.defaultPlan(prompt);
      }
      // Ensure slash-commands is always in features
      if (!plan.features.includes('slash-commands')) {
        plan.features.unshift('slash-commands');
      }
      return plan;
    } catch {
      return this.defaultPlan(prompt);
    }
  }

  // ─── Default Plan Fallback ────────────────────────────────────────────────────

  private defaultPlan(prompt: string): BotPlan {
    const isDiscord = !prompt.toLowerCase().includes('telegram');
    return {
      platform: isDiscord ? 'discord' : 'telegram',
      botName: 'HelperBot',
      commands: [
        {
          name: 'help',
          description: 'Show available commands',
          options: [],
        },
        {
          name: 'info',
          description: 'Get information',
          options: [
            { name: 'query', description: 'What to look up', type: 'STRING', required: true },
          ],
        },
        {
          name: 'ping',
          description: 'Check bot latency',
          options: [],
        },
      ],
      features: ['slash-commands'],
      hasAI: false,
    };
  }

  // ─── Discord File List ────────────────────────────────────────────────────────

  private discordFileList(plan: BotPlan): { path: string; description: string; language: string }[] {
    return [
      {
        path: 'src/index.ts',
        description: `Main Discord bot entry: Client setup with GatewayIntentBits (Guilds, GuildMessages, MessageContent${plan.features.includes('welcome-message') ? ', GuildMembers' : ''}), event handler registration (ready, interactionCreate${plan.features.includes('welcome-message') ? ', guildMemberAdd' : ''}), command registration on startup, graceful shutdown`,
        language: 'typescript',
      },
      {
        path: 'src/commands/index.ts',
        description: `All ${plan.commands.length} slash commands (${plan.commands.map(c => c.name).join(', ')}) using SlashCommandBuilder with full implementations — real logic, not stubs. Export commands collection and deploy function.`,
        language: 'typescript',
      },
      {
        path: 'src/events/ready.ts',
        description: 'Bot ready event handler: log startup info, set activity/presence status, confirm command count',
        language: 'typescript',
      },
      {
        path: 'src/events/interactionCreate.ts',
        description: 'Interaction event handler: route slash commands to handlers, handle autocomplete, button, select menu interactions, reply with error embed on failure',
        language: 'typescript',
      },
      {
        path: 'src/utils/embed.ts',
        description: `EmbedBuilder helper functions: createSuccessEmbed, createErrorEmbed, createInfoEmbed with consistent branding (brand color #5865F2, footer with bot name "${plan.botName}", timestamp)`,
        language: 'typescript',
      },
      {
        path: 'package.json',
        description: `Discord bot package.json: discord.js ^14.14.1, @discordjs/rest ^2.3.0, dotenv ^16.0.0${plan.hasAI ? ', @anthropic-ai/sdk ^0.24.0' : ''}, TypeScript dev deps, build/start/dev/deploy scripts`,
        language: 'json',
      },
      {
        path: '.env.example',
        description: 'Discord bot environment variables: DISCORD_TOKEN, CLIENT_ID, GUILD_ID (for dev guild commands)' + (plan.hasAI ? ', ANTHROPIC_API_KEY' : ''),
        language: 'text',
      },
      {
        path: 'Dockerfile',
        description: 'Discord bot Docker build: node:20-alpine, npm ci --production, COPY dist, CMD node dist/index.js',
        language: 'dockerfile',
      },
      {
        path: 'README.md',
        description: `Discord bot README: Prerequisites, setup steps (BotFather equivalent = Discord Dev Portal), invite link generator URL, .env setup, npm run deploy, command table for ${plan.commands.map(c => '/' + c.name).join(' ')}`,
        language: 'markdown',
      },
    ];
  }

  // ─── Telegram File List ───────────────────────────────────────────────────────

  private telegramFileList(plan: BotPlan): { path: string; description: string; language: string }[] {
    return [
      {
        path: 'src/index.ts',
        description: `Main Telegram bot entry using Grammy: Bot instantiation with BOT_TOKEN, apply middleware chain (logger, session if needed), register all command composers, ${plan.features.includes('welcome-message') ? 'new member welcome handler, ' : ''}start with polling or webhook based on WEBHOOK_URL env var, graceful shutdown on SIGINT/SIGTERM`,
        language: 'typescript',
      },
      {
        path: 'src/commands/index.ts',
        description: `Grammy Composer with all ${plan.commands.length} command handlers (${plan.commands.map(c => '/' + c.name).join(', ')}): full implementations with real logic, inline keyboard responses where appropriate, proper ctx.reply usage`,
        language: 'typescript',
      },
      {
        path: 'src/middleware/logger.ts',
        description: 'Grammy middleware that logs each incoming update: user ID, username, update type, command/message text, timestamp — exported as a Grammy Middleware function',
        language: 'typescript',
      },
      {
        path: 'src/utils/keyboard.ts',
        description: 'InlineKeyboard and ReplyKeyboard builder helpers: createMainMenu, createConfirmKeyboard, createPaginationKeyboard — typed with Grammy keyboard utilities',
        language: 'typescript',
      },
      {
        path: 'package.json',
        description: `Telegram bot package.json: grammy ^1.25.0, dotenv ^16.0.0${plan.hasAI ? ', @anthropic-ai/sdk ^0.24.0' : ''}, TypeScript dev deps, build/start/dev scripts`,
        language: 'json',
      },
      {
        path: '.env.example',
        description: 'Telegram bot environment variables: BOT_TOKEN (from @BotFather), WEBHOOK_URL (optional, for production webhook mode)' + (plan.hasAI ? ', ANTHROPIC_API_KEY' : ''),
        language: 'text',
      },
      {
        path: 'Dockerfile',
        description: 'Telegram bot Docker build: node:20-alpine, npm ci --production, COPY dist, CMD node dist/index.js',
        language: 'dockerfile',
      },
      {
        path: 'README.md',
        description: `Telegram bot README: BotFather setup steps, .env configuration, npm run build, polling vs webhook deployment options, command table for ${plan.commands.map(c => '/' + c.name).join(' ')}, Docker deployment`,
        language: 'markdown',
      },
    ];
  }

  // ─── Generate Single File ─────────────────────────────────────────────────────

  private async generateFile(
    userPrompt: string,
    fileMeta: { path: string; description: string; language: string },
    existingFiles: FileEntry[],
    plan: BotPlan,
    meter: UsageMeter
  ): Promise<string> {
    const contextSummary = existingFiles.length > 0
      ? `\n\nAlready generated files:\n${existingFiles.map(f =>
          `--- ${f.path} ---\n${f.content.slice(0, 700)}${f.content.length > 700 ? '\n...(truncated)' : ''}`
        ).join('\n\n')}`
      : '';

    const systemPrompt = plan.platform === 'discord'
      ? this.discordSystemPrompt(plan)
      : this.telegramSystemPrompt(plan);

    const filePrompt = `User request: ${userPrompt}
${contextSummary}

Generate the complete content for: ${fileMeta.path}
Role: ${fileMeta.description}`;

    const content = await callClaudeSonnet(filePrompt, systemPrompt, 8192, undefined, meter);
    return this.stripFences(content);
  }

  // ─── Discord System Prompt ────────────────────────────────────────────────────

  private discordSystemPrompt(plan: BotPlan): string {
    return `You are an expert Discord bot developer specializing in discord.js v14. Generate production-ready TypeScript Discord bots.

BOT SPECIFICATION:
- Bot name: ${plan.botName}
- Commands: ${plan.commands.map(c => `/${c.name} (${c.description}${c.options.length ? ' — options: ' + c.options.map(o => o.name + ':' + o.type).join(', ') : ''})`).join(', ')}
- Features: ${plan.features.join(', ')}
- Has AI integration: ${plan.hasAI}

DISCORD.JS v14 PATTERNS:
- Client: new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent${plan.features.includes('welcome-message') ? ', GatewayIntentBits.GuildMembers' : ''}] })
- Slash commands: new SlashCommandBuilder().setName().setDescription().addStringOption() etc.
- REST deploy: new REST({ version: '10' }).setToken(token) → rest.put(Routes.applicationCommands(clientId), { body: commands })
- Interaction handling: interaction.isChatInputCommand(), interaction.commandName, interaction.options.getString()
- Replies: interaction.reply({ embeds: [embed] }), interaction.deferReply(), interaction.editReply()
- Ephemeral (private): { ephemeral: true } in reply options
- Embeds: new EmbedBuilder().setTitle().setDescription().setColor().setFooter().setTimestamp()
- Colors: Colors.Blue, Colors.Green, Colors.Red, or hex strings like 0x5865F2

TYPESCRIPT RULES:
- Import types: import type { Client, Interaction, GuildMember } from 'discord.js'
- All event handlers typed: client.on('interactionCreate', async (interaction: Interaction) => { ... })
- Command collection: new Collection<string, { data: SlashCommandBuilder; execute: Function }>()
- No any types — use proper discord.js v14 types throughout
- All command execute functions: async (interaction: ChatInputCommandInteraction) => void

QUALITY STANDARDS:
- ZERO stub implementations — all commands must have real, working logic
- Error handling: wrap command execution in try/catch, reply with error embed
- Cooldowns if relevant (use Map to track user → timestamp)
- Defer reply for long operations, then editReply
- Follow-up messages with interaction.followUp() where needed
- For moderation commands: check permissions before acting (interaction.memberPermissions)

Output raw TypeScript/JSON/text content only — no markdown fences, no explanations.`;
  }

  // ─── Telegram System Prompt ───────────────────────────────────────────────────

  private telegramSystemPrompt(plan: BotPlan): string {
    return `You are an expert Telegram bot developer specializing in the Grammy framework. Generate production-ready TypeScript Telegram bots.

BOT SPECIFICATION:
- Bot name: ${plan.botName}
- Commands: ${plan.commands.map(c => `/${c.name} — ${c.description}${c.options.length ? ' (params: ' + c.options.map(o => o.name).join(', ') + ')' : ''}`).join(', ')}
- Features: ${plan.features.join(', ')}
- Has AI integration: ${plan.hasAI}

GRAMMY FRAMEWORK PATTERNS:
- Bot creation: const bot = new Bot<Context>(process.env.BOT_TOKEN!)
- Command handling: bot.command("start", async (ctx) => { await ctx.reply("Hello!") })
- Composer: const commands = new Composer<Context>(); commands.command("name", handler)
- Middleware: bot.use(async (ctx, next) => { /* before */ await next(); /* after */ })
- InlineKeyboard: new InlineKeyboard().text("Label", "callback_data").row().text("Other", "other_data")
- ReplyKeyboard: new Keyboard().text("Option 1").text("Option 2").resized()
- Callback queries: bot.callbackQuery("data", async (ctx) => { await ctx.answerCallbackQuery(); await ctx.editMessageText("Updated!") })
- Session: use Grammy session plugin if state is needed
- Webhook mode: bot.start({ webhook: { domain: process.env.WEBHOOK_URL } }) — fallback to polling if WEBHOOK_URL not set
- Graceful stop: process.once("SIGINT", () => bot.stop()); process.once("SIGTERM", () => bot.stop())
- Context typing: type MyContext = Context & SessionFlavor<SessionData> (if using sessions)

TYPESCRIPT RULES:
- Import: import { Bot, Context, Composer, InlineKeyboard, Keyboard } from "grammy"
- All handlers: async (ctx: Context) => Promise<void>
- Proper error handling: bot.catch((err) => { console.error(err) })
- No any types

QUALITY STANDARDS:
- ZERO stub implementations — all command handlers must do something real and useful
- Parse command arguments from ctx.message?.text if options are needed
- Use ctx.reply() with parse_mode: "HTML" or "Markdown" for rich formatting
- Handle edge cases: missing arguments, API errors, empty results
- Format responses clearly — use emojis sparingly but effectively
- Inline keyboards for interactive responses where it makes sense
- Log errors to console but send user-friendly messages to chat

Output raw TypeScript/JSON/text content only — no markdown fences, no explanations.`;
  }

  // ─── Review Pass ──────────────────────────────────────────────────────────────

  private async reviewPass(
    userPrompt: string,
    files: FileEntry[],
    plan: BotPlan,
    meter: UsageMeter
  ): Promise<FileEntry[]> {
    if (files.length === 0) return files;

    const summary = files
      .map(f => `=== ${f.path} ===\n${f.content}`)
      .join('\n\n');

    const platformChecks = plan.platform === 'discord'
      ? `DISCORD-SPECIFIC CHECKS:
- Client intents match all events used (GuildMembers needed for guildMemberAdd, etc.)
- REST deploy command in src/index.ts or separate deploy script
- Command names in Collection match SlashCommandBuilder names exactly
- interactionCreate handler dispatches to all commands in the collection
- EmbedBuilder used consistently — no raw object embeds
- No deprecated discord.js v13 patterns (MessageEmbed → EmbedBuilder, etc.)
- package.json has discord.js ^14.14.1 and @discordjs/rest ^2.3.0`
      : `TELEGRAM-SPECIFIC CHECKS:
- Bot token loaded from process.env.BOT_TOKEN — not hardcoded
- All Composer handlers are applied to the bot in src/index.ts via bot.use(commands)
- Webhook/polling conditional logic uses WEBHOOK_URL env var
- Graceful stop handlers present for SIGINT and SIGTERM
- ctx.reply() calls are awaited
- package.json has grammy ^1.25.0
- No mixing of polling and webhook — conditional based on env var`;

    const systemPrompt = `You are a ${plan.platform} bot code reviewer. Review all files for correctness, consistency, and completeness.

${platformChecks}

COMMON CHECKS:
- All imports resolve — no missing modules or incorrect paths
- TypeScript imports use correct types from the framework
- package.json is valid JSON (no comments, no trailing commas)
- .env.example has ALL env vars referenced via process.env in the code
- README setup steps are accurate and complete
- No stub implementations — all handlers have real logic
- Dockerfile correctly copies dist/ output and runs node dist/index.js

Return ONLY a valid JSON array: [{"path": "...", "content": "...", "fixed": true/false}]
Return ALL files even if unchanged.`;

    try {
      const response = await callClaudeSonnet(
        `Original request: ${userPrompt.slice(0, 200)}\n\nReview these ${plan.platform} bot files:\n\n${summary.slice(0, 14000)}`,
        systemPrompt,
        8192,
        undefined,
        meter
      );
      const parsed = this.parseJSON<FileEntry[]>(response, []);
      if (!Array.isArray(parsed) || parsed.length === 0) return files;
      const valid = parsed.every(f => typeof f.path === 'string' && typeof f.content === 'string');
      return valid ? parsed.map(f => ({ path: f.path, content: f.content })) : files;
    } catch {
      return files;
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  private stripFences(content: string): string {
    return content
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/^```$/gm, '')
      .trim();
  }

  private parseJSON<T>(text: string, fallback: T): T {
    const isArray = Array.isArray(fallback);
    const open = isArray ? '[' : '{';
    const close = isArray ? ']' : '}';

    const cleaned = text
      .replace(/^```[\w]*\n?/gm, '')
      .replace(/^```$/gm, '')
      .trim();

    // 1. Direct parse
    try { return JSON.parse(cleaned) as T; } catch { /* continue */ }

    // 2. Extract balanced block
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
        try { return JSON.parse(cleaned.slice(start, i + 1)) as T; } catch { return fallback; }
      }
    }

    return fallback;
  }
}
