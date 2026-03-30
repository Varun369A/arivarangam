'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import api, { getApiError } from '@/lib/api';
import { cn, formatDateTime, formatDate, formatCredits } from '@/lib/utils';
import type { TaskCategory, TaskStatus, StoredTaskEvent } from '@arivarangam/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminTask {
  id: string;
  userId: string;
  category: TaskCategory;
  status: TaskStatus;
  prompt: string;
  creditsEstimatedMin: number;
  creditsEstimatedMax: number;
  creditsActuallyUsed: number | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string };
  _count: { events: number };
}

interface TaskDetailData {
  task: AdminTask & {
    events: StoredTaskEvent[];
    repo: { id: string; name: string } | null;
    user: AdminTask['user'] & { tier: string };
  };
}

const STATUS_FILTERS = ['all', 'running', 'analyzing', 'pending', 'completed', 'failed', 'cancelled'] as const;
const CATEGORY_FILTERS: (TaskCategory | 'all')[] = ['all', 'code', 'research', 'image', 'content', 'mobile', 'presentation', 'agent', 'workflow'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function TaskStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    running: 'bg-indigo-100 text-indigo-700',
    analyzing: 'bg-violet-100 text-violet-700',
    pending: 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-100 text-slate-600',
  };
  return <span className={cn('badge capitalize', map[status] ?? 'bg-slate-100 text-slate-600')}>{status}</span>;
}

function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, string> = {
    code: 'bg-blue-100 text-blue-700',
    research: 'bg-indigo-100 text-indigo-700',
    image: 'bg-pink-100 text-pink-700',
    voice: 'bg-purple-100 text-purple-700',
    content: 'bg-teal-100 text-teal-700',
  };
  return <span className={cn('badge capitalize', map[category] ?? 'bg-slate-100 text-slate-600')}>{category}</span>;
}

