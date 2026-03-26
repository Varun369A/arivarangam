/**
 * SelfFix — Platform self-repair service.
 * When errors are detected in the platform's own code, Claude reads
 * the error + file, generates a fix, and queues it for admin approval.
 * After approval it applies the patch automatically.
 */

import { prisma } from '@arivarangam/db'
import { callClaude } from '../connectors/claude'
import * as fs from 'fs'
import * as path from 'path'

const ROOT_DIR = path.resolve(__dirname, '../../../../')

export interface PlatformError {
  message: string
  stack?: string
  filePath?: string
  code?: string
}

/**
 * Called when an unhandled error occurs anywhere in the platform.
 * Logs the error and attempts to generate a fix via Claude.
 */
export async function reportPlatformError(err: PlatformError, context: string): Promise<void> {
  console.error(`[SelfFix] Platform error in ${context}:`, err.message)

  try {
    // Log to DB immediately
    const logEntry = await prisma.platformLog.create({
      data: {
        type: 'ERROR',
        severity: 'ERROR',
        title: `Error in ${context}: ${err.message.slice(0, 100)}`,
        description: err.stack || err.message,
        filePath: err.filePath,
        approved: false,
      },
    })

    // Only attempt auto-fix if we have a file path
    if (!err.filePath) return

    // Resolve absolute path
    const absPath = path.isAbsolute(err.filePath)
      ? err.filePath
      : path.join(ROOT_DIR, err.filePath)

    if (!fs.existsSync(absPath)) return

    const fileContent = fs.readFileSync(absPath, 'utf-8')
    const fix = await generateFix(err, fileContent, context)

    if (fix) {
      await prisma.platformLog.update({
        where: { id: logEntry.id },
        data: {
          type: 'FIX_APPLIED',
          severity: 'INFO',
          title: `Auto-fix generated for ${context}`,
          oldCode: fileContent.slice(0, 2000),
          newCode: fix.slice(0, 2000),
          approved: false, // requires admin approval before applying
        },
      })
      console.log(`[SelfFix] Fix generated for ${err.filePath} — pending admin approval`)
    }
  } catch (fixErr) {
    console.error('[SelfFix] Failed to generate fix:', fixErr)
  }
}

async function generateFix(
  err: PlatformError,
  fileContent: string,
  context: string,
): Promise<string | null> {
  const prompt = `You are a senior TypeScript/Node.js engineer. A production error occurred and you need to generate a fix.

ERROR:
${err.message}

STACK TRACE:
${err.stack || 'Not available'}

FILE PATH: ${err.filePath}

CURRENT FILE CONTENT:
\`\`\`typescript
${fileContent.slice(0, 3000)}
\`\`\`

CONTEXT: ${context}

Generate the COMPLETE fixed file content. Output ONLY the fixed TypeScript code, no explanations, no markdown fences.
The fix must:
1. Address the root cause of the error
2. Not break existing functionality
3. Follow the same code style
4. Be production-safe

Output the complete fixed file:`

  try {
    const fix = await callClaude(prompt, { model: 'sonnet', maxTokens: 4000 })
    // Strip markdown fences if present
    const fenceMatch = fix.match(/```(?:typescript|ts|javascript|js)?\n([\s\S]+?)```/)
    return fenceMatch ? fenceMatch[1].trim() : fix.trim()
  } catch {
    return null
  }
}

/**
 * Apply an approved fix. Called by admin from the platform dashboard.
 */
export async function applyFix(logId: string): Promise<{ success: boolean; message: string }> {
  const log = await prisma.platformLog.findUnique({ where: { id: logId } })

  if (!log) return { success: false, message: 'Log entry not found' }
  if (log.approved) return { success: false, message: 'Already applied' }
  if (!log.filePath || !log.newCode) return { success: false, message: 'No fix to apply' }

  try {
    const absPath = path.isAbsolute(log.filePath)
      ? log.filePath
      : path.join(ROOT_DIR, log.filePath)

    // Backup original
    const backupPath = absPath + '.backup.' + Date.now()
    if (fs.existsSync(absPath)) {
      fs.copyFileSync(absPath, backupPath)
    }

    // Write fix
    fs.writeFileSync(absPath, log.newCode, 'utf-8')

    await prisma.platformLog.update({
      where: { id: logId },
      data: { approved: true, approvedAt: new Date() },
    })

    console.log(`[SelfFix] Applied fix to ${log.filePath}`)
    return { success: true, message: `Fix applied. Backup at ${backupPath}` }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, message: `Failed to apply fix: ${msg}` }
  }
}
