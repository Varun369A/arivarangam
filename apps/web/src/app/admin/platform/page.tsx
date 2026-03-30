'use client';

import { useState } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import api, { getApiError } from '@/lib/api';
import { cn, formatDateTime } from '@/lib/utils';
import type {
  AdminHealthStatus,
  PlatformLog,
  PlatformLogType,
  PlatformLogSeverity,
  ModelPerformance,
} from '@arivarangam/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatusIndicator({ status }: { status: string }) {
  const map: Record<string, { dot: string; label: string }> = {
    ok: { dot: 'bg-emerald-500', label: 'text-emerald-700' },
    healthy: { dot: 'bg-emerald-500', label: 'text-emerald-700' },
    degraded: { dot: 'bg-amber-500', label: 'text-amber-700' },
    unknown: { dot: 'bg-slate-400', label: 'text-slate-600' },
    error: { dot: 'bg-red-500', label: 'text-red-700' },
    down: { dot: 'bg-red-600', label: 'text-red-700' },
  };
  const c = map[status] ?? map.error;
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('inline-block w-2 h-2 rounded-full', c.dot)} />
      <span className={cn('text-xs font-semibold uppercase', c.label)}>{status}</span>
    </span>
  );
}

function LogTypeBadge({ type }: { type: PlatformLogType }) {
  const map: Record<PlatformLogType, string> = {
    ERROR: 'bg-red-100 text-red-700',
    FIX_APPLIED: 'bg-emerald-100 text-emerald-700',
    IMPROVEMENT: 'bg-indigo-100 text-indigo-700',
    SECURITY: 'bg-orange-100 text-orange-700',
    MODEL_ADDED: 'bg-purple-100 text-purple-700',
    MONITOR: 'bg-slate-100 text-slate-600',
  };
  return <span className={cn('badge', map[type])}>{type.replace('_', ' ')}</span>;
}

function SeverityBadge({ severity }: { severity: PlatformLogSeverity }) {
  const map: Record<PlatformLogSeverity, string> = {
    INFO: 'bg-blue-100 text-blue-700',
    WARNING: 'bg-amber-100 text-amber-700',
    ERROR: 'bg-red-100 text-red-700',
    CRITICAL: 'bg-red-200 text-red-900 font-bold',
  };
  return <span className={cn('badge', map[severity])}>{severity}</span>;
}

