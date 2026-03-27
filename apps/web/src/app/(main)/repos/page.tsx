'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from 'react-query'
import { GitBranch, ChevronLeft, ChevronRight, Plus, ExternalLink } from 'lucide-react'
import { reposApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'

export default function ReposPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery(
    ['repos-list', page],
    () => reposApi.list({ page, limit: 20 }),
    { keepPreviousData: true }
  )

  const repos = (data as any)?.data?.repos ?? (data as any)?.repos ?? []
  const totalPages = (data as any)?.data?.totalPages ?? (data as any)?.totalPages ?? 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-500" /> Repos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">AI-generated code repositories</p>
        </div>
        <Link href="/dashboard" className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New repo
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-surface-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-slate-400 animate-pulse">Loading repos…</div>
        ) : repos.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl mx-auto mb-4">🗂️</div>
            <p className="text-sm font-medium text-slate-700 mb-1">No repos yet</p>
            <p className="text-xs text-slate-400 mb-4">Run a task on the dashboard to generate your first repo.</p>
            <Link href="/dashboard" className="btn-primary text-sm">Go to dashboard</Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_8rem_7rem_5rem] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <span>Name</span>
              <span>Files</span>
              <span>Updated</span>
              <span />
            </div>
            <div className="divide-y divide-slate-50">
              {repos.map((repo: any) => (
                <Link
                  key={repo.id}
                  href={`/repos/${repo.id}`}
                  className="grid grid-cols-[1fr_8rem_7rem_5rem] gap-4 px-5 py-4 items-center hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{repo.name}</p>
                    {repo.description && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">{repo.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {(repo.files?.length ?? repo._count?.files ?? '—')} files
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(repo.updatedAt)}</span>
                  <ExternalLink className="w-4 h-4 text-slate-300 justify-self-end" />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">Page {page} of {totalPages}</p>
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
