'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { useTaskStream, type TaskEvent, type TaskStreamFile } from '@/hooks/useTaskStream';
import { tasksApi, reposApi, getApiError, type Task } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function elapsed(start?: string | null, end?: string | null): string {
  if (!start) return '—';
  const ms = new Date(end ?? new Date()).getTime() - new Date(start).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function categoryLabel(cat: string): string {
  return (
    { code: 'Code', research: 'Research', image: 'Image', voice: 'Voice', content: 'Content' }[cat] ?? cat
  );
}

// ─── Activity Event Row ───────────────────────────────────────────────────────

function EventRow({ event }: { event: TaskEvent }) {
  const [expanded, setExpanded] = useState(false);

  if (event.type === 'connected' || event.type === 'stream_end') return null;

  type EventCfg = { icon: string; iconCls: string; textCls: string };
  const cfgMap: Record<string, EventCfg> = {
    file_created:  { icon: '✓', iconCls: 'text-emerald-500', textCls: 'text-slate-700' },
    file_updated:  { icon: '✎', iconCls: 'text-blue-500',    textCls: 'text-slate-700' },
    file_deleted:  { icon: '✗', iconCls: 'text-slate-400',   textCls: 'text-slate-500' },
    command_run:   { icon: '▶', iconCls: 'text-blue-500',    textCls: 'text-slate-700' },
    error:         { icon: '✗', iconCls: 'text-red-500',     textCls: 'text-red-700' },
    error_fixed:   { icon: '🔧', iconCls: 'text-orange-500', textCls: 'text-orange-700' },
    log:           { icon: '·', iconCls: 'text-slate-400',   textCls: 'text-slate-500' },
    preview_ready: { icon: '🎉', iconCls: 'text-indigo-500', textCls: 'text-indigo-700' },
    completed:     { icon: '✓', iconCls: 'text-emerald-600', textCls: 'text-emerald-700' },
    cancelled:     { icon: '—', iconCls: 'text-slate-400',   textCls: 'text-slate-500' },
  };

  const cfg: EventCfg = cfgMap[event.type] ?? { icon: '·', iconCls: 'text-slate-400', textCls: 'text-slate-500' };
  const d = event.data ?? {};

  const content = () => {
    switch (event.type) {
      case 'file_created':
        return <span>Created <code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono">{String(d.path ?? '—')}</code></span>;
      case 'file_updated':
        return <span>Updated <code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono">{String(d.path ?? '—')}</code></span>;
      case 'file_deleted':
        return <span>Deleted <code className="text-xs bg-slate-100 px-1 py-0.5 rounded font-mono">{String(d.path ?? '—')}</code></span>;
      case 'command_run':
        return (
          <span className="font-mono text-xs">
            <span className="text-blue-400 mr-1">$</span>
            {String(d.command ?? d.cmd ?? JSON.stringify(d))}
          </span>
        );
      case 'error':
        return (
          <span>
            <span>{String(d.message ?? d.error ?? 'An error occurred')}</span>
            {(d.snippet || d.details) && (
              <>
                {' '}
                <button
                  type="button"
                  className="text-xs underline text-red-500"
                  onClick={() => setExpanded(e => !e)}
                >
                  {expanded ? 'hide' : 'details'}
                </button>
                {expanded && (
                  <pre className="mt-2 text-xs bg-red-50 border border-red-100 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                    {String(d.snippet ?? d.details)}
                  </pre>
                )}
              </>
            )}
          </span>
        );
      case 'error_fixed':
        return <span>Fixed: <code className="text-xs bg-orange-50 px-1 py-0.5 rounded font-mono">{String(d.file ?? d.path ?? '—')}</code></span>;
      case 'preview_ready':
        return <span className="font-medium">Preview is ready!</span>;
      case 'completed':
        return <span className="font-medium">{String(d.summary ?? d.message ?? 'Task completed!')}</span>;
      case 'cancelled':
        return <span>Task cancelled</span>;
      default:
        return <span className="text-xs">{String(d.message ?? d.log ?? JSON.stringify(d))}</span>;
    }
  };

  return (
    <div className={cn('flex items-start gap-2.5 py-1.5 text-sm min-w-0', cfg.textCls)}>
      <span className={cn('font-bold flex-shrink-0 w-4 text-center mt-0.5 text-base', cfg.iconCls)}>{cfg.icon}</span>
      <span className="flex-1 leading-snug break-words min-w-0">{content()}</span>
    </div>
  );
}

// ─── File Tree ────────────────────────────────────────────────────────────────

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function buildTree(files: TaskStreamFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  const dirs = new Map<string, TreeNode>();

  const getOrCreateDir = (parts: string[], index: number): TreeNode[] => {
    if (index === 0) return root;
    const dirPath = parts.slice(0, index).join('/');
    if (!dirs.has(dirPath)) {
      const node: TreeNode = { name: parts[index - 1], path: dirPath, isDir: true, children: [] };
      dirs.set(dirPath, node);
      getOrCreateDir(parts, index - 1).push(node);
    }
    return dirs.get(dirPath)!.children;
  };

  for (const file of files) {
    const parts = file.path.replace(/^\//, '').split('/');
    const parent = getOrCreateDir(parts, parts.length - 1);
    parent.push({ name: parts[parts.length - 1], path: file.path, isDir: false, children: [] });
  }

  return root;
}

function FileTreeNode({
  node,
  depth,
  onSelect,
  selectedPath,
}: {
  node: TreeNode;
  depth: number;
  onSelect: (path: string) => void;
  selectedPath: string | null;
}) {
  const [open, setOpen] = useState(true);

  if (node.isDir) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 w-full text-left py-1 hover:bg-slate-50 rounded text-xs text-slate-500 font-medium"
          style={{ paddingLeft: 8 + depth * 14 }}
        >
          <span className="text-slate-400 w-3">{open ? '▾' : '▸'}</span>
          <span>📁</span>
          <span className="truncate">{node.name}/</span>
        </button>
        {open && node.children.map(child => (
          <FileTreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            onSelect={onSelect}
            selectedPath={selectedPath}
          />
        ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(node.path)}
      className={cn(
        'flex items-center gap-1.5 w-full text-left py-1 rounded text-xs transition-colors',
        selectedPath === node.path
          ? 'bg-indigo-50 text-indigo-700 font-medium'
          : 'text-slate-600 hover:bg-slate-50',
      )}
      style={{ paddingLeft: 8 + depth * 14 }}
    >
      <span>📄</span>
      <span className="truncate">{node.name}</span>
    </button>
  );
}

function FileTree({
  files,
  onSelect,
  selectedPath,
}: {
  files: TaskStreamFile[];
  onSelect: (path: string) => void;
  selectedPath: string | null;
}) {
  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-slate-400 px-3">
        <div className="text-2xl mb-2">📂</div>
        Files will appear here as they're created
      </div>
    );
  }
  const tree = buildTree(files);
  return (
    <div className="space-y-0.5 px-1">
      {tree.map(node => (
        <FileTreeNode key={node.path} node={node} depth={0} onSelect={onSelect} selectedPath={selectedPath} />
      ))}
    </div>
  );
}

// ─── Preview Panel ────────────────────────────────────────────────────────────

function PreviewPanel({
  task,
  previewUrl,
}: {
  task: Task | null;
  previewUrl: string | null;
}) {
  if (!task) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-400 rounded-full animate-spin" />
      </div>
    );
  }

  const category = task.category;

  if (category === 'code') {
    const url = previewUrl ?? task.previewUrl;
    if (!url) {
      const isComplete = task.status === 'done' || task.status === 'completed' as any;
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 p-6">
          <div className={cn(
            'w-16 h-16 rounded-2xl flex items-center justify-center text-3xl',
            isComplete ? 'bg-emerald-50' : 'bg-slate-50 animate-pulse-soft',
          )}>
            {isComplete ? '✓' : '🖥️'}
          </div>
          <p className={cn('text-sm font-medium', isComplete ? 'text-emerald-600' : 'text-slate-500')}>
            {isComplete ? 'Task completed' : 'Booting preview...'}
          </p>
          {!isComplete && <p className="text-xs text-slate-400">The live preview will appear once ready</p>}
        </div>
      );
    }
    return (
      <iframe
        src={url}
        className="w-full h-full border-0 bg-white"
        title="Live Preview"
        sandbox="allow-scripts allow-same-origin allow-forms"
      />
    );
  }

  if (category === 'image') {
    const imageUrl = (task as any).metadata?.imageUrl;
    if (!imageUrl) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center text-3xl animate-pulse-soft">
            🎨
          </div>
          <p className="text-sm text-slate-500">Generating image...</p>
        </div>
      );
    }
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Generated"
          className="max-w-full max-h-full rounded-xl border border-surface-border shadow-card object-contain"
        />
      </div>
    );
  }

  if (category === 'research') {
    const report = (task as any).metadata?.report;
    if (!report) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center text-3xl animate-pulse-soft">
            🔍
          </div>
          <p className="text-sm text-slate-500">Researching...</p>
        </div>
      );
    }
    return (
      <div className="flex-1 overflow-y-auto p-5">
        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">{report}</pre>
      </div>
    );
  }

  if (category === 'voice') {
    const audioUrl = (task as any).metadata?.audioUrl;
    if (!audioUrl) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
          <div className="w-16 h-16 rounded-2xl bg-pink-50 flex items-center justify-center text-3xl animate-pulse-soft">
            🎙️
          </div>
          <p className="text-sm text-slate-500">Generating audio...</p>
        </div>
      );
    }
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-20 h-20 rounded-full bg-pink-50 flex items-center justify-center text-4xl">
          🎙️
        </div>
        <p className="text-sm font-medium text-slate-700">Audio ready</p>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio controls src={audioUrl} className="w-full max-w-sm" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
      No preview for this task type
    </div>
  );
}

