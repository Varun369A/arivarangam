'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  ExternalLink,
  Activity,
  Users,
  DollarSign,
  IndianRupee,
  ListTodo,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Cpu,
} from 'lucide-react';
import { useQuery, useQueryClient } from 'react-query';
import api, { getApiError } from '@/lib/api';
import { cn, formatINR, formatDateTime, formatCredits } from '@/lib/utils';
import type {
  AdminHealthStatus,
  AdminRevenueStats,
  Task,
  PlatformLog,
  SecurityEvent,
} from '@arivarangam/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminTask extends Task {
  user: { id: string; email: string; name: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full',
        status === 'ok' || status === 'healthy' ? 'bg-emerald-500' :
        status === 'degraded' || status === 'unknown' ? 'bg-amber-500' :
        'bg-red-500',
      )}
    />
  );
}

function getRunningDuration(startedAt: string | null): string {
  if (!startedAt) return '—';
  const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  return `${Math.floor(secs / 60)}m ${secs % 60}s`;
}

function TaskStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    running: 'bg-indigo-100 text-indigo-700',
    analyzing: 'bg-violet-100 text-violet-700',
    pending: 'bg-amber-100 text-amber-700',
    completed: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={cn('badge capitalize', map[status] ?? 'bg-slate-100 text-slate-600')}>
      {status}
    </span>
  );
}

function SeverityDot({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    LOW: 'bg-slate-400',
    MEDIUM: 'bg-amber-400',
    HIGH: 'bg-orange-500',
    CRITICAL: 'bg-red-600',
  };
  return (
    <span
      className={cn(
        'mt-0.5 inline-block w-2 h-2 rounded-full shrink-0',
        map[severity] ?? 'bg-slate-300',
      )}
    />
  );
}

function LogStatusBadge({ approved }: { approved: boolean }) {
  return approved ? (
    <span className="badge bg-emerald-100 text-emerald-700">Applied</span>
  ) : (
    <span className="badge bg-amber-100 text-amber-700">Pending</span>
  );
}

// ─── Kill Modal ───────────────────────────────────────────────────────────────

