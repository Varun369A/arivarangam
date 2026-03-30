'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Gift,
  Ban,
  CheckCircle,
  User,
  Clock,
} from 'lucide-react';
import { useQuery, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import api, { getApiError } from '@/lib/api';
import { cn, formatDate, formatDateTime, formatCredits } from '@/lib/utils';
import type { UserTier, UserStatus, Task, CreditTransaction } from '@arivarangam/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  tier: UserTier;
  credits: number;
  totalCreditsUsed: number;
  isAdmin: boolean;
  isEmailVerified: boolean;
  status: UserStatus;
  createdAt: string;
  _count: { tasks: number; repos: number; transactions: number };
}

interface UserDetail {
  user: AdminUser & { password?: string };
  stats: {
    tasksCount: number;
    reposCount: number;
    totalTransactions: number;
    totalCreditsPurchased: number;
    totalPurchases: number;
  };
  recentTasks: Array<{
    id: string;
    category: string;
    status: string;
    prompt: string;
    creditsActuallyUsed: number | null;
    createdAt: string;
  }>;
}

const TIER_OPTIONS: UserTier[] = ['FREE', 'STARTER', 'PRO', 'BUSINESS', 'ADMIN'];
const STATUS_OPTIONS: UserStatus[] = ['ACTIVE', 'SUSPENDED', 'DELETED'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: UserTier }) {
  const map: Record<UserTier, string> = {
    FREE: 'bg-slate-100 text-slate-600',
    STARTER: 'bg-blue-100 text-blue-700',
    PRO: 'bg-indigo-100 text-indigo-700',
    BUSINESS: 'bg-violet-100 text-violet-700',
    ADMIN: 'bg-purple-100 text-purple-700 font-bold',
  };
  return <span className={cn('badge', map[tier])}>{tier}</span>;
}

function StatusBadge({ status }: { status: UserStatus }) {
  const map: Record<UserStatus, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    SUSPENDED: 'bg-red-100 text-red-700',
    DELETED: 'bg-slate-100 text-slate-700 line-through',
  };
  return <span className={cn('badge', map[status])}>{status}</span>;
}

function TaskStatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    running: 'bg-indigo-100 text-indigo-700',
    completed: 'bg-emerald-100 text-emerald-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-slate-100 text-slate-600',
    pending: 'bg-amber-100 text-amber-700',
    analyzing: 'bg-violet-100 text-violet-700',
  };
  return <span className={cn('badge capitalize', map[status] ?? 'bg-slate-100 text-slate-600')}>{status}</span>;
}

function UserAvatar({ user }: { user: { name: string; avatar: string | null } }) {
  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name}
        className="w-8 h-8 rounded-full object-cover"
      />
    );
  }
  const initials = user.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
      {initials}
    </div>
  );
}

// ─── Grant Credits Modal ──────────────────────────────────────────────────────

