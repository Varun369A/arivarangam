'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import api, { getApiError } from '@/lib/api';
import { cn, formatDateTime } from '@/lib/utils';
import type { SecurityEvent, SecurityEventSeverity, SecurityEventType } from '@arivarangam/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SecurityEventWithUser extends SecurityEvent {
  user?: { id: string; email: string; name: string } | null;
}

interface FrozenUser {
  id: string;
  email: string;
  name: string;
  status: string;
  frozenAt?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  SecurityEventSeverity,
  { badge: string; dot: string; label: string }
> = {
  LOW: {
    badge: 'bg-slate-100 text-slate-600',
    dot: 'bg-slate-400',
    label: 'Low',
  },
  MEDIUM: {
    badge: 'bg-amber-100 text-amber-700',
    dot: 'bg-amber-400',
    label: 'Medium',
  },
  HIGH: {
    badge: 'bg-orange-100 text-orange-700',
    dot: 'bg-orange-500',
    label: 'High',
  },
  CRITICAL: {
    badge: 'bg-red-100 text-red-700 font-bold',
    dot: 'bg-red-600',
    label: 'Critical',
  },
};

function SeverityBadge({ severity }: { severity: SecurityEventSeverity }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span className={cn('badge', cfg.badge)}>
      <span className={cn('inline-block w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function EventTypeBadge({ type }: { type: SecurityEventType }) {
  const map: Record<SecurityEventType, string> = {
    SUSPICIOUS_PURCHASE: 'bg-orange-100 text-orange-700',
    CHARGEBACK: 'bg-red-100 text-red-700',
    RATE_LIMIT: 'bg-amber-100 text-amber-700',
    VPN_DETECTED: 'bg-violet-100 text-violet-700',
    FAILED_AUTH: 'bg-pink-100 text-pink-700',
    ACCOUNT_FROZEN: 'bg-slate-200 text-slate-700',
  };
  const label = type.replace(/_/g, ' ');
  return <span className={cn('badge text-[11px]', map[type] ?? 'bg-slate-100 text-slate-600')}>{label}</span>;
}

// ─── Stats Card ───────────────────────────────────────────────────────────────

function StatsCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-surface-border shadow-card p-4">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', accent)}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminSecurityPage() {
  const qc = useQueryClient();
  const [severity, setSeverity] = useState<SecurityEventSeverity | ''>('');
  const [resolved, setResolved] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
  const [page, setPage] = useState(1);

  useEffect(() => { setPage(1); }, [severity, resolved]);

  // Build query params
  const params = new URLSearchParams();
  params.set('page', page.toString());
  params.set('limit', '20');
  if (severity) params.set('severity', severity);
  if (resolved !== 'all') params.set('resolved', resolved === 'resolved' ? 'true' : 'false');

  const eventsQ = useQuery(
    ['admin-security-events', page, severity, resolved],
    () =>
      api
        .get(`/admin/security/events?${params.toString()}`)
        .then(
          (r) =>
            r.data.data as {
              events: SecurityEventWithUser[];
              total: number;
              totalPages: number;
              stats: {
                today: number;
                unresolved: number;
                critical: number;
              };
            },
        )
        .catch(() => ({
          events: [] as SecurityEventWithUser[],
          total: 0,
          totalPages: 1,
          stats: { today: 0, unresolved: 0, critical: 0 },
        })),
    { keepPreviousData: true, refetchInterval: 30_000 },
  );

  const frozenQ = useQuery(
    ['admin-frozen-users'],
    () =>
      api
        .get('/admin/users?status=SUSPENDED&limit=20')
        .then(
          (r) =>
            (r.data.data?.users ?? []) as FrozenUser[],
        )
        .catch(() => [] as FrozenUser[]),
    { refetchInterval: 60_000 },
  );

  async function handleResolve(eventId: string) {
    try {
      await api.post(`/admin/security/events/${eventId}/resolve`);
      toast.success('Event marked as resolved.');
      qc.invalidateQueries(['admin-security-events']);
    } catch (e) {
      // Endpoint may not exist yet — show friendly message
      toast('Resolve endpoint not yet implemented on API.', { icon: 'ℹ️' });
    }
  }

  async function handleUnfreeze(userId: string, email: string) {
    if (!confirm(`Unfreeze account ${email}?`)) return;
    try {
      await api.post(`/admin/users/${userId}/activate`);
      toast.success(`${email} reactivated.`);
      qc.invalidateQueries(['admin-frozen-users']);
    } catch (e) {
      toast.error(getApiError(e));
    }
  }

  const events = eventsQ.data?.events ?? [];
  const stats = eventsQ.data?.stats ?? { today: 0, unresolved: 0, critical: 0 };
  const totalPages = eventsQ.data?.totalPages ?? 1;
  const frozenUsers = frozenQ.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white">Security Center</h1>
        <p className="text-xs text-slate-400 mt-0.5">Monitor suspicious activity, resolve events, manage frozen accounts</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard
          label="Events Today"
          value={stats.today}
          icon={<Shield className="w-4 h-4 text-indigo-600" />}
          accent="bg-indigo-50"
        />
        <StatsCard
          label="Unresolved"
          value={stats.unresolved}
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          accent="bg-amber-50"
        />
        <StatsCard
          label="Critical"
          value={stats.critical}
          icon={<XCircle className="w-4 h-4 text-red-600" />}
          accent="bg-red-50"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Resolved filter */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
          {(['unresolved', 'all', 'resolved'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setResolved(v)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors',
                resolved === v
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700',
              )}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Severity filter */}
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as SecurityEventSeverity | '')}
          className="input w-auto"
        >
          <option value="">All Severities</option>
          {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as SecurityEventSeverity[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Events table */}
      <div className="bg-white rounded-2xl border border-surface-border shadow-card overflow-hidden">
        {eventsQ.isLoading ? (
          <div className="py-16 text-center text-sm text-slate-400 animate-pulse">
            Loading security events…
          </div>
        ) : events.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No security events match your filters.</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <span>Type</span>
              <span>Severity</span>
              <span>Description</span>
              <span>User / IP</span>
              <span>Time</span>
              <span>Action</span>
            </div>

            <div className="divide-y divide-slate-50">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className={cn(
                    'grid grid-cols-[1fr_1fr_1.5fr_1fr_1fr_auto] gap-4 px-5 py-3.5 items-start',
                    !ev.resolved ? 'hover:bg-slate-50' : 'opacity-60',
                    ev.severity === 'CRITICAL' && !ev.resolved ? 'bg-red-50/40' : '',
                  )}
                >
                  <EventTypeBadge type={ev.type} />
                  <SeverityBadge severity={ev.severity} />
                  <p className="text-sm text-slate-700 leading-snug">{ev.description}</p>
                  <div className="text-xs text-slate-500">
                    {ev.user?.email && (
                      <p className="font-medium text-slate-700">{ev.user.email}</p>
                    )}
                    {ev.ipAddress && <p className="font-mono">{ev.ipAddress}</p>}
                    {!ev.user?.email && !ev.ipAddress && <span className="text-slate-300">—</span>}
                  </div>
                  <span className="text-xs text-slate-400">{formatDateTime(ev.createdAt)}</span>
                  <div>
                    {!ev.resolved ? (
                      <button
                        onClick={() => handleResolve(ev.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors whitespace-nowrap"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolve
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Resolved
                      </span>
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
            Page {page} of {totalPages} · {eventsQ.data?.total ?? 0} events
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
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
                    n === page ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100',
                  )}
                >
                  {n}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-secondary py-1.5 px-3 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Frozen Accounts */}
      <div className="bg-white rounded-2xl border border-surface-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-800">
            Frozen / Suspended Accounts ({frozenUsers.length})
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Accounts suspended due to chargebacks or policy violations
          </p>
        </div>
        {frozenQ.isLoading ? (
          <div className="py-8 text-center text-sm text-slate-400 animate-pulse">
            Loading suspended accounts…
          </div>
        ) : frozenUsers.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            No suspended accounts.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {frozenUsers.map((u) => (
              <div key={u.id} className="px-5 py-3.5 flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <span className="text-red-600 text-xs font-bold">
                    {u.name?.[0]?.toUpperCase() ?? '?'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{u.name}</p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                </div>
                <span className="badge bg-red-100 text-red-700">SUSPENDED</span>
                <button
                  onClick={() => handleUnfreeze(u.id, u.email)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  Unfreeze
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
