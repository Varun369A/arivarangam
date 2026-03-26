import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  formatDistanceToNow,
  format,
  isToday,
  isYesterday,
  differenceInDays,
} from 'date-fns'
import type { TaskStatus } from '@/lib/api'

// ---------------------------------------------------------------------------
// Styling
// ---------------------------------------------------------------------------

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

// ---------------------------------------------------------------------------
// Credits & Currency
// ---------------------------------------------------------------------------

/**
 * Format a credit balance for display.
 * Examples: 1234 → "1,234 credits"  |  50000 → "50,000 credits"
 */
export function formatCredits(n: number): string {
  return `${n.toLocaleString('en-IN')} credits`
}

/**
 * Format a raw credit count without the label (for compact display).
 * Examples: 1500 → "1.5k"  |  999 → "999"
 */
export function formatCreditsCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`
  return n.toString()
}

/**
 * Format paise → Indian Rupee string.
 * Example: 29900 → "₹299"
 */
export function formatINR(paise: number): string {
  const rupees = paise / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: rupees % 1 === 0 ? 0 : 2,
  }).format(rupees)
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/**
 * Smart date formatter:
 * - Today: "Today at 3:45 PM"
 * - Yesterday: "Yesterday at 3:45 PM"
 * - Within 7 days: "3 days ago"
 * - Otherwise: "12 Mar 2025"
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return 'Invalid date'
  if (isToday(d)) return `Today at ${format(d, 'h:mm a')}`
  if (isYesterday(d)) return `Yesterday at ${format(d, 'h:mm a')}`
  if (differenceInDays(new Date(), d) < 7) return formatDistanceToNow(d, { addSuffix: true })
  return format(d, 'd MMM yyyy')
}

/**
 * Always return an absolute date+time string.
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return 'Invalid date'
  return format(d, 'd MMM yyyy, h:mm a')
}

/**
 * Relative time only (e.g. "5 minutes ago").
 */
export function formatRelative(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return formatDistanceToNow(d, { addSuffix: true })
}

// ---------------------------------------------------------------------------
// Duration
// ---------------------------------------------------------------------------

/**
 * Format milliseconds into a human-readable duration.
 * Example: 154000 → "2m 34s"
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return '0s'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

// ---------------------------------------------------------------------------
// Task helpers
// ---------------------------------------------------------------------------

/**
 * Returns a Tailwind CSS color class string for a given task status.
 */
export function taskStatusColor(
  status: TaskStatus
): { bg: string; text: string; border: string; dot: string } {
  switch (status) {
    case 'queued':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        dot: 'bg-amber-400',
      }
    case 'running':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        dot: 'bg-blue-500',
      }
    case 'done':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
      }
    case 'failed':
      return {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        dot: 'bg-red-500',
      }
    case 'cancelled':
      return {
        bg: 'bg-slate-50',
        text: 'text-slate-600',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
      }
    default:
      return {
        bg: 'bg-slate-50',
        text: 'text-slate-600',
        border: 'border-slate-200',
        dot: 'bg-slate-400',
      }
  }
}

const CATEGORY_ICON_MAP: Record<string, string> = {
  code: 'Code2',
  debug: 'Bug',
  docs: 'FileText',
  design: 'Palette',
  data: 'Database',
  test: 'FlaskConical',
  devops: 'Server',
  api: 'Plug',
  review: 'Eye',
  refactor: 'Wrench',
  explain: 'MessageCircle',
  general: 'Sparkles',
}

/**
 * Returns the Lucide icon name for a task category.
 * Falls back to 'Sparkles'.
 */
export function categoryIcon(category: string): string {
  return CATEGORY_ICON_MAP[category.toLowerCase()] ?? 'Sparkles'
}

// ---------------------------------------------------------------------------
// User helpers
// ---------------------------------------------------------------------------

/**
 * Returns uppercase initials from a display name.
 * "Varun A" → "VA", "Priya" → "PR"
 */
export function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return name.slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Truncate a string to maxLen characters with an ellipsis.
 */
export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

/**
 * Sleep for n milliseconds (useful in async flows).
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