// ─── Credit Confirmation Modal ────────────────────────────────────────────────

function CreditConfirmModal({
  task,
  balance,
  onConfirm,
  onCancel,
  confirming,
}: {
  task: Task;
  balance: number | undefined;
  onConfirm: () => void;
  onCancel: () => void;
  confirming: boolean;
}) {
  const estMin = (task as any).creditsEstimatedMin ?? 0;
  const estMax = (task as any).creditsEstimatedMax ?? estMin;
  const insufficient = balance !== undefined && balance < estMin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-xl2 border border-surface-border shadow-glow p-6 w-full max-w-sm space-y-4 z-10">
        <h2 className="text-lg font-semibold text-slate-900">Estimated Cost</h2>

        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-5 text-center border border-indigo-100">
          <p className="text-4xl font-bold text-indigo-700">
            ~{estMin}–{estMax}
          </p>
          <p className="text-sm text-indigo-500 mt-1 font-medium">credits</p>
        </div>

        {balance !== undefined && (
          <p className="text-sm text-slate-600 text-center">
            Your balance:{' '}
            <span className={cn('font-semibold', insufficient ? 'text-red-600' : 'text-slate-800')}>
              {balance} credits
            </span>
          </p>
        )}

        <div className="space-y-2">
          <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2.5 border border-amber-100">
            <span className="mt-0.5">⚠</span>
            <span>Actual usage may vary ±20% based on task complexity</span>
          </div>
          <p className="text-xs text-slate-400 text-center">
            Credits are reserved upfront and adjusted after completion.
          </p>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary flex-1"
            disabled={confirming}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming || insufficient}
            className="btn-primary flex-1"
          >
            {confirming ? (
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              'Confirm & Start →'
            )}
          </button>
        </div>

        {insufficient && (
          <p className="text-xs text-red-600 text-center">
            Insufficient credits.{' '}
            <Link href="/credits" className="underline font-medium">Top up →</Link>
          </p>
        )}
      </div>
    </div>
  );
}

