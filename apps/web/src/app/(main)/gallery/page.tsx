'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { galleryApi, tasksApi, getApiError } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';

type GalleryCategory = 'all' | 'code' | 'research' | 'image' | 'content' | 'mobile' | 'presentation' | 'agent' | 'workflow';

const CATEGORY_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  all:          { label: 'All',          icon: '🌐', color: 'bg-slate-100 text-slate-700' },
  code:         { label: 'Web App',      icon: '⌨️', color: 'bg-indigo-100 text-indigo-700' },
  mobile:       { label: 'Mobile',       icon: '📱', color: 'bg-cyan-100 text-cyan-700' },
  presentation: { label: 'Slides',       icon: '🎯', color: 'bg-violet-100 text-violet-700' },
  agent:        { label: 'AI Agent',     icon: '🤖', color: 'bg-emerald-100 text-emerald-700' },
  workflow:     { label: 'Workflow',     icon: '⚡', color: 'bg-amber-100 text-amber-700' },
  research:     { label: 'Research',     icon: '🔍', color: 'bg-teal-100 text-teal-700' },
  content:      { label: 'Content',      icon: '📝', color: 'bg-pink-100 text-pink-700' },
  image:        { label: 'Image',        icon: '🎨', color: 'bg-orange-100 text-orange-700' },
};

// Remove voice from fallback lookup so old gallery items show a generic label
const CATEGORY_LABELS_SAFE = (cat: string) => CATEGORY_LABELS[cat] ?? CATEGORY_LABELS.code;

function GalleryCard({ task }: { task: any }) {
  const [publishing, setPublishing] = useState(false);
  const title = (task.prompt ?? '').split('\n')[0].slice(0, 80) || 'Untitled';
  const cat = CATEGORY_LABELS_SAFE(task.category);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
      {/* Preview banner */}
      {task.previewUrl || task.deployUrl ? (
        <div className="h-36 bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center relative overflow-hidden">
          <div className="text-4xl opacity-30">{cat.icon}</div>
          <a
            href={task.previewUrl ?? task.deployUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute inset-0 flex items-end p-3"
          >
            <span className="text-xs bg-black/60 text-white px-2 py-1 rounded-lg font-mono truncate max-w-full">
              {(task.previewUrl ?? task.deployUrl)?.replace('https://', '')}
            </span>
          </a>
        </div>
      ) : (
        <div className="h-36 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
          <span className="text-5xl opacity-20">{cat.icon}</span>
        </div>
      )}

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', cat.color)}>{cat.icon} {cat.label}</span>
          {task.user?.name && (
            <span className="text-[10px] text-slate-400 truncate max-w-[100px]">by {task.user.name}</span>
          )}
        </div>

        <p className="text-sm font-semibold text-slate-800 line-clamp-2 flex-1 leading-snug">{title}</p>

        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>{task.completedAt ? formatDate(task.completedAt) : ''}</span>
          {task.creditsActuallyUsed && <span>{task.creditsActuallyUsed} credits</span>}
        </div>

        <div className="flex gap-2">
          {(task.previewUrl ?? task.deployUrl) && (
            <a
              href={task.previewUrl ?? task.deployUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center text-xs font-semibold px-3 py-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
            >
              View Live ↗
            </a>
          )}
          <Link
            href={`/task/${task.id}`}
            className="flex-1 text-center text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
          >
            See Code
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function GalleryPage() {
  const [category, setCategory] = useState<GalleryCategory>('all');
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    setPage(1);
  }, [category]);

  useEffect(() => {
    setLoading(true);
    galleryApi.list({ page, limit: 18, category: category === 'all' ? undefined : category })
      .then(data => {
        setTasks(data.tasks ?? []);
        setTotalPages(data.totalPages ?? 1);
        setTotal(data.total ?? 0);
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [page, category]);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold text-slate-900">Community Gallery</h1>
          <p className="text-slate-500 max-w-xl mx-auto">
            Apps, agents, and tools built by the Arrivarangam community. Get inspired and build your own.
          </p>
          <div className="flex items-center justify-center gap-3 pt-1">
            <span className="text-sm text-slate-400">{total.toLocaleString()} projects published</span>
            <span className="text-slate-300">·</span>
            <Link href="/dashboard" className="text-sm text-indigo-600 font-semibold hover:text-indigo-700">
              Build yours →
            </Link>
          </div>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 justify-center">
          {Object.entries(CATEGORY_LABELS).map(([key, { label, icon, color }]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key as GalleryCategory)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all',
                category === key
                  ? cn(color, 'ring-2 ring-offset-1', color.includes('indigo') ? 'ring-indigo-400' : 'ring-slate-400')
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              )}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 overflow-hidden animate-pulse">
                <div className="h-36 bg-slate-100" />
                <div className="p-4 space-y-3">
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                  <div className="h-4 bg-slate-100 rounded w-4/5" />
                  <div className="h-4 bg-slate-100 rounded w-3/5" />
                  <div className="h-8 bg-slate-100 rounded-xl" />
                </div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <div className="text-6xl opacity-20">🌐</div>
            <p className="text-slate-500 font-medium">No public projects yet in this category.</p>
            <p className="text-slate-400 text-sm">Complete a task and publish it to the gallery!</p>
            <Link href="/dashboard" className="inline-flex px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
              Start Building →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {tasks.map(task => (
              <GalleryCard key={task.id} task={task} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              ← Prev
            </button>
            <span className="text-sm text-slate-500 px-3">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
