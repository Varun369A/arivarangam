'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { galleryApi, getApiError } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';

type GalleryCategory = 'all' | 'code' | 'research' | 'image' | 'content' | 'mobile' | 'presentation' | 'agent' | 'workflow';

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  all:          { label: 'All',      icon: '🌐' },
  code:         { label: 'Web App',  icon: '⌨️' },
  mobile:       { label: 'Mobile',   icon: '📱' },
  presentation: { label: 'Slides',   icon: '🎯' },
  agent:        { label: 'AI Agent', icon: '🤖' },
  workflow:     { label: 'Workflow', icon: '⚡' },
  research:     { label: 'Research', icon: '🔍' },
  content:      { label: 'Content',  icon: '📝' },
  image:        { label: 'Image',    icon: '🎨' },
};

const CATEGORY_LABELS_SAFE = (cat: string) => CATEGORY_LABELS[cat] ?? CATEGORY_LABELS.code;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (d = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: d } }),
};
const stagger = { show: { transition: { staggerChildren: 0.06 } }, hidden: {} };

function GalleryCard({ task, index }: { task: any; index: number }) {
  const title = (task.prompt ?? '').split('\n')[0].slice(0, 80) || 'Untitled';
  const cat = CATEGORY_LABELS_SAFE(task.category);

  return (
    <motion.div
      variants={fadeUp}
      custom={index * 0.03}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}
    >
      {/* Preview banner */}
      {task.previewUrl || task.deployUrl ? (
        <div className="h-36 flex items-center justify-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(139,92,246,0.2) 100%)' }}>
          <div className="text-4xl opacity-40">{cat.icon}</div>
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
        <div className="h-36 flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.1) 100%)' }}>
          <span className="text-5xl opacity-25">{cat.icon}</span>
        </div>
      )}

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-indigo-200"
            style={{ background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.3)' }}>
            {cat.icon} {cat.label}
          </span>
          {task.user?.name && (
            <span className="text-[10px] text-slate-400 truncate max-w-[100px]">by {task.user.name}</span>
          )}
        </div>

        <p className="text-sm font-semibold text-white line-clamp-2 flex-1 leading-snug">{title}</p>

        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span>{task.completedAt ? formatDate(task.completedAt) : ''}</span>
          {task.creditsActuallyUsed && <span>{task.creditsActuallyUsed} credits</span>}
        </div>

        <div className="flex gap-2">
          {(task.previewUrl ?? task.deployUrl) && (
            <a
              href={task.previewUrl ?? task.deployUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              View Live ↗
            </a>
          )}
          <Link
            href={`/task/${task.id}`}
            className="flex-1 text-center text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors text-slate-300 hover:text-white"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            See Code
          </Link>
        </div>
      </div>
    </motion.div>
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
        <motion.div variants={stagger} initial="hidden" animate="show" className="text-center space-y-3">
          <motion.h1 variants={fadeUp} className="text-3xl font-bold text-white">
            Community Gallery
          </motion.h1>
          <motion.p variants={fadeUp} className="text-slate-400 max-w-xl mx-auto">
            Apps, agents, and tools built by the Arivarangam community. Get inspired and build your own.
          </motion.p>
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 pt-1">
            <span className="text-sm text-slate-500">{total.toLocaleString()} projects published</span>
            <span className="text-slate-700">·</span>
            <Link href="/dashboard" className="text-sm font-semibold" style={{ color: '#6366f1' }}>
              Build yours →
            </Link>
          </motion.div>
        </motion.div>

        {/* Category filter */}
        <motion.div
          variants={stagger} initial="hidden" animate="show"
          className="flex flex-wrap gap-2 justify-center"
        >
          {Object.entries(CATEGORY_LABELS).map(([key, { label, icon }]) => (
            <motion.button
              key={key}
              variants={fadeUp}
              type="button"
              onClick={() => setCategory(key as GalleryCategory)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={category === key
                ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', border: '1px solid rgba(99,102,241,0.5)' }
                : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8' }
              }
            >
              {icon} {label}
            </motion.button>
          ))}
        </motion.div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="rounded-2xl overflow-hidden animate-pulse"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="h-36" style={{ background: 'rgba(255,255,255,0.05)' }} />
                <div className="p-4 space-y-3">
                  <div className="h-3 rounded w-1/3" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  <div className="h-4 rounded w-4/5" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  <div className="h-4 rounded w-3/5" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  <div className="h-8 rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }} />
                </div>
              </div>
            ))}
          </div>
        ) : tasks.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 space-y-4">
            <div className="text-6xl opacity-20">🌐</div>
            <p className="text-slate-400 font-medium">No public projects yet in this category.</p>
            <p className="text-slate-500 text-sm">Complete a task and publish it to the gallery!</p>
            <Link href="/dashboard"
              className="inline-flex px-5 py-2 text-white text-sm font-semibold rounded-xl transition-colors"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              Start Building →
            </Link>
          </motion.div>
        ) : (
          <motion.div
            variants={stagger} initial="hidden" animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          >
            {tasks.map((task, i) => (
              <GalleryCard key={task.id} task={task} index={i} />
            ))}
          </motion.div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !loading && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 text-sm font-medium text-slate-300 rounded-xl hover:text-white transition-colors disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
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
              className="px-4 py-2 text-sm font-medium text-slate-300 rounded-xl hover:text-white transition-colors disabled:opacity-40"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
