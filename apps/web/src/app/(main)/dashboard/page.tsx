'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { tasksApi, reposApi, creditsApi, getApiError } from '@/lib/api';
import { cn, formatDate, formatCredits } from '@/lib/utils';

type TaskCategory = 'code' | 'research' | 'image' | 'voice' | 'content' | 'mobile' | 'presentation' | 'agent' | 'workflow';

// ─── Category Config ──────────────────────────────────────────────────────────

interface CategoryConfig {
  key: TaskCategory;
  label: string;
  icon: string;
  colorText: string;
  colorBg: string;
  activeRing: string;
  btnBg: string;
  placeholder: string;
}

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'code',
    label: 'Web App',
    icon: '⌨️',
    colorText: 'text-indigo-700',
    colorBg: 'bg-indigo-50',
    activeRing: 'ring-2 ring-indigo-500 ring-offset-1',
    btnBg: 'bg-indigo-600 hover:bg-indigo-700',
    placeholder: 'Build a React todo app with local storage and drag-and-drop sorting...',
  },
  {
    key: 'mobile',
    label: 'Mobile',
    icon: '📱',
    colorText: 'text-cyan-700',
    colorBg: 'bg-cyan-50',
    activeRing: 'ring-2 ring-cyan-500 ring-offset-1',
    btnBg: 'bg-cyan-600 hover:bg-cyan-700',
    placeholder: 'Build a React Native expense tracker app with categories and charts...',
  },
  {
    key: 'presentation',
    label: 'Slides',
    icon: '🎯',
    colorText: 'text-violet-700',
    colorBg: 'bg-violet-50',
    activeRing: 'ring-2 ring-violet-500 ring-offset-1',
    btnBg: 'bg-violet-600 hover:bg-violet-700',
    placeholder: 'Create a startup pitch deck for an AI-powered food delivery platform...',
  },
  {
    key: 'agent',
    label: 'AI Agent',
    icon: '🤖',
    colorText: 'text-emerald-700',
    colorBg: 'bg-emerald-50',
    activeRing: 'ring-2 ring-emerald-500 ring-offset-1',
    btnBg: 'bg-emerald-600 hover:bg-emerald-700',
    placeholder: 'Build a Python AI agent that searches the web and summarises news daily...',
  },
  {
    key: 'workflow',
    label: 'Workflow',
    icon: '⚡',
    colorText: 'text-amber-700',
    colorBg: 'bg-amber-50',
    activeRing: 'ring-2 ring-amber-500 ring-offset-1',
    btnBg: 'bg-amber-500 hover:bg-amber-600',
    placeholder: 'Create an n8n workflow that monitors Twitter mentions and sends Slack alerts...',
  },
  {
    key: 'research',
    label: 'Research',
    icon: '🔍',
    colorText: 'text-teal-700',
    colorBg: 'bg-teal-50',
    activeRing: 'ring-2 ring-teal-500 ring-offset-1',
    btnBg: 'bg-teal-600 hover:bg-teal-700',
    placeholder: 'Research the latest trends in large language models and summarise key findings...',
  },
  {
    key: 'image',
    label: 'Image',
    icon: '🎨',
    colorText: 'text-orange-700',
    colorBg: 'bg-orange-50',
    activeRing: 'ring-2 ring-orange-500 ring-offset-1',
    btnBg: 'bg-orange-500 hover:bg-orange-600',
    placeholder: 'Generate a futuristic city skyline at sunset with neon lights...',
  },
  {
    key: 'voice',
    label: 'Voice',
    icon: '🎙️',
    colorText: 'text-pink-700',
    colorBg: 'bg-pink-50',
    activeRing: 'ring-2 ring-pink-500 ring-offset-1',
    btnBg: 'bg-pink-500 hover:bg-pink-600',
    placeholder: 'Create a warm, professional voice-over for a product launch video...',
  },
  {
    key: 'content',
    label: 'Content',
    icon: '📝',
    colorText: 'text-rose-700',
    colorBg: 'bg-rose-50',
    activeRing: 'ring-2 ring-rose-500 ring-offset-1',
    btnBg: 'bg-rose-500 hover:bg-rose-600',
    placeholder: 'Write a compelling blog post about the future of AI in Indian healthcare...',
  },
];

