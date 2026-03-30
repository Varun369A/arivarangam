'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useQuery, useQueryClient } from 'react-query'
import { GitBranch, ChevronLeft, ChevronRight, Plus, ExternalLink, Pencil, Check, X, Download } from 'lucide-react'
import { reposApi } from '@/lib/api'
import { formatDate } from '@/lib/utils'

function RepoRow({ repo, onRenamed }: { repo: any; onRenamed: (id: string, name: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(repo.name)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  async function saveEdit(e?: React.MouseEvent) {
    e?.preventDefault()
    e?.stopPropagation()
    const trimmed = name.trim()
    if (!trimmed || trimmed === repo.name) { setEditing(false); setName(repo.name); return }
    setSaving(true)
    try {
      await reposApi.update(repo.id, { name: trimmed })
      onRenamed(repo.id, trimmed)
      setEditing(false)
    } catch {
      setName(repo.name)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  function cancelEdit(e?: React.MouseEvent) {
    e?.preventDefault()
    e?.stopPropagation()
    setName(repo.name)
    setEditing(false)
  }

  function handleDownload(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const files: any[] = repo.files ?? []
    if (files.length === 0) return
    const content = files.map((f: any) => `// === ${f.path} ===\n${f.content ?? ''}`).join('\n\n')
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${repo.name.replace(/[^a-z0-9-]/gi, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const fileCount = repo.files?.length ?? repo._count?.files ?? 0

  return (
    <div className="grid grid-cols-[1fr_6rem_7rem_6rem] gap-4 px-5 py-4 items-center hover:bg-slate-50 transition-colors group">
      <div className="min-w-0 flex items-center gap-2">
        {editing ? (
          <div className="flex items-center gap-2 flex-1 min-w-0" onClick={e => { e.preventDefault(); e.stopPropagation() }}>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
              className="flex-1 text-sm font-medium text-slate-800 bg-white border border-indigo-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-300 min-w-0"
              autoFocus
            />
            <button type="button" onClick={saveEdit} disabled={saving}
              className="text-emerald-600 hover:text-emerald-700 shrink-0" title="Save">
              <Check className="w-4 h-4" />
            </button>
            <button type="button" onClick={cancelEdit}
              className="text-slate-400 hover:text-slate-600 shrink-0" title="Cancel">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <Link href={`/repos/${repo.id}`} className="text-sm font-medium text-slate-800 truncate flex-1 min-w-0 hover:text-indigo-700">
              {name}
              {repo.description && (
                <span className="block text-xs text-slate-400 font-normal truncate">{repo.description}</span>
              )}
            </Link>
            <button type="button" onClick={startEdit}
              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 transition-all shrink-0" title="Rename">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
      <span className="text-xs text-slate-500">{fileCount} files</span>
      <span className="text-xs text-slate-400">{formatDate(repo.updatedAt)}</span>
      <div className="flex items-center gap-1 justify-end">
        {fileCount > 0 && (
          <button type="button" onClick={handleDownload}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-indigo-600 transition-all" title="Download files">
            <Download className="w-3.5 h-3.5" />
          </button>
        )}
        <Link href={`/repos/${repo.id}`} onClick={e => e.stopPropagation()}>
          <ExternalLink className="w-4 h-4 text-slate-300 hover:text-slate-500 transition-colors" />
        </Link>
      </div>
    </div>
  )
}

export default function ReposPage() {
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery(
    ['repos-list', page],
    () => reposApi.list({ page, limit: 20 }),
    { keepPreviousData: true }
  )

  const repos: any[] = data?.data ?? []
  const totalPages: number = data?.totalPages ?? 1

  function handleRenamed(id: string, newName: string) {
    queryClient.setQueryData(['repos-list', page], (old: any) => {
      if (!old) return old
      return { ...old, data: old.data.map((r: any) => r.id === id ? { ...r, name: newName } : r) }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-400" /> Repos
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">AI-generated code repositories</p>
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
            <div className="grid grid-cols-[1fr_6rem_7rem_6rem] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <span>Name</span>
              <span>Files</span>
              <span>Updated</span>
              <span />
            </div>
            <div className="divide-y divide-slate-50">
              {repos.map((repo: any) => (
                <RepoRow key={repo.id} repo={repo} onRenamed={handleRenamed} />
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