function LatencyGauge({ ms, label }: { ms: number | null | undefined; label: string }) {
  const val = ms ?? 0;
  const max = 2000;
  const pct = Math.min(100, (val / max) * 100);
  const color =
    val === 0 ? 'bg-slate-300' :
    val < 500 ? 'bg-emerald-400' :
    val < 1000 ? 'bg-amber-400' :
    'bg-red-500';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="text-slate-500">{ms != null ? `${ms}ms` : 'N/A'}</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Diff Viewer ──────────────────────────────────────────────────────────────

function DiffViewer({ oldCode, newCode }: { oldCode: string | null; newCode: string | null }) {
  if (!oldCode && !newCode) return null;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
      {oldCode && (
        <div>
          <p className="text-[11px] font-semibold text-red-500 uppercase mb-1">Before</p>
          <pre className="text-[11px] bg-red-50 border border-red-100 rounded-xl p-3 overflow-x-auto text-slate-700 leading-relaxed whitespace-pre-wrap break-words max-h-60">
            {oldCode}
          </pre>
        </div>
      )}
      {newCode && (
        <div>
          <p className="text-[11px] font-semibold text-emerald-600 uppercase mb-1">After</p>
          <pre className="text-[11px] bg-emerald-50 border border-emerald-100 rounded-xl p-3 overflow-x-auto text-slate-700 leading-relaxed whitespace-pre-wrap break-words max-h-60">
            {newCode}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Log Entry Row ────────────────────────────────────────────────────────────

function LogEntryRow({
  log,
  onApprove,
  onReject,
}: {
  log: PlatformLog;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-slate-50 last:border-0">
      <div
        className="px-5 py-3.5 flex items-start gap-4 hover:bg-slate-50 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <LogTypeBadge type={log.type} />
          <SeverityBadge severity={log.severity} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800">{log.title}</p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">{log.description}</p>
          {log.filePath && (
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{log.filePath}</p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-slate-400">{formatDateTime(log.createdAt)}</span>
          {!log.approved ? (
            <span className="badge bg-amber-100 text-amber-700">Pending</span>
          ) : (
            <span className="badge bg-emerald-100 text-emerald-700">Applied</span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-4">
          <DiffViewer oldCode={log.oldCode} newCode={log.newCode} />
          {!log.approved && (
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={(e) => { e.stopPropagation(); onApprove(log.id); }}
                className="btn-primary text-xs py-1.5 px-4"
              >
                Approve & Apply
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onReject(log.id); }}
                className="inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-xl bg-red-50 text-red-600 font-medium text-xs hover:bg-red-100 transition-colors"
              >
                Reject
              </button>
            </div>
          )}
          {log.approved && log.approvedAt && (
            <p className="text-xs text-slate-400 mt-2">
              Applied {formatDateTime(log.approvedAt)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'health' | 'improvements' | 'performance';

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPlatformPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('health');
  const [logPage, setLogPage] = useState(1);

  const healthQ = useQuery(
    ['admin-platform-health'],
    () => api.get('/admin/platform/health').then((r) => r.data.data as AdminHealthStatus),
    { refetchInterval: 30_000 },
  );

  const logsQ = useQuery(
    ['admin-platform-logs', logPage],
    () =>
      api
        .get(`/admin/platform/logs?page=${logPage}&limit=15`)
        .then((r) => r.data.data as { logs: PlatformLog[]; total: number; totalPages: number }),
    { keepPreviousData: true },
  );

  const perfQ = useQuery(
    ['admin-platform-perf'],
    () =>
      api
        .get('/admin/platform/performance?limit=50')
        .then(
          (r) =>
            r.data.data as {
              performances: ModelPerformance[];
              summary: Record<string, { avgSuccessRate: number; avgLatency: number; totalSamples: number }>;
            },
        ),
    { enabled: tab === 'performance' },
  );

  async function handleApprove(id: string) {
    try {
      await api.post(`/admin/platform/logs/${id}/approve`);
      toast.success('Fix approved and applied.');
      qc.invalidateQueries(['admin-platform-logs']);
    } catch (e) {
      toast.error(getApiError(e));
    }
  }

  function handleReject(id: string) {
    toast('Reject functionality: mark as rejected in your DB.', { icon: 'ℹ️' });
  }

  const health = healthQ.data;
  const logs = logsQ.data?.logs ?? [];
  const logTotalPages = logsQ.data?.totalPages ?? 1;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'health', label: 'Health' },
    { id: 'improvements', label: 'Improvements' },
    { id: 'performance', label: 'Performance' },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[#1E1B4B]">Platform Self-Improvement</h1>
        <p className="text-xs text-slate-500 mt-0.5">Monitor AI models, review fixes, track performance</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Health Tab ── */}
      {tab === 'health' && (
        <div className="space-y-5">
          {healthQ.isLoading ? (
            <div className="py-10 text-center text-sm text-slate-400 animate-pulse">
              Checking model health…
            </div>
          ) : health ? (
            <>
              {/* Overall status */}
              <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-slate-800">Overall System Status</h2>
                  <StatusIndicator status={health.status} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Active Tasks', value: health.activeTasks },
                    {
                      label: 'Error Rate (1h)',
                      value: `${health.errorRateLast1h.toFixed(1)}%`,
                    },
                    { label: 'Redis', value: health.redis.status },
                    { label: 'Database', value: health.database.status },
                  ].map((s) => (
                    <div key={s.label} className="bg-slate-50 rounded-xl p-3">
                      <p className="text-xs text-slate-500">{s.label}</p>
                      <p className="text-base font-bold text-slate-900 mt-0.5">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Model cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'Claude', info: health.models.claude },
                  { name: 'OpenAI', info: health.models.openai },
                  { name: 'Perplexity', info: health.models.perplexity },
                  { name: 'ElevenLabs', info: health.models.elevenlabs },
                ].map(({ name, info }) => (
                  <div
                    key={name}
                    className="bg-white rounded-2xl border border-surface-border shadow-card p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-slate-800">{name}</span>
                      <StatusIndicator status={info.status} />
                    </div>
                    {info.latencyMs != null && (
                      <LatencyGauge ms={info.latencyMs} label="Latency" />
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── Improvements Tab ── */}
      {tab === 'improvements' && (
        <div className="space-y-4">
          {/* Pending count */}
          {logsQ.data && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">
                {logsQ.data.total} total entries ·{' '}
                <span className="text-amber-600 font-medium">
                  {logs.filter((l) => !l.approved).length} pending
                </span>
              </span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-surface-border shadow-card overflow-hidden">
            {logsQ.isLoading ? (
              <div className="py-10 text-center text-sm text-slate-400 animate-pulse">
                Loading improvement log…
              </div>
            ) : logs.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                No platform logs found.
              </div>
            ) : (
              <div>
                {logs.map((log) => (
                  <LogEntryRow
                    key={log.id}
                    log={log}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {logTotalPages > 1 && (
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                disabled={logPage === 1}
                className="btn-secondary py-1.5 px-3 disabled:opacity-40 text-sm"
              >
                ← Prev
              </button>
              <span className="text-xs text-slate-500">
                {logPage} / {logTotalPages}
              </span>
              <button
                onClick={() => setLogPage((p) => Math.min(logTotalPages, p + 1))}
                disabled={logPage === logTotalPages}
                className="btn-secondary py-1.5 px-3 disabled:opacity-40 text-sm"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Performance Tab ── */}
      {tab === 'performance' && (
        <div className="space-y-5">
          {/* Summary by model */}
          {perfQ.isLoading ? (
            <div className="py-10 text-center text-sm text-slate-400 animate-pulse">
              Loading performance data…
            </div>
          ) : perfQ.data ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(perfQ.data.summary).map(([model, stats]) => (
                  <div
                    key={model}
                    className="bg-white rounded-2xl border border-surface-border shadow-card p-4"
                  >
                    <p className="text-sm font-semibold text-slate-800 mb-3">{model}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Avg Success Rate</span>
                        <span
                          className={cn(
                            'font-semibold',
                            stats.avgSuccessRate >= 90
                              ? 'text-emerald-600'
                              : stats.avgSuccessRate >= 70
                              ? 'text-amber-600'
                              : 'text-red-600',
                          )}
                        >
                          {stats.avgSuccessRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            stats.avgSuccessRate >= 90 ? 'bg-emerald-400' :
                            stats.avgSuccessRate >= 70 ? 'bg-amber-400' : 'bg-red-400',
                          )}
                          style={{ width: `${stats.avgSuccessRate}%` }}
                        />
                      </div>
                      <LatencyGauge ms={Math.round(stats.avgLatency)} label="Avg Latency" />
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Sample Size</span>
                        <span className="font-medium text-slate-700">{stats.totalSamples}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Detailed table */}
              <div className="bg-white rounded-2xl border border-surface-border shadow-card overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Per-Model Performance Detail
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {['Model', 'Category', 'Prompt Version', 'Success Rate', 'Avg Latency', 'Avg Cost', 'Samples', 'Recorded'].map((h) => (
                          <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {perfQ.data.performances.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-sm text-slate-800 font-medium">{p.model}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 capitalize">{p.taskCategory}</td>
                          <td className="px-4 py-3 text-xs text-slate-500 font-mono">{p.promptVersion}</td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'text-sm font-semibold',
                                p.successRate >= 90 ? 'text-emerald-600' :
                                p.successRate >= 70 ? 'text-amber-600' : 'text-red-600',
                              )}
                            >
                              {p.successRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{p.avgLatencyMs}ms</td>
                          <td className="px-4 py-3 text-sm text-slate-700">${p.avgCostUsd.toFixed(4)}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{p.sampleSize}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{formatDateTime(p.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="py-10 text-center text-sm text-slate-400">
              No performance data available.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