interface CreditEstimate {
  min: number;
  max: number;
  typical?: number;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending:   { label: 'Pending',   cls: 'bg-slate-100 text-slate-600' },
    analyzing: { label: 'Analyzing', cls: 'bg-purple-100 text-purple-700' },
    running:   { label: 'Running',   cls: 'bg-blue-100 text-blue-700' },
    queued:    { label: 'Queued',    cls: 'bg-slate-100 text-slate-600' },
    completed: { label: 'Done',      cls: 'bg-green-100 text-green-700' },
    done:      { label: 'Done',      cls: 'bg-green-100 text-green-700' },
    failed:    { label: 'Failed',    cls: 'bg-red-100 text-red-700' },
    cancelled: { label: 'Cancelled', cls: 'bg-slate-100 text-slate-500' },
  };
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' };
  return (
    <span className={cn('badge', cls)}>
      {status === 'running' && (
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
      )}
      {label}
    </span>
  );
}

// ─── Category Icon ────────────────────────────────────────────────────────────

const CATEGORY_ICON_MAP: Record<string, { icon: string; bg: string }> = {
  code:         { icon: '⌨️', bg: 'bg-indigo-50' },
  mobile:       { icon: '📱', bg: 'bg-cyan-50' },
  presentation: { icon: '🎯', bg: 'bg-violet-50' },
  agent:        { icon: '🤖', bg: 'bg-emerald-50' },
  workflow:     { icon: '⚡', bg: 'bg-amber-50' },
  research:     { icon: '🔍', bg: 'bg-teal-50' },
  image:        { icon: '🎨', bg: 'bg-orange-50' },
  voice:        { icon: '🎙️', bg: 'bg-pink-50' },
  content:      { icon: '📝', bg: 'bg-rose-50' },
};

