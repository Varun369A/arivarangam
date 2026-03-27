'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from 'react-query'
import { Zap, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { tasksApi } from '@/lib/api'
import { cn, formatDate } from '@/lib/utils'

type StatusFilter = '' | 'queued' | 'running' | 'done' | 'failed' | 'cancelled'

const CATEGORY_ICONS: Record<string, string> = {
  code: '⌨️', research: '🔍', image: '🎨', voice: '🎙️', content: '✍️',
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    queued: 'bg-slate-100 text-slate-600',
    running: 'bg-blue-100 text-blue-700',
    done: 'bg-green-100 text-green-700',
    completed: 'bg-green-100 text-green-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-100 text-slate-400',
    pending: 'bg-slate-100 text-slate-600',
    analyzing: 'bg-purple-100 text-purple-700',
  }
  return (
    <span className={cn('badge capitalize', map[status] ?? 'bg-slate-100 text-slate-500')}>
      {status === 'running' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse mr-1" />}
      {status}
    </span>
  )
}

export default function TasksPage() {
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<StatusFilter>('')

  const { data, isLoading } = useQuery(
    ['tasks-list', page, status],
    () => tasksApi.list({ page, limit: 20, status: status || undefined }),
    { keepPreviousData: true }
  )

  const tasks = (data as any)?.data?.tasks ?? []
  const totalPages = (data as any)?.data?.totalPages ?? 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-500" /> Tasks
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">All your AI task runs</p>
        </div>
        <Link href="/dashboard" className="btn-secondary text-sm">+ New task</Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-slate-400" />
        {(['', 'running', 'queued', 'done', 'failed', 'cancelled'] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1) }}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors border',
              status === s
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-surface-border hover:bg-slate-50'
            )}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-surface-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-slate-400 animate-pulse">Loading tasks…</div>
        ) : tasks.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl mx-auto mb-4">🚀</div>
            <p className="text-sm font-medium text-slate-700 mb-1">No tasks yet</p>
            <p className="text-xs text-slate-400 mb-4">Go to the dashboard to run your first AI task.</p>
            <Link href="/dashboard" className="btn-primary text-sm">Go to dashboard</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[2rem_1fr_6rem_6rem_7rem_5rem] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <span />
              <span>Prompt</span>
              <span>Category</span>
              <span>Status</span>
              <span>Created</span>
              <span>Credits</span>
            </div>
            <div className="divide-y divide-slate-50">
              {tasks.map(task => (
                <Link
                  key={task.id}
                  href={`/task/${task.id}`}
                  className="grid grid-cols-[2rem_1fr_6rem_6rem_7rem_5rem] gap-4 px-5 py-3.5 items-center hover:bg-slate-50 transition-colors"
                >
                  <span className="text-lg">{CATEGORY_ICONS[task.category] ?? '📋'}</span>
                  <p className="text-sm text-slate-800 truncate">{task.prompt}</p>
                  <span className="text-xs text-slate-500 capitalize">{task.category}</span>
                  <StatusBadge status={task.status} />
                  <span className="text-xs text-slate-400">{formatDate(task.createdAt)}</span>
                  <span className="text-xs text-slate-500 font-mono">
                    {(task as any).creditsActuallyUsed ?? (task as any).creditsUsed ?? '—'}
                  </span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Page {page} of {totalPages} · {data?.total ?? 0} tasks</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="btn-secondary py-1.5 px-3 disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="btn-secondary py-1.5 px-3 disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