function KillConfirmModal({
  task,
  onClose,
  onKilled,
}: {
  task: AdminTask;
  onClose: () => void;
  onKilled: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleKill() {
    setLoading(true);
    setError('');
    try {
      await api.delete(`/admin/tasks/${task.id}`);
      onKilled();
      onClose();
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-semibold text-slate-900 mb-1">Kill Task?</h3>
        <p className="text-sm text-slate-600 mb-4">
          This will force-fail the{' '}
          <span className="font-medium capitalize">{task.category}</span> task by{' '}
          <span className="font-medium">{task.user.email}</span> and refund reserved credits.
        </p>
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary text-sm">
            Cancel
          </button>
          <button
            onClick={handleKill}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-600 text-white font-medium text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Killing…' : 'Kill & Refund'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminOverviewPage() {
  const qc = useQueryClient();
  const [killTarget, setKillTarget] = useState<AdminTask | null>(null);

  const healthQ = useQuery(
    ['admin-health'],
    () => api.get('/admin/platform/health').then((r) => r.data.data as AdminHealthStatus),
    { refetchInterval: 30_000 },
  );

  const tasksQ = useQuery(
    ['admin-live-tasks'],
    () =>
      api
        .get('/admin/tasks?limit=10&status=running')
        .then((r) => r.data.data as { tasks: AdminTask[]; total: number }),
    { refetchInterval: 30_000 },
  );

  const revenueQ = useQuery(
    ['admin-revenue'],
    () => api.get('/admin/billing/revenue').then((r) => r.data.data as AdminRevenueStats),
    { refetchInterval: 60_000 },
  );

  const logsQ = useQuery(
    ['admin-logs-recent'],
    () =>
      api
        .get('/admin/platform/logs?limit=5')
        .then((r) => r.data.data as { logs: PlatformLog[]; total: number }),
    { refetchInterval: 60_000 },
  );

  const securityQ = useQuery(
    ['admin-security-recent'],
    () =>
      api
        .get('/admin/security/events?limit=10&resolved=false')
        .then((r) => r.data.data as { events: SecurityEvent[]; total: number })
        .catch(() => ({ events: [] as SecurityEvent[], total: 0 })),
    { refetchInterval: 30_000 },
  );

  function refreshAll() {
    qc.invalidateQueries(['admin-health']);
    qc.invalidateQueries(['admin-live-tasks']);
    qc.invalidateQueries(['admin-revenue']);
    qc.invalidateQueries(['admin-logs-recent']);
    qc.invalidateQueries(['admin-security-recent']);
  }

  const health = healthQ.data;
  const tasksData = tasksQ.data;
  const revenue = revenueQ.data;
  const logsData = logsQ.data;
  const securityData = securityQ.data;

  const isLoading = healthQ.isLoading && tasksQ.isLoading && revenueQ.isLoading;
  const runningTasks = tasksData?.tasks ?? [];
  const estimatedCostPerHr = health ? (health.activeTasks * 0.002).toFixed(2) : '—';

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-8 w-64 bg-slate-200 rounded-lg" />
        <div className="grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            ARRIVARANGAM ADMIN
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Auto-refresh every 30s
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refreshAll}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            View Site
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Active Tasks"
          value={health ? health.activeTasks.toString() : '—'}
          sub="running now"
          icon={<Activity className="w-4 h-4" />}
          accent="indigo"
        />
        <StatCard
          label="Users Today"
          value="—"
          sub="new signups"
          icon={<Users className="w-4 h-4" />}
          accent="violet"
        />
        <StatCard
          label="API Cost"
          value={`$${estimatedCostPerHr}/hr`}
          sub="estimated"
          icon={<DollarSign className="w-4 h-4" />}
          accent="amber"
        />
        <StatCard
          label="Revenue"
          value={revenue ? formatINR(revenue.today) : '—'}
          sub="today"
          icon={<IndianRupee className="w-4 h-4" />}
          accent="emerald"
        />
        <StatCard
          label="Tasks Today"
          value={tasksData ? tasksData.total.toString() : '—'}
          sub="all statuses"
          icon={<ListTodo className="w-4 h-4" />}
          accent="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Tasks */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-surface-border shadow-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse-soft inline-block" />
              LIVE TASKS
            </h2>
            <Link href="/admin/tasks" className="text-xs text-indigo-600 hover:text-indigo-800">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-slate-50">
            {runningTasks.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">
                No active tasks right now
              </div>
            ) : (
              runningTasks.map((task) => (
                <LiveTaskRow
                  key={task.id}
                  task={task}
                  onKill={() => setKillTarget(task)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Model Health */}
          <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-slate-400" />
              MODEL HEALTH
            </h2>
            {health ? (
              <div className="space-y-2">
                {[
                  { name: 'Claude', info: health.models.claude },
                  { name: 'OpenAI', info: health.models.openai },
                  { name: 'Perplexity', info: health.models.perplexity },
                  { name: 'ElevenLabs', info: health.models.elevenlabs },
                ].map(({ name, info }) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-slate-700">
                      <StatusDot status={info.status} />
                      {name}
                    </span>
                    <div className="flex items-center gap-2">
                      {info.latencyMs != null && (
                        <span className="text-xs text-slate-400">{info.latencyMs}ms</span>
                      )}
                      <span
                        className={cn(
                          'text-xs font-medium',
                          info.status === 'ok' ? 'text-emerald-600' :
                          info.status === 'unknown' ? 'text-amber-600' :
                          'text-red-600',
                        )}
                      >
                        {info.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-slate-100 flex gap-4 text-xs text-slate-500">
                  <span>
                    Redis:{' '}
                    <span className={cn('font-medium', health.redis.status === 'ok' ? 'text-emerald-600' : 'text-red-600')}>
                      {health.redis.status}
                    </span>
                  </span>
                  <span>
                    DB:{' '}
                    <span className={cn('font-medium', health.database.status === 'ok' ? 'text-emerald-600' : 'text-red-600')}>
                      {health.database.status}
                    </span>
                  </span>
                  <span>
                    Err rate:{' '}
                    <span className="font-medium text-slate-700">
                      {health.errorRateLast1h.toFixed(1)}%
                    </span>
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400">Loading…</p>
            )}
          </div>

          {/* Security Alerts */}
          <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-800">SECURITY ALERTS (24h)</h2>
              <Link href="/admin/security" className="text-xs text-indigo-600 hover:text-indigo-800">
                View all →
              </Link>
            </div>
            {(securityData?.events ?? []).length === 0 ? (
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                No unresolved alerts
              </p>
            ) : (
              <div className="space-y-2">
                {(securityData?.events ?? []).slice(0, 4).map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2">
                    <SeverityDot severity={ev.severity} />
                    <p className="text-xs text-slate-600 leading-snug line-clamp-2">
                      {ev.description}
                    </p>
                  </div>
                ))}
                {(securityData?.total ?? 0) > 4 && (
                  <Link
                    href="/admin/security"
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    +{(securityData?.total ?? 0) - 4} more →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Self-Improve Queue */}
      <div className="bg-white rounded-2xl border border-surface-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-800">SELF-IMPROVE QUEUE</h2>
          <Link href="/admin/platform" className="text-xs text-indigo-600 hover:text-indigo-800">
            Manage →
          </Link>
        </div>
        <div className="divide-y divide-slate-50">
          {(logsData?.logs ?? []).length === 0 ? (
            <div className="px-5 py-6 text-sm text-center text-slate-400">
              No recent platform logs
            </div>
          ) : (
            (logsData?.logs ?? []).map((log) => (
              <div key={log.id} className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                <LogStatusBadge approved={log.approved} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{log.title}</p>
                  <p className="text-xs text-slate-500 truncate">{log.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {log.approvedAt && (
                    <span className="text-xs text-slate-400">{formatDateTime(log.approvedAt)}</span>
                  )}
                  <Link
                    href={`/admin/platform?tab=improvements`}
                    className="text-xs text-indigo-600 hover:underline font-medium"
                  >
                    {log.approved ? 'View' : 'Review'}
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Kill Modal */}
      {killTarget && (
        <KillConfirmModal
          task={killTarget}
          onClose={() => setKillTarget(null)}
          onKilled={refreshAll}
        />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accent: 'indigo' | 'violet' | 'purple' | 'amber' | 'emerald';
}) {
  const iconMap = {
    indigo: 'text-indigo-600 bg-indigo-50',
    violet: 'text-violet-600 bg-violet-50',
    purple: 'text-purple-600 bg-purple-50',
    amber: 'text-amber-600 bg-amber-50',
    emerald: 'text-emerald-600 bg-emerald-50',
  };
  const valueMap = {
    indigo: 'text-indigo-700',
    violet: 'text-violet-700',
    purple: 'text-purple-700',
    amber: 'text-amber-700',
    emerald: 'text-emerald-700',
  };
  return (
    <div className="bg-white rounded-2xl border border-surface-border shadow-card p-4">
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', iconMap[accent])}>
        {icon}
      </div>
      <p className={cn('text-2xl font-bold', valueMap[accent])}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
      <p className="text-xs text-slate-400">{sub}</p>
    </div>
  );
}

function LiveTaskRow({
  task,
  onKill,
}: {
  task: AdminTask;
  onKill: () => void;
}) {
  return (
    <div className="px-5 py-3.5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-800 truncate">{task.user.email}</p>
        <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">
          {task.prompt.length > 70 ? task.prompt.slice(0, 70) + '…' : task.prompt}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        <span className="text-xs text-slate-500 capitalize font-medium">{task.category}</span>
        <TaskStatusBadge status={task.status} />
        <span className="text-xs text-slate-400">{getRunningDuration(task.startedAt)}</span>
        <span className="text-xs font-medium text-violet-700">
          {formatCredits(task.creditsEstimatedMax)} cr
        </span>
        <Link
          href={`/admin/tasks?view=${task.id}`}
          className="text-xs text-indigo-600 hover:underline font-medium"
        >
          View
        </Link>
        <button
          onClick={onKill}
          className="text-xs text-red-500 hover:text-red-700 font-medium"
        >
          Kill
        </button>
      </div>
    </div>
  );
}