function CategoryIcon({ category }: { category: string }) {
  const cfg = CATEGORY_ICON_MAP[category] ?? { icon: '📋', bg: 'bg-slate-100' };
  return (
    <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center text-base', cfg.bg)}>
      <span>{cfg.icon}</span>
    </div>
  );
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        className="text-slate-400 hover:text-slate-600 transition-colors align-middle"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label="More information"
      >
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" clipRule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" />
        </svg>
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-lg bg-slate-800 text-white text-xs whitespace-nowrap z-50 shadow-lg pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </span>
      )}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer-bg rounded-lg', className)} />;
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { balance, refresh: refreshCredits } = useCredits();

  // Create task state
  const [category, setCategory] = useState<TaskCategory>('code');
  const [voiceLang, setVoiceLang] = useState('en');
  const [prompt, setPrompt] = useState('');
  const [estimate, setEstimate] = useState<CreditEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Data
  const [tasks, setTasks] = useState<any[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);
  const [repos, setRepos] = useState<any[]>([]);
  const [reposLoading, setReposLoading] = useState(true);

  // Load data
  useEffect(() => {
    tasksApi.list({ limit: 12 })
      .then(res => setTasks((res as any)?.data?.tasks ?? []))
      .catch(() => {})
      .finally(() => setTasksLoading(false));
  }, []);

  useEffect(() => {
    reposApi.list({ limit: 6 })
      .then(res => setRepos(res?.data ?? []))
      .catch(() => {})
      .finally(() => setReposLoading(false));
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [prompt]);

  // Debounced credit estimate
  const runEstimate = useCallback(async (text: string, cat: string) => {
    if (text.trim().length < 5) { setEstimate(null); return; }
    setEstimating(true);
    try {
      const data = await creditsApi.estimateTask(text.trim(), cat);
      setEstimate({ min: data.min ?? 0, max: data.max ?? 0 });
    } catch {
      setEstimate(null);
    } finally {
      setEstimating(false);
    }
  }, []);

  const handlePromptChange = useCallback((val: string) => {
    setPrompt(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runEstimate(val, category), 800);
  }, [category, runEstimate]);

  useEffect(() => {
    if (prompt.trim().length >= 5) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => runEstimate(prompt, category), 400);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const minEst = estimate?.min ?? 0;
  const canSubmit = prompt.trim().length >= 5 && !submitting && (balance === null || balance >= minEst);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const context = category === 'voice' && voiceLang !== 'en'
        ? JSON.stringify({ language: voiceLang })
        : undefined;
      const res = await tasksApi.create({ category, prompt: prompt.trim(), context });
      const taskId = (res as any)?.data?.task?.id ?? (res as any)?.id;
      // If backend returned activeTaskId, redirect to that running task instead
      const activeTaskId = (res as any)?.data?.activeTaskId
      refreshCredits();
      router.push(`/task/${activeTaskId ?? taskId}`);
    } catch (err: any) {
      const errData = err?.response?.data
      if (errData?.code === 'TASK_ALREADY_RUNNING' && errData?.data?.activeTaskId) {
        router.push(`/task/${errData.data.activeTaskId}`)
        return
      }
      setSubmitError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const activeCfg = CATEGORIES.find(c => c.key === category)!;

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {user ? `Hey, ${user.name.split(' ')[0]} 👋` : 'Dashboard'}
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">What will you build today?</p>
          </div>
          {balance !== null && (
            <Link
              href="/settings?tab=credits"
              className="flex items-center gap-2 px-4 py-2 rounded-xl transition-colors font-semibold text-sm text-white"
              style={{background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 2px 8px rgba(99,102,241,0.3)'}}
            >
              <span>⚡</span>
              <span>{formatCredits(balance)}</span>
            </Link>
          )}
        </div>

        {/* Low credits banner */}
        {balance !== null && balance < 50 && (
          <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl2" style={{background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1.5px solid #fcd34d'}}>
            <div className="flex items-center gap-2">
              <span className="text-amber-500">⚡</span>
              <span className="text-sm font-semibold text-amber-800">
                Running low on credits. Top up to keep building.
              </span>
            </div>
            <Link
              href="/settings?tab=credits"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors whitespace-nowrap"
            >
              Buy Credits →
            </Link>
          </div>
        )}

        {/* Create Task Card */}
        <div className="bg-white rounded-2xl shadow-card p-6 space-y-5" style={{border: '1.5px solid #c7d2fe', boxShadow: '0 4px 20px rgba(99,102,241,0.10)'}}>
          <p className="text-base font-bold text-indigo-800">What do you want to build?</p>

          {/* Category tabs */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(cfg => (
              <button
                key={cfg.key}
                type="button"
                onClick={() => setCategory(cfg.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all duration-150',
                  category === cfg.key
                    ? cn(cfg.colorBg, cfg.colorText, cfg.activeRing)
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100',
                )}
              >
                <span>{cfg.icon}</span>
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Indian language selector — shown only for voice category */}
          {category === 'voice' && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-pink-700">🌐 Language:</span>
              <div className="flex flex-wrap gap-2">
                {[
                  { code: 'en',    label: 'English' },
                  { code: 'hi-IN', label: 'हिन्दी' },
                  { code: 'ta-IN', label: 'தமிழ்' },
                  { code: 'te-IN', label: 'తెలుగు' },
                  { code: 'kn-IN', label: 'ಕನ್ನಡ' },
                  { code: 'ml-IN', label: 'മലയാളം' },
                  { code: 'mr-IN', label: 'मराठी' },
                  { code: 'bn-IN', label: 'বাংলা' },
                  { code: 'gu-IN', label: 'ગુજરાતી' },
                  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ' },
                ].map(lang => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setVoiceLang(lang.code)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                      voiceLang === lang.code
                        ? 'bg-pink-500 text-white ring-2 ring-pink-400 ring-offset-1'
                        : 'bg-pink-50 text-pink-700 hover:bg-pink-100'
                    )}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
              {voiceLang !== 'en' && (
                <span className="text-[11px] text-pink-500 font-medium">Powered by Sarvam AI</span>
              )}
            </div>
          )}

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={e => handlePromptChange(e.target.value)}
            placeholder={activeCfg.placeholder}
            rows={3}
            className="input resize-none min-h-[80px]"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
          />

          {/* Estimate + submit row */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-slate-500 min-h-[22px]">
              {estimating ? (
                <span className="flex items-center gap-1.5 text-slate-400 text-sm">
                  <span className="inline-block w-3.5 h-3.5 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
                  Estimating...
                </span>
              ) : estimate ? (
                <span className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-sm">Credit estimate:</span>
                  <span className="font-semibold text-slate-700 text-sm">
                    ~{estimate.min}–{estimate.max} credits
                  </span>
                  <InfoTooltip text="Estimates may vary by ±20% based on task complexity" />
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {submitError && (
                <span className="text-sm text-red-600 max-w-xs">{submitError}</span>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={cn(
                  'inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-white font-medium text-sm transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  activeCfg.btnBg,
                )}
              >
                {submitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Run <span className="text-white/80">→</span></>
                )}
              </button>
            </div>
          </div>

          {balance !== null && estimate && balance < minEst && (
            <p className="text-xs text-red-600 flex items-center gap-1.5 bg-red-50 px-3 py-2 rounded-lg">
              <span>⚠</span>
              Insufficient credits — you need {minEst} but have {balance}.{' '}
              <Link href="/settings?tab=credits" className="underline font-medium">Top up →</Link>
            </p>
          )}
        </div>

        {/* India Templates */}
        <TemplateGallery onSelect={(tmpl) => {
          setCategory(tmpl.category as TaskCategory);
          setPrompt(tmpl.prompt);
          if (debounceRef.current) clearTimeout(debounceRef.current);
          debounceRef.current = setTimeout(() => runEstimate(tmpl.prompt, tmpl.category), 400);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }} />

        {/* Recent Projects */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-indigo-700 flex items-center gap-2">⚡ Recent Projects</h2>
            <Link href="/task" className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
              View all →
            </Link>
          </div>

          {tasksLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl2 border border-surface-border p-5 space-y-3">
                  <Skeleton className="h-8 w-8" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-8 w-full mt-2" />
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="bg-white rounded-xl2 border-2 border-dashed border-slate-200 py-16 flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-3xl">
                🚀
              </div>
              <p className="font-semibold text-slate-700">Start your first project</p>
              <p className="text-sm text-slate-400 text-center max-w-xs">
                Describe what you want to build above and let AI agents do the work.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </section>

        {/* Repos Section */}
        <section className="pb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-violet-700 flex items-center gap-2">📦 Saved Repos</h2>
            <Link href="/repos" className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
              View all →
            </Link>
          </div>

          {reposLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl2 border border-surface-border p-4 flex items-center gap-4">
                  <Skeleton className="w-10 h-10 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : repos.length === 0 ? (
            <div className="bg-white rounded-xl2 border-2 border-dashed border-slate-200 py-12 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center text-2xl">
                📁
              </div>
              <p className="font-semibold text-slate-700">No repos yet</p>
              <p className="text-sm text-slate-400 text-center max-w-xs">
                Complete a code task and save it as a repo for version control.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {repos.map(repo => (
                <RepoRow key={repo.id} repo={repo} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task }: { task: any }) {
  const title = (task.prompt ?? '').split('\n')[0].slice(0, 72) || 'Untitled task';
  const credits = task.creditsActuallyUsed ?? task.creditsUsed ?? task.creditsEstimatedMax ?? '—';

  return (
    <div className="bg-white rounded-2xl shadow-card p-5 card-hover flex flex-col gap-3" style={{border: '1.5px solid #e0e7ff'}}>
      <div className="flex items-start justify-between gap-2">
        <CategoryIcon category={task.category} />
        <StatusBadge status={task.status} />
      </div>
      <p className="text-sm font-semibold text-slate-800 line-clamp-2 flex-1 leading-snug">{title}</p>
      <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>{task.createdAt ? formatDate(task.createdAt) : '—'}</span>
        <span className="text-indigo-600 font-semibold">{credits !== '—' ? `${credits} cr` : '—'}</span>
      </div>
      <Link
        href={`/task/${task.id}`}
        className="btn-primary text-xs py-1.5 text-center w-full"
      >
        Open →
      </Link>
    </div>
  );
}

// ─── Repo Row ─────────────────────────────────────────────────────────────────

function RepoRow({ repo }: { repo: any }) {
  const fileCount = Array.isArray(repo.files) ? repo.files.length : 0;
  return (
    <div className="bg-white rounded-2xl shadow-card px-5 py-4 flex items-center gap-4 card-hover" style={{border: '1.5px solid #ede9fe'}}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0" style={{background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)'}}>
        📦
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 truncate">{repo.name}</p>
        <p className="text-xs text-slate-400 truncate mt-0.5">
          {repo.description ?? 'No description'}{fileCount > 0 ? ` · ${fileCount} file${fileCount !== 1 ? 's' : ''}` : ''}
        </p>
      </div>
      <span className="text-xs text-slate-400 whitespace-nowrap hidden sm:block">
        {repo.updatedAt ? formatDate(repo.updatedAt) : ''}
      </span>
      <div className="flex gap-2 flex-shrink-0">
        <Link href={`/repos/${repo.id}`} className="btn-secondary text-xs py-1.5 px-3">Open</Link>
        <Link href={`/repos/${repo.id}?edit=1`} className="btn-secondary text-xs py-1.5 px-3 text-indigo-600">Edit</Link>
      </div>
    </div>
  );
}

// ─── India Templates ──────────────────────────────────────────────────────────

interface Template {
  icon: string;
  title: string;
  prompt: string;
  category: string;
  tag: string;
}

const INDIA_TEMPLATES: Template[] = [
  // Web Apps
  { icon: '🏪', title: 'Kirana Store App', prompt: 'Build a web app for a small kirana (grocery) store to manage inventory, track daily sales, generate GST bills, and send WhatsApp reminders to customers for pending dues.', category: 'code', tag: '🇮🇳 Retail' },
  { icon: '🎓', title: 'EdTech Platform', prompt: 'Build a React e-learning platform for Indian students with video lessons, quiz engine, progress tracking, certificate generation, and support for Hindi + English content.', category: 'code', tag: '📚 Education' },
  { icon: '🚜', title: 'Farmer Dashboard', prompt: 'Build a web dashboard for Indian farmers to track crop cycles, get weather alerts for their district, log harvest data, view mandi price trends, and connect with FPOs.', category: 'code', tag: '🌾 AgriTech' },
  { icon: '🏥', title: 'Clinic Management', prompt: 'Build a clinic management system for Indian doctors with patient registration (Aadhar-linked), appointment booking, prescription writer, OPD billing with GST, and medicine inventory.', category: 'code', tag: '💊 HealthTech' },
  { icon: '📦', title: 'Delivery Tracker', prompt: 'Build a last-mile delivery tracking web app for Indian logistics with order management, rider assignment, real-time map tracking, COD reconciliation, and customer SMS notifications via Twilio.', category: 'code', tag: '🚚 Logistics' },
  { icon: '🏠', title: 'PG/Rental Portal', prompt: 'Build a paying guest and rental property listing portal for Indian cities with property search by locality/BHK/budget, landlord verification badge, rent receipt generator, and tenant application form.', category: 'code', tag: '🏙️ PropTech' },
  { icon: '💰', title: 'Chit Fund Manager', prompt: 'Build a chit fund management app for Indian groups (chitty/committee) with member registration, monthly contribution tracking, auction winner selection, payment receipts, and default alerts.', category: 'code', tag: '💸 FinTech' },
  { icon: '🎭', title: 'Event Ticketing', prompt: 'Build an event ticketing platform for Indian concerts, poojas, and cultural events with QR code tickets, Razorpay payments, seat selection, and organiser dashboard.', category: 'code', tag: '🎪 Events' },
  { icon: '🍽️', title: 'Restaurant POS', prompt: 'Build a restaurant POS system for Indian restaurants with table management, digital menu (veg/non-veg toggle), KOT printing, GST billing, and daily sales report.', category: 'code', tag: '🍛 FoodTech' },
  { icon: '🛕', title: 'Temple Management', prompt: 'Build a temple management system with darshan slot booking, online prasad/donations (Razorpay), event calendar, priest schedule, and devotee database.', category: 'code', tag: '🙏 Community' },

  // Mobile
  { icon: '📱', title: 'UPI Expense Tracker', prompt: 'Build a React Native mobile app to track UPI/cash expenses with categories, monthly budget limits, spending charts, EMI reminders, and Bharat Bill Pay integration for utility bills.', category: 'mobile', tag: '📱 Mobile' },
  { icon: '🚌', title: 'KSRTC Bus Tracker', prompt: 'Build a React Native app to track state transport bus routes, show live bus location on map, schedule departure alerts, and support offline timetable browsing.', category: 'mobile', tag: '📱 Mobile' },

  // Agents
  { icon: '🤖', title: 'GST Filing Agent', prompt: 'Build a Python AI agent that reads GST invoices from a folder, extracts GSTIN/amounts/dates, categorises input tax credit vs output tax, and generates GSTR-1/GSTR-3B summary reports.', category: 'agent', tag: '🤖 Agent' },
  { icon: '📰', title: 'Hindi News Summariser', prompt: 'Build a Python agent that fetches top Hindi news from multiple sources (Dainik Bhaskar, Amar Ujala), summarises each article in 3 bullet points, translates to English, and emails a daily digest.', category: 'agent', tag: '🤖 Agent' },
  { icon: '🌾', title: 'Mandi Price Agent', prompt: 'Build a Python agent that fetches daily vegetable mandi prices from Agmarknet API, compares with previous week, identifies price spikes, and sends WhatsApp alerts via Twilio to farmers.', category: 'agent', tag: '🤖 Agent' },

  // Presentations
  { icon: '🎯', title: 'Startup Pitch Deck', prompt: 'Create a 12-slide Reveal.js investor pitch deck for an Indian agritech startup that uses AI to help farmers predict crop disease and connect with bulk buyers — include problem, solution, market size (India), business model, traction, and team slides.', category: 'presentation', tag: '🎯 Slides' },
  { icon: '📊', title: 'India Market Report', prompt: 'Create a professional Reveal.js presentation on the Indian D2C e-commerce market — trends, top players (Boat, Mamaearth, Sugar Cosmetics), growth drivers, challenges, and 2025 outlook with charts.', category: 'presentation', tag: '🎯 Slides' },
  { icon: '🏢', title: 'Company OKR Review', prompt: 'Create a quarterly OKR review presentation for a 50-person Indian SaaS startup with department-wise goal completion, key wins, missed targets, learnings, and Q3 planning slides.', category: 'presentation', tag: '🎯 Slides' },

  // Workflows
  { icon: '⚡', title: 'GST Invoice Workflow', prompt: 'Create an n8n workflow that monitors a Gmail inbox for invoice emails, extracts invoice data using regex, validates GSTIN format, creates a Google Sheet entry, and sends a Slack notification to the finance team.', category: 'workflow', tag: '⚡ Workflow' },
  { icon: '🔔', title: 'Customer Onboarding', prompt: 'Create an n8n workflow for customer onboarding: trigger on new Razorpay payment, create contact in CRM, send welcome email in the user\'s language (Hindi/Tamil/English), add to WhatsApp group via Twilio, and log in Notion.', category: 'workflow', tag: '⚡ Workflow' },

  // Research
  { icon: '🔍', title: 'India Startup Ecosystem', prompt: 'Research the Indian startup ecosystem in 2024-2025: funding trends by sector, top VC firms investing in India, unicorn pipeline, government initiatives (Startup India, PLI scheme), and comparison with China/Southeast Asia.', category: 'research', tag: '🔍 Research' },
  { icon: '📈', title: 'UPI Growth Analysis', prompt: 'Research UPI transaction growth from 2020-2025, monthly volume trends, top apps (PhonePe, GPay, Paytm), merchant adoption stats, cross-border UPI expansion, and RBI policy impact analysis.', category: 'research', tag: '🔍 Research' },
  { icon: '🌱', title: 'Green Energy India', prompt: 'Research India\'s renewable energy progress: solar/wind capacity milestones, state-wise targets, PM Surya Ghar scheme, EV adoption trends, and comparison with 2030 climate commitments.', category: 'research', tag: '🔍 Research' },

  // Content
  { icon: '📝', title: 'Diwali Marketing Blog', prompt: 'Write 5 engaging blog posts for a D2C brand\'s Diwali marketing campaign targeting urban Indian millennials — include gift guide, sustainability angle, regional traditions, discounting psychology, and social media tips.', category: 'content', tag: '✍️ Content' },
  { icon: '📧', title: 'LinkedIn Posts Pack', prompt: 'Write 10 LinkedIn posts for an Indian founder sharing startup journey, lessons from building in India, hiring challenges, fundraising experiences, and product launch stories — casual, authentic, insight-driven tone.', category: 'content', tag: '✍️ Content' },
];

const TEMPLATE_FILTER_CATS = ['all', 'code', 'mobile', 'agent', 'presentation', 'workflow', 'research', 'content'];

function TemplateGallery({ onSelect }: { onSelect: (t: Template) => void }) {
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(false);
  const filtered = INDIA_TEMPLATES.filter(t => filter === 'all' || t.category === filter);
  const shown = expanded ? filtered : filtered.slice(0, 6);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">🇮🇳 India Templates</h2>
        <div className="flex gap-1.5 flex-wrap justify-end">
          {TEMPLATE_FILTER_CATS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={cn(
                'px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all',
                filter === c ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              )}
            >
              {c === 'all' ? 'All' : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {shown.map(tmpl => (
          <button
            key={tmpl.title}
            type="button"
            onClick={() => onSelect(tmpl)}
            className="text-left bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{tmpl.icon}</span>
              <span className="text-[10px] font-semibold text-slate-400">{tmpl.tag}</span>
            </div>
            <p className="text-sm font-semibold text-slate-800 mb-1 group-hover:text-indigo-700 transition-colors">{tmpl.title}</p>
            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{tmpl.prompt}</p>
          </button>
        ))}
      </div>
      {filtered.length > 6 && (
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="mt-3 w-full py-2.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
        >
          {expanded ? 'Show less ↑' : `Show all ${filtered.length} templates ↓`}
        </button>
      )}
    </section>
  );
}