// ─── More Menu ────────────────────────────────────────────────────────────────

function MoreMenu({ onDownload }: { onDownload: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="btn-secondary px-2.5 py-1.5 text-sm"
        title="More options"
      >
        ···
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-surface-border rounded-xl shadow-card py-1 z-30 w-44">
          <button
            type="button"
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            onClick={() => { onDownload(); setOpen(false); }}
          >
            Download files
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TaskPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const taskId = params.id;

  const { user } = useAuth();
  const { balance } = useCredits();
  const _ = user; // suppress unused warning

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Confirmation state
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Selected file
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  // Follow-up
  const [followUp, setFollowUp] = useState('');
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);

  // Cancel / save
  const [cancelling, setCancelling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedRepo, setSavedRepo] = useState<{ id: string; name: string } | null>(null);

  // Determine if stream should be active
  const isTerminalStatus = (s: string) => ['done', 'completed', 'failed', 'cancelled'].includes(s);
  const streamActive = task !== null && confirmed;
  const { events, status: streamStatus, previewUrl, files: streamFiles, isConnected, isComplete } =
    useTaskStream(streamActive ? taskId : null);

  const activityEndRef = useRef<HTMLDivElement>(null);

  // Load task
  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    tasksApi.get(taskId)
      .then(t => {
        setTask(t as any);
        const status = (t as any).status ?? '';
        if (['running', 'analyzing', 'done', 'completed', 'failed', 'cancelled'].includes(status)) {
          setConfirmed(true);
        } else if (status === 'pending' || status === 'queued') {
          setShowConfirm(true);
        } else {
          setConfirmed(true);
        }
      })
      .catch(() => setLoadError('Task not found or access denied'))
      .finally(() => setLoading(false));
  }, [taskId]);

  // Update task status from stream
  useEffect(() => {
    if (!streamStatus || !task) return;
    setTask(prev => prev ? { ...prev, status: streamStatus } as any : prev);
  }, [streamStatus, task]);

  // Reload task when stream ends
  useEffect(() => {
    if (!isComplete || !taskId) return;
    tasksApi.get(taskId)
      .then(t => setTask(t as any))
      .catch(() => {});
  }, [isComplete, taskId]);

  // Auto-scroll activity
  useEffect(() => {
    activityEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const handleConfirm = useCallback(() => {
    setConfirming(true);
    // Server already started the task on creation. Just open the stream.
    setShowConfirm(false);
    setConfirmed(true);
    setConfirming(false);
  }, []);

  const handleModalCancel = useCallback(async () => {
    if (!task) return;
    const status = (task as any).status ?? '';
    if (!isTerminalStatus(status)) {
      setCancelling(true);
      try {
        await tasksApi.cancel(task.id);
      } catch {
        // ignore
      } finally {
        setCancelling(false);
      }
    }
    router.push('/dashboard');
  }, [task, router]);

  const handleCancelTask = useCallback(async () => {
    if (!task) return;
    setCancelling(true);
    try {
      await tasksApi.cancel(task.id);
      setTask(prev => prev ? { ...prev, status: 'cancelled' } as any : prev);
    } catch {
      // ignore
    } finally {
      setCancelling(false);
    }
  }, [task]);

  const handleFollowUp = useCallback(async () => {
    if (!task || !followUp.trim()) return;
    setFollowUpSubmitting(true);
    setFollowUpError(null);
    try {
      const newTask = await tasksApi.followUp(task.id, followUp.trim());
      router.push(`/task/${(newTask as any).id}`);
    } catch (err) {
      setFollowUpError(getApiError(err));
    } finally {
      setFollowUpSubmitting(false);
    }
  }, [task, followUp, router]);

  const handleSaveRepo = useCallback(async () => {
    if (!task) return;
    const repoName = (task as any).prompt.split('\n')[0]
      .slice(0, 50)
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase() || 'my-project';
    setSaving(true);
    try {
      const repo = await reposApi.create({ name: repoName, isPublic: false });
      setSavedRepo({ id: (repo as any).id, name: (repo as any).name });
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  }, [task]);

  const handleDownload = useCallback(() => {
    if (!streamFiles.length) return;
    const blob = new Blob([JSON.stringify(streamFiles, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-${taskId}-files.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [streamFiles, taskId]);

  const taskStatus = (task as any)?.status ?? '';
  const isRunning = !isTerminalStatus(taskStatus) && confirmed;
  const isCompleted = taskStatus === 'done' || taskStatus === 'completed';
  const isCodeTask = task?.category === 'code';

  const statusColorMap: Record<string, string> = {
    pending:   'text-slate-500',
    queued:    'text-slate-500',
    analyzing: 'text-purple-600',
    running:   'text-blue-600',
    done:      'text-emerald-600',
    completed: 'text-emerald-600',
    failed:    'text-red-600',
    cancelled: 'text-slate-400',
  };

  const statusDotMap: Record<string, string> = {
    pending:   'bg-slate-400',
    queued:    'bg-slate-400',
    analyzing: 'bg-purple-500 animate-pulse',
    running:   'bg-blue-500 animate-pulse',
    done:      'bg-emerald-500',
    completed: 'bg-emerald-500',
    failed:    'bg-red-500',
    cancelled: 'bg-slate-400',
  };

  const statusLabel = (s: string) =>
    ({ pending: 'Pending', queued: 'Queued', analyzing: 'Analyzing', running: 'Running', done: 'Completed', completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled' }[s] ?? s);

  const selectedFile = streamFiles.find(f => f.path === selectedFilePath) ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading task...</p>
        </div>
      </div>
    );
  }

  if (loadError || !task) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-slate-800 font-medium">{loadError ?? 'Task not found'}</p>
          <Link href="/dashboard" className="btn-primary">← Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-surface">
      {/* Confirmation Modal */}
      {showConfirm && (
        <CreditConfirmModal
          task={task}
          balance={balance}
          onConfirm={handleConfirm}
          onCancel={handleModalCancel}
          confirming={confirming}
        />
      )}

      {/* Header */}
      <div className="bg-white border-b border-surface-border px-4 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <Link
          href="/dashboard"
          className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
          aria-label="Back to dashboard"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>

        <div className="flex-1 flex items-center gap-2 min-w-0 overflow-hidden">
          <p className="font-semibold text-slate-800 truncate text-sm max-w-xs">
            {String((task as any).prompt ?? '').split('\n')[0].slice(0, 60)}
          </p>
          <span className="text-slate-200 hidden sm:block">•</span>
          <span className="text-xs text-slate-500 flex-shrink-0 hidden sm:block">
            {categoryLabel(task.category)}
          </span>
          <span className="text-slate-200 hidden sm:block">•</span>
          <span className={cn('flex items-center gap-1.5 text-xs font-medium flex-shrink-0 hidden sm:flex', statusColorMap[taskStatus])}>
            <span className={cn('w-2 h-2 rounded-full', statusDotMap[taskStatus])} />
            {statusLabel(taskStatus)}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isRunning && (
            <button
              type="button"
              onClick={handleCancelTask}
              disabled={cancelling}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              {cancelling ? '...' : 'Cancel'}
            </button>
          )}
          <MoreMenu onDownload={handleDownload} />
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Panel 1 — Files */}
        <div className="w-52 flex-shrink-0 border-r border-surface-border bg-white flex flex-col overflow-hidden">
          <div className="px-3 pt-3 pb-2 border-b border-surface-border flex-shrink-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Files</p>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            <FileTree
              files={streamFiles}
              onSelect={setSelectedFilePath}
              selectedPath={selectedFilePath}
            />
          </div>

          {/* Inline file content */}
          {selectedFile && (
            <div className="border-t border-surface-border flex-shrink-0 max-h-64 flex flex-col">
              <div className="px-3 py-2 flex items-center justify-between flex-shrink-0 border-b border-surface-border">
                <p className="text-xs font-medium text-slate-600 truncate min-w-0">{selectedFile.path}</p>
                <button
                  type="button"
                  onClick={() => setSelectedFilePath(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs ml-1 flex-shrink-0"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-auto flex-1">
                <pre className="text-xs font-mono text-slate-700 p-3 leading-relaxed whitespace-pre">
                  {selectedFile.content || '(empty)'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Panel 2 — Activity */}
        <div className="w-72 flex-shrink-0 border-r border-surface-border bg-white flex flex-col overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-surface-border flex items-center justify-between flex-shrink-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Activity</p>
            {isConnected && (
              <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                Live
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {events.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-400 rounded-full animate-spin" />
                <p className="text-xs text-center">
                  {confirmed ? 'Waiting for events...' : 'Waiting for confirmation...'}
                </p>
              </div>
            )}
            {events.map((evt, i) => (
              <EventRow key={i} event={evt} />
            ))}
            <div ref={activityEndRef} />
          </div>
        </div>

        {/* Panel 3 — Preview */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
          <div className="px-4 pt-3 pb-2 border-b border-surface-border bg-white flex items-center justify-between flex-shrink-0">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Preview</p>
            <div className="flex items-center gap-3">
              {isCodeTask && isCompleted && !savedRepo && (
                <button
                  type="button"
                  onClick={handleSaveRepo}
                  disabled={saving}
                  className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? (
                    <span className="inline-block w-3.5 h-3.5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  ) : '💾'}
                  Save to Repos
                </button>
              )}
              {savedRepo && (
                <Link
                  href={`/repos/${savedRepo.id}`}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors"
                >
                  ✓ Saved → {savedRepo.name}
                </Link>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-hidden flex">
            <PreviewPanel task={task} previewUrl={previewUrl} />
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-white border-t border-surface-border px-4 sm:px-6 py-3 flex-shrink-0 space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={followUp}
            onChange={e => setFollowUp(e.target.value)}
            placeholder={
              isCompleted
                ? 'Add authentication / make it dark mode / refactor...'
                : 'Follow-up available after task completes...'
            }
            disabled={!isCompleted || followUpSubmitting}
            className="input flex-1 text-sm disabled:bg-slate-50 disabled:text-slate-400"
            onKeyDown={e => { if (e.key === 'Enter') handleFollowUp(); }}
          />
          <button
            type="button"
            onClick={handleFollowUp}
            disabled={!isCompleted || !followUp.trim() || followUpSubmitting}
            className="btn-primary px-3 py-2"
          >
            {followUpSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <span>→</span>
            )}
          </button>
        </div>

        {followUpError && (
          <p className="text-xs text-red-600">{followUpError}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
          {(task as any).creditsActuallyUsed != null ? (
            <span>
              Credits used:{' '}
              <span className="font-medium text-slate-600">{(task as any).creditsActuallyUsed}</span>
            </span>
          ) : (
            <span>
              Est. cost:{' '}
              <span className="font-medium text-slate-600">
                ~{(task as any).creditsEstimatedMin ?? 0}–{(task as any).creditsEstimatedMax ?? 0}
              </span>
            </span>
          )}
          <span className="text-slate-200">|</span>
          <span>
            Time:{' '}
            <span className="font-medium text-slate-600">
              {elapsed((task as any).startedAt, (task as any).completedAt)}
            </span>
          </span>
          <span className="text-slate-200">|</span>
          <span>Created {formatDate((task as any).createdAt)}</span>
        </div>
      </div>
    </div>
  );
}