function getDuration(task: AdminTask): string {
  if (!task.startedAt) return '—';
  const end = task.completedAt ? new Date(task.completedAt) : new Date();
  const secs = Math.floor((end.getTime() - new Date(task.startedAt).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function EventIcon({ type }: { type: string }) {
  const icons: Record<string, React.ReactNode> = {
    completed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
    error: <XCircle className="w-3.5 h-3.5 text-red-500" />,
    error_fixed: <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />,
    command_run: <Clock className="w-3.5 h-3.5 text-slate-400" />,
    file_created: <AlertCircle className="w-3.5 h-3.5 text-violet-400" />,
    file_updated: <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />,
    preview_ready: <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />,
    log: <Clock className="w-3.5 h-3.5 text-slate-300" />,
  };
  return <>{icons[type] ?? <Clock className="w-3.5 h-3.5 text-slate-300" />}</>;
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────

function TaskDetailModal({
  taskId,
  onClose,
  onKilled,
}: {
  taskId: string;
  onClose: () => void;
  onKilled: () => void;
}) {
  const [killing, setKilling] = useState(false);
  const [confirmKill, setConfirmKill] = useState(false);

  const { data, isLoading, error } = useQuery(
    ['admin-task-detail', taskId],
    () => api.get(`/admin/tasks/${taskId}`).then((r) => r.data.data as TaskDetailData),
    { refetchInterval: 5000 },
  );

  async function handleKill() {
    if (!confirmKill) { setConfirmKill(true); return; }
    setKilling(true);
    try {
      await api.delete(`/admin/tasks/${taskId}`);
      toast.success('Task killed and credits refunded.');
      onKilled();
      onClose();
    } catch (e) {
      toast.error(getApiError(e));
    } finally {
      setKilling(false);
      setConfirmKill(false);
    }
  }

  const task = data?.task;
  const isActive = task && ['running', 'analyzing', 'pending'].includes(task.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Task Detail</h3>
            <p className="text-xs text-slate-400 font-mono">{taskId}</p>
          </div>
          <div className="flex items-center gap-2">
            {isActive && (
              <button
                onClick={handleKill}
                disabled={killing}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  confirmKill
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-red-50 text-red-600 hover:bg-red-100',
                )}
              >
                {killing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                {confirmKill ? 'Confirm Kill' : 'Kill Task'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-slate-400 animate-pulse">
              Loading task details…
            </div>
          ) : error ? (
            <p className="text-sm text-red-600">{getApiError(error)}</p>
          ) : task ? (
            <>
              {/* Meta grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { label: 'User', value: task.user.email },
                  { label: 'Tier', value: task.user.tier },
                  { label: 'Status', value: <TaskStatusBadge status={task.status} /> },
                  { label: 'Category', value: <CategoryBadge category={task.category} /> },
                  { label: 'Duration', value: getDuration(task) },
                  {
                    label: 'Credits',
                    value: task.creditsActuallyUsed != null
                      ? `${formatCredits(task.creditsActuallyUsed)} used`
                      : `${formatCredits(task.creditsEstimatedMin)}–${formatCredits(task.creditsEstimatedMax)} est.`,
                  },
                  { label: 'Created', value: formatDateTime(task.createdAt) },
                  { label: 'Events', value: task.events.length },
                  task.repo ? { label: 'Repo', value: task.repo.name } : null,
                ].filter(Boolean).map((item) => (
                  <div key={item!.label} className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 mb-0.5">{item!.label}</p>
                    <div className="text-sm font-medium text-slate-800">{item!.value}</div>
                  </div>
                ))}
              </div>

              {/* Prompt */}
              <div>
                <p className="text-xs text-slate-500 mb-1 font-medium">Prompt</p>
                <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-700 whitespace-pre-wrap break-words">
                  {task.prompt}
                </div>
              </div>

              {/* Error */}
              {task.errorMessage && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs text-red-600 font-medium mb-0.5">Error</p>
                  <p className="text-sm text-red-700">{task.errorMessage}</p>
                </div>
              )}

              {/* Event Timeline */}
              <div>
                <p className="text-xs text-slate-500 mb-2 font-medium uppercase tracking-wide">
                  Event Timeline ({task.events.length})
                </p>
                {task.events.length === 0 ? (
                  <p className="text-xs text-slate-400">No events recorded</p>
                ) : (
                  <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
                    {task.events.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-start gap-3 bg-slate-50 rounded-xl px-3 py-2"
                      >
                        <EventIcon type={ev.type} />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-slate-700 capitalize">
                            {ev.type.replace(/_/g, ' ')}
                          </span>
                          {ev.data && (
                            <p className="text-xs text-slate-500 mt-0.5 break-words">
                              {typeof ev.data === 'string'
                                ? ev.data
                                : ev.data.message ?? ev.data.path ?? JSON.stringify(ev.data).slice(0, 120)}
                            </p>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 mt-0.5">
                          {new Date(ev.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminTasksPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>('all');
  const [categoryFilter, setCategoryFilter] = useState<TaskCategory | 'all'>('all');
  const [page, setPage] = useState(1);
  const [viewTaskId, setViewTaskId] = useState<string | null>(null);

  useEffect(() => { setPage(1); }, [statusFilter, categoryFilter]);

  const params = new URLSearchParams();
  params.set('page', page.toString());
  params.set('limit', '20');
  if (statusFilter !== 'all') params.set('status', statusFilter);
  if (categoryFilter !== 'all') params.set('category', categoryFilter);

  const isLive = statusFilter === 'all' || ['running', 'analyzing', 'pending'].includes(statusFilter);

  const { data, isLoading, isFetching } = useQuery(
    ['admin-tasks', page, statusFilter, categoryFilter],
    () =>
      api
        .get(`/admin/tasks?${params.toString()}`)
        .then(
          (r) => r.data.data as { tasks: AdminTask[]; total: number; totalPages: number },
        ),
    {
      keepPreviousData: true,
      refetchInterval: isLive ? 10_000 : false,
    },
  );

  const tasks = data?.tasks ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Task Monitor</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {data?.total ?? '—'} tasks
            {isLive && ' · auto-refresh 10s'}
          </p>
        </div>
        {isFetching && (
          <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status filters */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                statusFilter === s
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as TaskCategory | 'all')}
          className="input w-auto text-sm py-1.5"
        >
          {CATEGORY_FILTERS.map((c) => (
            <option key={c} value={c} className="capitalize">
              {c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-surface-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-slate-400 animate-pulse">
            Loading tasks…
          </div>
        ) : tasks.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            No tasks found.
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <span>User</span>
              <span>Category</span>
              <span>Status</span>
              <span>Credits</span>
              <span>Duration</span>
              <span>Created</span>
              <span>Actions</span>
            </div>

            <div className="divide-y divide-slate-50">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3.5 items-center hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{task.user.email}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5 max-w-xs">
                      {task.prompt.length > 55 ? task.prompt.slice(0, 55) + '…' : task.prompt}
                    </p>
                  </div>
                  <CategoryBadge category={task.category} />
                  <TaskStatusBadge status={task.status} />
                  <span className="text-sm font-medium text-indigo-700">
                    {task.creditsActuallyUsed != null
                      ? formatCredits(task.creditsActuallyUsed)
                      : `~${formatCredits(task.creditsEstimatedMax)}`}
                  </span>
                  <span className="text-sm text-slate-600">{getDuration(task)}</span>
                  <span className="text-xs text-slate-500">{formatDate(task.createdAt)}</span>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setViewTaskId(task.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-medium transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                    {['running', 'analyzing', 'pending'].includes(task.status) && (
                      <button
                        onClick={() => setViewTaskId(task.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Kill
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Page {page} of {totalPages} · {data?.total ?? 0} tasks
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || isFetching}
              className="btn-secondary py-1.5 px-3 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const n = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              return (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={cn(
                    'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                    n === page
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100',
                  )}
                >
                  {n}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isFetching}
              className="btn-secondary py-1.5 px-3 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {viewTaskId && (
        <TaskDetailModal
          taskId={viewTaskId}
          onClose={() => setViewTaskId(null)}
          onKilled={() => {
            setViewTaskId(null);
            qc.invalidateQueries(['admin-tasks']);
          }}
        />
      )}
    </div>
  );
}
