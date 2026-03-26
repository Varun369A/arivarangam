'use client';

import { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  IndianRupee,
  Download,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useQuery } from 'react-query';
import api from '@/lib/api';
import { cn, formatINR, formatDateTime, formatCredits } from '@/lib/utils';
import type { CreditTransactionType, CreditTransactionStatus, AdminRevenueStats } from '@arivarangam/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TransactionWithUser {
  id: string;
  userId: string;
  type: CreditTransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  packId: string | null;
  taskId: string | null;
  status: CreditTransactionStatus;
  metadata: Record<string, any> | null;
  createdAt: string;
  user: { id: string; email: string; name: string };
}

interface PackStat {
  packId: string | null;
  packName: string;
  priceInr: number;
  credits: number;
  totalPurchases: number;
  totalCreditsIssued: number;
  totalRevenueInr: number;
}

const TX_TYPES: (CreditTransactionType | '')[] = [
  '', 'PURCHASE', 'USAGE', 'REFUND', 'SIGNUP_BONUS', 'ADMIN_GRANT',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function TxTypeBadge({ type }: { type: CreditTransactionType }) {
  const map: Record<CreditTransactionType, string> = {
    PURCHASE: 'bg-emerald-100 text-emerald-700',
    USAGE: 'bg-indigo-100 text-indigo-700',
    REFUND: 'bg-amber-100 text-amber-700',
    SIGNUP_BONUS: 'bg-purple-100 text-purple-700',
    ADMIN_GRANT: 'bg-blue-100 text-blue-700',
  };
  return <span className={cn('badge', map[type])}>{type.replace('_', ' ')}</span>;
}

function TxStatusBadge({ status }: { status: CreditTransactionStatus }) {
  const map: Record<CreditTransactionStatus, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    COMPLETED: 'bg-emerald-100 text-emerald-700',
    FAILED: 'bg-red-100 text-red-700',
    REFUNDED: 'bg-slate-100 text-slate-600',
  };
  return <span className={cn('badge', map[status])}>{status}</span>;
}