function GrantCreditsModal({
  user,
  onClose,
  onSuccess,
}: {
  user: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const n = parseInt(amount, 10);
    if (isNaN(n) || n === 0) {
      setError('Enter a valid non-zero amount.');
      return;
    }
    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/admin/users/${user.id}/credits`, {
        amount: n,
        reason: reason.trim(),
      });
      toast.success(res.data.data.message);
      onSuccess();
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
        <h3 className="text-base font-semibold text-slate-900 mb-1">Grant / Deduct Credits</h3>
        <p className="text-sm text-slate-700 mb-5">
          Target: <span className="font-medium text-slate-800">{user.email}</span> — Current:{' '}
          <span className="font-semibold text-indigo-600">{formatCredits(user.credits)} cr</span>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Amount (positive = grant, negative = deduct)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 500 or -100"
              className="input"
              required
            />
          </div>
          <div>
            <label className="label">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why are you granting/deducting credits?"
              className="input min-h-[80px] resize-none"
              required
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving…' : 'Apply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── User Detail Panel ────────────────────────────────────────────────────────

function UserDetailPanel({
  userId,
  onClose,
}: {
  userId: string;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useQuery(
    ['admin-user-detail', userId],
    () =>
      api
        .get(`/admin/users/${userId}`)
        .then((r) => r.data.data as UserDetail),
    { staleTime: 30_000 },
  );

  return (
    <div className="border-t border-slate-100 bg-slate-50 px-6 py-4">
      {isLoading ? (
        <div className="py-4 text-center text-sm text-slate-600 animate-pulse">Loading details…</div>
      ) : error ? (
        <p className="text-xs text-red-600 py-4">{getApiError(error)}</p>
      ) : data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Tasks', value: data.stats.tasksCount },
              { label: 'Repos', value: data.stats.reposCount },
              { label: 'Purchases', value: data.stats.totalPurchases },
              { label: 'Credits Bought', value: formatCredits(data.stats.totalCreditsPurchased) },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-lg font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-700">{s.label}</p>
              </div>
            ))}
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-600 uppercase mb-2">Recent Tasks</h4>
            {data.recentTasks.length === 0 ? (
              <p className="text-xs text-slate-600">No tasks yet</p>
            ) : (
              <div className="space-y-1.5">
                {data.recentTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-3 py-2">
                    <TaskStatusPill status={t.status} />
                    <span className="text-xs text-slate-700 capitalize">{t.category}</span>
                    <span className="text-xs text-slate-700 flex-1 truncate">{t.prompt}</span>
                    {t.creditsActuallyUsed != null && (
                      <span className="text-xs text-violet-600 font-medium shrink-0">
                        {formatCredits(t.creditsActuallyUsed)} cr
                      </span>
                    )}
                    <span className="text-xs text-slate-600 shrink-0">{formatDate(t.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<UserTier | ''>('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [grantTarget, setGrantTarget] = useState<AdminUser | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to page 1 on filter changes
  useEffect(() => { setPage(1); }, [debouncedSearch, tierFilter, statusFilter]);

  const params = new URLSearchParams();
  params.set('page', page.toString());
  params.set('limit', '20');
  if (debouncedSearch) params.set('search', debouncedSearch);
  if (tierFilter) params.set('tier', tierFilter);
  if (statusFilter) params.set('status', statusFilter);

  const { data, isLoading, isFetching } = useQuery(
    ['admin-users', page, debouncedSearch, tierFilter, statusFilter],
    () =>
      api
        .get(`/admin/users?${params.toString()}`)
        .then((r) => r.data.data as { users: AdminUser[]; total: number; totalPages: number }),
    { keepPreviousData: true },
  );

  async function handleChangeTier(user: AdminUser, tier: UserTier) {
    try {
      await api.patch(`/admin/users/${user.id}/tier`, { tier });
      toast.success(`${user.email} → ${tier}`);
      qc.invalidateQueries(['admin-users']);
    } catch (e) {
      toast.error(getApiError(e));
    }
  }

  async function handleSuspend(user: AdminUser) {
    if (!confirm(`Suspend ${user.email}?`)) return;
    try {
      await api.post(`/admin/users/${user.id}/suspend`, { reason: 'Admin action' });
      toast.success(`${user.email} suspended`);
      qc.invalidateQueries(['admin-users']);
    } catch (e) {
      toast.error(getApiError(e));
    }
  }

  async function handleActivate(user: AdminUser) {
    try {
      await api.post(`/admin/users/${user.id}/activate`);
      toast.success(`${user.email} reactivated`);
      qc.invalidateQueries(['admin-users']);
    } catch (e) {
      toast.error(getApiError(e));
    }
  }

  const users = data?.users ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1E1B4B]">User Management</h1>
          <p className="text-xs text-slate-700 mt-0.5">
            {data?.total ?? '—'} total users
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as UserTier | '')}
          className="input w-auto"
        >
          <option value="">All Tiers</option>
          {TIER_OPTIONS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as UserStatus | '')}
          className="input w-auto"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-surface-border shadow-card overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-slate-600 animate-pulse">
            Loading users…
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-600">
            No users found matching your filters.
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1.5fr] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-700 uppercase tracking-wide">
              <span>User</span>
              <span>Tier</span>
              <span>Credits</span>
              <span>Tasks</span>
              <span>Joined</span>
              <span>Status</span>
              <span>Actions</span>
            </div>

            <div className="divide-y divide-slate-50">
              {users.map((user) => (
                <div key={user.id}>
                  <div
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1.5fr] gap-4 px-5 py-3.5 items-center hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === user.id ? null : user.id)}
                  >
                    {/* Avatar + Name + Email */}
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar user={user} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
                        <p className="text-xs text-slate-600 truncate">{user.email}</p>
                      </div>
                    </div>
                    <TierBadge tier={user.tier} />
                    <span className="text-sm font-medium text-indigo-700">
                      {formatCredits(user.credits)}
                    </span>
                    <span className="text-sm text-slate-700">{user._count.tasks}</span>
                    <span className="text-xs text-slate-700">{formatDate(user.createdAt)}</span>
                    <StatusBadge status={user.status} />

                    {/* Actions */}
                    <div
                      className="flex items-center gap-2 flex-wrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Tier select */}
                      <select
                        value={user.tier}
                        onChange={(e) => handleChangeTier(user, e.target.value as UserTier)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700 hover:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400 transition-colors"
                      >
                        {TIER_OPTIONS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>

                      {/* Grant credits */}
                      <button
                        onClick={() => setGrantTarget(user)}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-500 hover:text-indigo-700 transition-colors"
                        title="Grant Credits"
                      >
                        <Gift className="w-3.5 h-3.5" />
                      </button>

                      {/* Suspend / Activate */}
                      {user.status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleSuspend(user)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                          title="Suspend"
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>
                      ) : user.status === 'SUSPENDED' ? (
                        <button
                          onClick={() => handleActivate(user)}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-emerald-500 hover:text-emerald-700 transition-colors"
                          title="Activate"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      ) : null}

                      {/* Expand */}
                      <button
                        onClick={() => setExpandedId(expandedId === user.id ? null : user.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-slate-600 transition-colors"
                        title="View Details"
                      >
                        {expandedId === user.id ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expandedId === user.id && (
                    <UserDetailPanel
                      userId={user.id}
                      onClose={() => setExpandedId(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-700">
            Page {page} of {totalPages} · {data?.total ?? 0} users
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

      {/* Grant Credits Modal */}
      {grantTarget && (
        <GrantCreditsModal
          user={grantTarget}
          onClose={() => setGrantTarget(null)}
          onSuccess={() => qc.invalidateQueries(['admin-users'])}
        />
      )}
    </div>
  );
}