function RevenueCard({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: string;
  sub: string;
  trend?: 'up' | 'down' | null;
}) {
  return (
    <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5">
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        {trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
        {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-400" />}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
    </div>
  );
}

// ─── Daily Breakdown Table ────────────────────────────────────────────────────

function DailyBreakdownTable({
  data,
}: {
  data: { date: string; amount: number }[];
}) {
  const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14);
  const max = Math.max(...sorted.map((d) => d.amount), 1);

  return (
    <div className="bg-white rounded-2xl border border-surface-border shadow-card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800">Revenue Trend (last 14 days)</h3>
      </div>
      {sorted.length === 0 ? (
        <div className="py-8 text-center text-sm text-slate-400">No revenue data yet.</div>
      ) : (
        <div className="divide-y divide-slate-50">
          {sorted.map((row) => (
            <div key={row.date} className="px-5 py-2.5 flex items-center gap-4">
              <span className="text-xs text-slate-500 w-24 shrink-0">{row.date}</span>
              <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-400 to-violet-500 rounded-full transition-all duration-500"
                  style={{ width: `${(row.amount / max) * 100}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-slate-800 w-24 text-right shrink-0">
                {formatINR(row.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminBillingPage() {
  const [txPage, setTxPage] = useState(1);
  const [txType, setTxType] = useState<CreditTransactionType | ''>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => { setTxPage(1); }, [txType, fromDate, toDate]);

  const revenueQ = useQuery(
    ['admin-billing-revenue'],
    () =>
      api
        .get('/admin/billing/revenue')
        .then((r) => r.data.data as AdminRevenueStats),
    { refetchInterval: 60_000 },
  );

  const txParams = new URLSearchParams();
  txParams.set('page', txPage.toString());
  txParams.set('limit', '20');
  if (txType) txParams.set('type', txType);
  if (fromDate) txParams.set('from', new Date(fromDate).toISOString());
  if (toDate) txParams.set('to', new Date(toDate + 'T23:59:59').toISOString());

  const txQ = useQuery(
    ['admin-billing-transactions', txPage, txType, fromDate, toDate],
    () =>
      api
        .get(`/admin/billing/transactions?${txParams.toString()}`)
        .then(
          (r) =>
            r.data.data as {
              transactions: TransactionWithUser[];
              total: number;
              totalPages: number;
            },
        ),
    { keepPreviousData: true },
  );

  const packQ = useQuery(
    ['admin-billing-packs'],
    () =>
      api
        .get('/admin/billing/packs/stats')
        .then((r) => r.data.data?.stats as PackStat[]),
  );

  const revenue = revenueQ.data;
  const transactions = txQ.data?.transactions ?? [];
  const txTotalPages = txQ.data?.totalPages ?? 1;
  const packs = packQ.data ?? [];

  // Margin calculation
  const estimatedAICost = revenue ? revenue.thisMonth * 0.12 : 0; // ~12% gross margin
  const margin = revenue ? revenue.thisMonth - estimatedAICost : 0;
  const marginPct = revenue?.thisMonth ? (margin / revenue.thisMonth) * 100 : 0;

  function handleExport() {
    const rows = transactions.map((t) =>
      [t.id, t.user.email, t.type, t.amount, t.status, t.createdAt].join(','),
    );
    const csv = ['ID,Email,Type,Amount,Status,Date', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Revenue & Billing</h1>
        <p className="text-xs text-slate-400 mt-0.5">Track revenue, transactions, and credit pack performance</p>
      </div>

      {/* Revenue Cards */}
      {revenueQ.isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : revenue ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <RevenueCard
            label="Today"
            value={formatINR(revenue.today)}
            sub="INR revenue"
            trend={revenue.today > 0 ? 'up' : null}
          />
          <RevenueCard
            label="This Month"
            value={formatINR(revenue.thisMonth)}
            sub="current month"
            trend={revenue.thisMonth >= revenue.lastMonth ? 'up' : 'down'}
          />
          <RevenueCard
            label="Last Month"
            value={formatINR(revenue.lastMonth)}
            sub="previous month"
          />
          <RevenueCard
            label="All Time"
            value={formatINR(revenue.allTime)}
            sub="total revenue"
            trend="up"
          />
        </div>
      ) : null}

      {/* Daily trend + Cost breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          {revenue?.dailyBreakdown && (
            <DailyBreakdownTable data={revenue.dailyBreakdown} />
          )}
        </div>

        {/* Cost breakdown */}
        <div className="bg-white rounded-2xl border border-surface-border shadow-card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800">Cost Breakdown (This Month)</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Gross Revenue</span>
              <span className="text-sm font-semibold text-emerald-700">
                {formatINR(revenue?.thisMonth ?? 0)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Est. AI Costs</span>
              <span className="text-sm font-semibold text-red-600">
                − {formatINR(estimatedAICost)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-sm text-slate-600">Payment Fees (~2%)</span>
              <span className="text-sm font-semibold text-red-600">
                − {formatINR((revenue?.thisMonth ?? 0) * 0.02)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 bg-indigo-50 rounded-xl px-3">
              <span className="text-sm font-bold text-slate-800">Est. Margin</span>
              <span className="text-sm font-bold text-indigo-700">
                {formatINR(margin)} ({marginPct.toFixed(0)}%)
              </span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            * AI cost estimate assumes ~12% of revenue. Actual costs vary by usage.
          </p>
        </div>
      </div>

      {/* Pack Stats */}
      <div className="bg-white rounded-2xl border border-surface-border shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-800">Credit Pack Performance</h3>
        </div>
        {packQ.isLoading ? (
          <div className="py-8 text-center text-sm text-slate-400 animate-pulse">
            Loading pack stats…
          </div>
        ) : packs.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">
            No pack data available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Pack', 'Price (₹)', 'Credits', 'Sales', 'Credits Issued', 'Revenue'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {packs.map((p) => (
                  <tr
                    key={p.packId ?? 'unknown'}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">{p.packName}</td>
                    <td className="px-4 py-3 text-slate-600">₹{p.priceInr}</td>
                    <td className="px-4 py-3 text-slate-600">{p.credits.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          p.totalPurchases > 0 ? 'text-indigo-700' : 'text-slate-400',
                        )}
                      >
                        {p.totalPurchases}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.totalCreditsIssued.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">
                      {p.totalRevenueInr > 0 ? formatINR(p.totalRevenueInr) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-indigo-50 border-t border-indigo-100">
                  <td className="px-4 py-3 font-bold text-slate-800" colSpan={3}>
                    Total
                  </td>
                  <td className="px-4 py-3 font-bold text-indigo-800">
                    {packs.reduce((s, p) => s + p.totalPurchases, 0)}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800">
                    {packs.reduce((s, p) => s + p.totalCreditsIssued, 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-bold text-emerald-700">
                    {formatINR(packs.reduce((s, p) => s + p.totalRevenueInr, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-base font-semibold text-slate-900">All Transactions</h2>
          <button
            onClick={handleExport}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={txType}
            onChange={(e) => setTxType(e.target.value as CreditTransactionType | '')}
            className="input w-auto"
          >
            <option value="">All Types</option>
            {TX_TYPES.filter(Boolean).map((t) => (
              <option key={t} value={t!}>
                {t!.replace('_', ' ')}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="input w-auto"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium">To</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="input w-auto"
            />
          </div>
          {(txType || fromDate || toDate) && (
            <button
              onClick={() => { setTxType(''); setFromDate(''); setToDate(''); }}
              className="text-xs text-slate-500 hover:text-slate-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-surface-border shadow-card overflow-hidden">
          {txQ.isLoading ? (
            <div className="py-16 text-center text-sm text-slate-400 animate-pulse">
              Loading transactions…
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">
              No transactions found.
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr_1fr] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                <span>User</span>
                <span>Type</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Payment ID / Pack</span>
                <span>Date</span>
              </div>

              <div className="divide-y divide-slate-50">
                {transactions.map((tx) => {
                  const isIncoming = tx.type === 'PURCHASE' || tx.type === 'SIGNUP_BONUS' || tx.type === 'ADMIN_GRANT';
                  const isRefund = tx.type === 'REFUND';
                  const isUsage = tx.type === 'USAGE';

                  return (
                    <div
                      key={tx.id}
                      className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr_1fr] gap-4 px-5 py-3.5 items-center hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">
                          {tx.user.email}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{tx.description}</p>
                      </div>

                      <TxTypeBadge type={tx.type} />

                      <span
                        className={cn(
                          'text-sm font-semibold',
                          isIncoming ? 'text-emerald-700' :
                          isRefund ? 'text-amber-600' :
                          isUsage ? 'text-red-600' : 'text-slate-700',
                        )}
                      >
                        {isIncoming ? '+' : '−'}
                        {Math.abs(tx.amount).toLocaleString()} cr
                      </span>

                      <TxStatusBadge status={tx.status} />

                      <div className="text-xs text-slate-500 font-mono min-w-0">
                        {tx.razorpayPaymentId ? (
                          <span className="truncate block">{tx.razorpayPaymentId}</span>
                        ) : tx.packId ? (
                          <span className="text-indigo-600">{tx.packId}</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </div>

                      <span className="text-xs text-slate-400">
                        {formatDateTime(tx.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {txTotalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Page {txPage} of {txTotalPages} · {txQ.data?.total ?? 0} transactions
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                disabled={txPage === 1}
                className="btn-secondary py-1.5 px-3 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: Math.min(5, txTotalPages) }, (_, i) => {
                const n = Math.max(1, Math.min(txPage - 2, txTotalPages - 4)) + i;
                return (
                  <button
                    key={n}
                    onClick={() => setTxPage(n)}
                    className={cn(
                      'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                      n === txPage
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100',
                    )}
                  >
                    {n}
                  </button>
                );
              })}
              <button
                onClick={() => setTxPage((p) => Math.min(txTotalPages, p + 1))}
                disabled={txPage === txTotalPages}
                className="btn-secondary py-1.5 px-3 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
