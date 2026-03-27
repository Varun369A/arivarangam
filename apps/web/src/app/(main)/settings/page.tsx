'use client';

import { useState, useEffect, useCallback, FormEvent, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  User,
  Lock,
  Zap,
  CreditCard,
  Key,
  Save,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  TrendingUp,
  BadgeCheck,
  AlertCircle,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { authApi, creditsApi, envVarsApi, getApiError } from '@/lib/api';
import type { CreditPack, Transaction, EnvVar, ServiceCatalogEntry } from '@/lib/api';
import { cn, formatDateTime } from '@/lib/utils';

// ─── Razorpay types ────────────────────────────────────────────────────────────
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

// ─── Tab config ───────────────────────────────────────────────────────────────
type Tab = 'profile' | 'security' | 'credits' | 'billing' | 'api';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'credits', label: 'Credits', icon: Zap },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'api', label: 'API Keys', icon: Key },
];

// ─── Credit packs (static fallback + fetched) ─────────────────────────────────
const STATIC_PACKS: CreditPack[] = [
  { id: 'trial', name: 'Trial', credits: 300, priceInPaise: 9900, popular: false },
  { id: 'starter', name: 'Starter', credits: 1000, priceInPaise: 29900, popular: false },
  { id: 'pro', name: 'Pro', credits: 3000, priceInPaise: 69900, popular: true },
  { id: 'business', name: 'Business', credits: 8000, priceInPaise: 149900, popular: false },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// Profile Tab
function ProfileTab() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error('Name is required.'); return; }
    setSaving(true);
    try {
      await authApi.updateProfile({ name: name.trim() });
      refresh();
      setSaved(true);
      toast.success('Profile updated!');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error('Image must be under 2MB'); return; }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast.error('Only JPEG, PNG, WebP or GIF allowed'); return;
    }

    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target?.result as string;
        const base64 = dataUrl.split(',')[1];
        setAvatarPreview(dataUrl);
        try {
          await authApi.uploadAvatar(base64, file.type);
          refresh();
          toast.success('Profile photo updated!');
        } catch (err) {
          toast.error(getApiError(err));
          setAvatarPreview(null);
        } finally {
          setUploadingAvatar(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingAvatar(false);
    }
  }

  const initials = user?.name
    ? user.name.trim().split(/\s+/).map((p: string) => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const avatarSrc = avatarPreview ?? user?.avatarUrl;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Profile</h2>
        <p className="text-sm text-slate-500">Manage your public profile information.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-md">
        {/* Avatar */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Profile picture</label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
              {avatarSrc
                ? <img src={avatarSrc} alt="avatar" className="w-full h-full object-cover" />
                : initials}
            </div>
            <div>
              <label className={`flex items-center gap-2 text-sm font-semibold cursor-pointer
                text-indigo-600 hover:text-indigo-800 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100
                px-3 py-1.5 rounded-xl transition-colors ${uploadingAvatar ? 'opacity-60 pointer-events-none' : ''}`}>
                {uploadingAvatar
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
                  : <><Upload className="w-4 h-4" /> Upload photo</>}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarChange} />
              </label>
              <p className="mt-1.5 text-xs text-slate-400">PNG, JPG, WebP up to 2MB</p>
            </div>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="profile-name">
            Full name
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Email address
          </label>
          <div className="flex items-center gap-2">
            <input
              type="email"
              value={user?.email ?? ''}
              readOnly
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 cursor-not-allowed"
            />
            {user?.isEmailVerified && (
              <div className="flex items-center gap-1 text-green-600 text-xs font-medium">
                <BadgeCheck className="w-4 h-4" />
                Verified
              </div>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">Email cannot be changed after signup.</p>
        </div>

        {/* Save button */}
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors shadow-sm"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
          ) : saved ? (
            <><CheckCircle2 className="w-4 h-4" /> Saved!</>
          ) : (
            <><Save className="w-4 h-4" /> Save changes</>
          )}
        </button>
      </form>
    </div>
  );
}

// Security Tab
function SecurityTab() {
  const [form, setForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [autoLogoutVal, setAutoLogoutVal] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const s = localStorage.getItem('autoLogoutMinutes');
    return s !== null ? Number(s) : 0;
  });

  function update(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => { const c = { ...e }; delete c[k]; return c; });
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.oldPassword) errs.oldPassword = 'Current password is required.';
    if (!form.newPassword) errs.newPassword = 'New password is required.';
    else if (form.newPassword.length < 8) errs.newPassword = 'At least 8 characters.';
    if (form.newPassword !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      await authApi.changePassword(form.oldPassword, form.newPassword);
      toast.success('Password changed successfully!');
      setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Security</h2>
        <p className="text-sm text-slate-500">Manage your password and active sessions.</p>
      </div>

      {/* Change password */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm max-w-md">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Lock className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Change password</h3>
            <p className="text-xs text-slate-400">Use a strong, unique password.</p>
          </div>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {[
            { key: 'oldPassword' as const, label: 'Current password', autocomplete: 'current-password' },
            { key: 'newPassword' as const, label: 'New password', autocomplete: 'new-password' },
            { key: 'confirmPassword' as const, label: 'Confirm new password', autocomplete: 'new-password' },
          ].map(({ key, label, autocomplete }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
              <input
                type="password"
                autoComplete={autocomplete}
                value={form[key]}
                onChange={(e) => update(key, e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow
                  ${errors[key] ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'}`}
              />
              {errors[key] && <p className="mt-1 text-xs text-red-600">{errors[key]}</p>}
            </div>
          ))}
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating…</> : 'Update password'}
          </button>
        </form>
      </div>

      {/* Auto-logout */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Auto-logout</h3>
            <p className="text-xs text-slate-500">Automatically sign out after inactivity.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 5,  label: '5 min' },
            { value: 10, label: '10 min' },
            { value: 30, label: '30 min' },
            { value: 60, label: '1 hour' },
            { value: 0,  label: 'Never' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setAutoLogoutVal(opt.value);
                localStorage.setItem('autoLogoutMinutes', String(opt.value));
                window.dispatchEvent(new Event('storage'));
                toast.success(opt.value === 0 ? 'Auto-logout disabled' : `Auto-logout set to ${opt.label}`);
              }}
              className={cn(
                'px-3 py-2 rounded-xl text-xs font-semibold border transition-colors',
                autoLogoutVal === opt.value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {autoLogoutVal > 0 && (
          <p className="mt-3 text-xs text-slate-500">
            You will be logged out after <strong className="text-slate-700">{autoLogoutVal} minutes</strong> of inactivity.
          </p>
        )}
      </div>

      {/* Active sessions */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm max-w-md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center">
            <Shield className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Active sessions</h3>
            <p className="text-xs text-slate-400">Devices signed into your account.</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { device: 'Current session', location: 'This browser', active: true },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-slate-700">{s.device}</p>
                <p className="text-xs text-slate-400">{s.location}</p>
              </div>
              {s.active && (
                <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-2.5 py-1 rounded-full font-medium">
                  Active now
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Credits Tab
function CreditsTab() {
  const { balance, isLoading, refresh } = useCredits();
  const [page, setPage] = useState(1);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [txLoading, setTxLoading] = useState(false);
  const LIMIT = 10;

  const fetchTransactions = useCallback(async (p: number) => {
    setTxLoading(true);
    try {
      const res = await creditsApi.getTransactions({ page: p, limit: LIMIT });
      setTransactions(res.data);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (err) {
      toast.error(getApiError(err));
    } finally {
      setTxLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTransactions(page);
  }, [fetchTransactions, page]);

  function txTypeLabel(type: Transaction['type']) {
    return type === 'purchase' ? 'Purchase' : 'Usage';
  }

  function txTypeBadge(type: Transaction['type']) {
    if (type === 'purchase') {
      return 'bg-green-50 text-green-700 border-green-200';
    }
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Credits</h2>
        <p className="text-sm text-slate-500">Your balance and transaction history.</p>
      </div>

      {/* Balance card */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white max-w-sm shadow-lg shadow-indigo-200">
        <div className="flex items-center gap-2 mb-3 opacity-90">
          <Zap className="w-4 h-4" />
          <span className="text-sm font-medium">Current balance</span>
        </div>
        {isLoading ? (
          <div className="h-10 w-24 bg-white/20 animate-pulse rounded-xl" />
        ) : (
          <div className="text-4xl font-black">
            {(balance ?? 0).toLocaleString('en-IN')}
            <span className="text-xl font-semibold ml-1.5 opacity-80">credits</span>
          </div>
        )}
        <button
          onClick={refresh}
          className="mt-3 text-xs text-white/70 hover:text-white transition-colors"
        >
          Refresh balance
        </button>
      </div>

      {/* Transaction history */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">Transaction history</h3>
            {!txLoading && <p className="text-xs text-slate-400 mt-0.5">{total} transactions total</p>}
          </div>
          <TrendingUp className="w-5 h-5 text-slate-300" />
        </div>

        {txLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No transactions yet.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Type</th>
                    <th className="px-6 py-3 text-left">Description</th>
                    <th className="px-6 py-3 text-right">Credits</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap text-xs">
                        {formatDateTime(tx.createdAt)}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full border', txTypeBadge(tx.type))}>
                          {txTypeLabel(tx.type)}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 max-w-[200px] truncate">
                        {tx.description}
                      </td>
                      <td className={cn('px-6 py-3.5 text-right font-semibold', tx.type === 'purchase' ? 'text-green-600' : 'text-slate-700')}>
                        {tx.type === 'purchase' ? '+' : '-'}{tx.credits.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50">
                <p className="text-xs text-slate-400">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Billing Tab
function BillingTab() {
  const { refresh: refreshCredits } = useCredits();
  const [packs, setPacks] = useState<CreditPack[]>(STATIC_PACKS);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    creditsApi.getPacks()
      .then(setPacks)
      .catch(() => {}); // Fallback to static packs on error
  }, []);

  async function handleBuy(pack: CreditPack) {
    setPurchasing(pack.id);
    const loaded = await loadRazorpay();
    if (!loaded) {
      toast.error('Failed to load payment gateway. Please try again.');
      setPurchasing(null);
      return;
    }

    try {
      const order = await creditsApi.createOrder(pack.id);

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Arivarangam',
        description: `${pack.name} — ${pack.credits.toLocaleString('en-IN')} credits`,
        order_id: order.orderId,
        prefill: {},
        theme: {
          color: '#6366f1',
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await creditsApi.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.success(`${pack.credits.toLocaleString('en-IN')} credits added to your account!`);
            refreshCredits();
          } catch (err) {
            toast.error('Payment verification failed: ' + getApiError(err));
          }
        },
        modal: {
          ondismiss: () => setPurchasing(null),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (resp: { error: { description: string } }) => {
        toast.error('Payment failed: ' + resp.error.description);
        setPurchasing(null);
      });
      rzp.open();
    } catch (err) {
      toast.error(getApiError(err));
      setPurchasing(null);
    }
  }

  const packColors: Record<string, { border: string; shadow: string; badge: string; btn: string }> = {
    trial: {
      border: 'border-slate-200',
      shadow: 'shadow-sm',
      badge: '',
      btn: 'bg-slate-800 hover:bg-slate-900 text-white',
    },
    starter: {
      border: 'border-slate-200',
      shadow: 'shadow-sm',
      badge: '',
      btn: 'bg-slate-800 hover:bg-slate-900 text-white',
    },
    pro: {
      border: 'border-indigo-400',
      shadow: 'shadow-lg shadow-indigo-100',
      badge: 'POPULAR',
      btn: 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white',
    },
    business: {
      border: 'border-slate-200',
      shadow: 'shadow-sm',
      badge: '',
      btn: 'bg-slate-800 hover:bg-slate-900 text-white',
    },
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Billing</h2>
        <p className="text-sm text-slate-500">
          Purchase credit packs. Credits never expire. 7-day refund on unused packs.
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-4 max-w-2xl">
        <AlertCircle className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-indigo-700">
          <strong>No subscription.</strong> Pay once, use when you want.
          Credits are consumed per task and do not expire.
        </div>
      </div>

      {/* Pack cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {packs.map((pack) => {
          const colors = packColors[pack.id] ?? packColors.trial;
          const priceINR = pack.priceInPaise / 100;
          const isLoading = purchasing === pack.id;

          return (
            <div
              key={pack.id}
              className={cn(
                'relative bg-white rounded-2xl border-2 p-5',
                colors.border,
                colors.shadow,
              )}
            >
              {colors.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
                  {colors.badge}
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800">{pack.name}</h3>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-black text-slate-900">₹{priceINR}</span>
                </div>
                <p className="text-slate-500 text-sm mt-0.5">
                  <span className="font-bold text-slate-700">{pack.credits.toLocaleString('en-IN')}</span> credits
                </p>
                <p className="text-xs text-slate-400">
                  ≈ ₹{(priceINR / pack.credits).toFixed(2)}/credit
                </p>
              </div>

              <button
                onClick={() => handleBuy(pack)}
                disabled={isLoading || !!purchasing}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  colors.btn,
                )}
              >
                {isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Opening…</>
                ) : (
                  'Buy now'
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Payment note */}
      <p className="text-xs text-slate-400 flex items-center gap-1.5">
        <Shield className="w-3.5 h-3.5" />
        Secured by Razorpay · PCI-DSS compliant · UPI, Cards, Net Banking accepted
      </p>
    </div>
  );
}

// ─── Env Variables Tab ────────────────────────────────────────────────────────
function ApiKeysTab() {
  const [vars, setVars] = useState<EnvVar[]>([])
  const [catalog, setCatalog] = useState<Record<string, ServiceCatalogEntry>>({})
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)
  const [detected, setDetected] = useState<{ missing: string[]; catalog: Record<string, ServiceCatalogEntry> } | null>(null)

  const [addKey, setAddKey] = useState('')
  const [addValue, setAddValue] = useState('')
  const [addLabel, setAddLabel] = useState('')
  const [addService, setAddService] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [showValues, setShowValues] = useState<Record<string, boolean>>({})

  useEffect(() => {
    envVarsApi.list()
      .then(d => { setVars(d.vars); setCatalog(d.catalog) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleDetect = async () => {
    setDetecting(true)
    try {
      const d = await envVarsApi.detect()
      setDetected({ missing: d.missing, catalog: d.catalog })
    } catch { /* ignore */ }
    finally { setDetecting(false) }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addKey || !addValue) return
    setSaving(true); setSaveError(null)
    try {
      const saved = await envVarsApi.upsert({
        key: addKey.trim().toUpperCase(),
        value: addValue.trim(),
        label: addLabel.trim() || undefined,
        service: addService || undefined,
      })
      setVars(prev => {
        const idx = prev.findIndex(v => v.key === saved.key)
        if (idx >= 0) { const n = [...prev]; n[idx] = saved; return n }
        return [...prev, saved]
      })
      setAddKey(''); setAddValue(''); setAddLabel(''); setAddService(''); setShowAdd(false)
    } catch (err) {
      setSaveError(getApiError(err))
    } finally { setSaving(false) }
  }

  const handleDelete = async (key: string) => {
    setDeletingKey(key)
    try {
      await envVarsApi.delete(key)
      setVars(prev => prev.filter(v => v.key !== key))
    } catch { /* ignore */ }
    finally { setDeletingKey(null) }
  }

  const handleQuickAdd = (key: string) => {
    setAddKey(key)
    const svc = Object.entries(catalog).find(([, s]) => s.envKeys.includes(key))
    if (svc) setAddService(svc[0])
    setShowAdd(true)
    setDetected(null)
  }

  const SERVICE_ICONS: Record<string, string> = {
    openai: '🤖', anthropic: '🟣', stripe: '💳', supabase: '⚡', firebase: '🔥',
    aws: '☁️', mongodb: '🍃', twilio: '📱', sendgrid: '📧', razorpay: '💰',
    cloudinary: '🖼️', elevenlabs: '🎙️', github: '🐙', google: '🔍', sarvam: '🇮🇳', perplexity: '🔮',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Environment Variables</h2>
          <p className="text-sm text-slate-500">Store API keys and secrets securely. All values are encrypted at rest.</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={handleDetect}
            disabled={detecting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors disabled:opacity-50"
          >
            {detecting
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Zap className="w-3.5 h-3.5" />
            }
            Smart Detect
          </button>
          <button
            onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-700 rounded-xl transition-colors"
          >
            <Key className="w-3.5 h-3.5" />
            Add variable
          </button>
        </div>
      </div>

      {/* Smart Detect results */}
      {detected && detected.missing.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-2">
            {detected.missing.length} variable{detected.missing.length !== 1 ? 's' : ''} detected in your code but not yet stored:
          </p>
          <div className="flex flex-wrap gap-2">
            {detected.missing.map(k => (
              <button
                key={k}
                onClick={() => handleQuickAdd(k)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-mono font-medium text-amber-900 hover:bg-amber-100 transition-colors"
              >
                <span>+</span> {k}
              </button>
            ))}
          </div>
        </div>
      )}
      {detected && detected.missing.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700 font-medium">
          All detected env variables are already saved.
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleSave} className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Add / Update variable</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Key (e.g. OPENAI_API_KEY) *</label>
              <input
                type="text"
                value={addKey}
                onChange={e => setAddKey(e.target.value.toUpperCase())}
                placeholder="API_KEY_NAME"
                className="input w-full font-mono text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Value *</label>
              <input
                type="password"
                value={addValue}
                onChange={e => setAddValue(e.target.value)}
                placeholder="sk-••••••••"
                className="input w-full font-mono text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Label (optional)</label>
              <input
                type="text"
                value={addLabel}
                onChange={e => setAddLabel(e.target.value)}
                placeholder="My OpenAI key"
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">Service</label>
              <select
                value={addService}
                onChange={e => setAddService(e.target.value)}
                className="input w-full text-sm"
              >
                <option value="">— auto detect —</option>
                {Object.entries(catalog).map(([id, svc]) => (
                  <option key={id} value={id}>{svc.label}</option>
                ))}
              </select>
            </div>
          </div>
          {saveError && <p className="text-xs text-red-600">{saveError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? 'Saving…' : 'Save securely'}
            </button>
            <button type="button" onClick={() => { setShowAdd(false); setSaveError(null) }} className="btn-secondary text-sm py-2 px-4">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Variables list */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : vars.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <Key className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No variables saved yet</p>
          <p className="text-xs mt-1">Click &quot;Smart Detect&quot; to scan your project&apos;s code for needed API keys, or add manually.</p>
        </div>
      ) : (
        <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-50">
          {vars.map(v => {
            const svcInfo = v.service ? catalog[v.service] : null
            return (
              <div key={v.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                <span className="text-xl flex-shrink-0">{v.service ? (SERVICE_ICONS[v.service] ?? '🔑') : '🔑'}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono font-bold text-slate-800">{v.key}</code>
                    {svcInfo && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-medium">
                        {svcInfo.label}
                      </span>
                    )}
                    {v.label && <span className="text-xs text-slate-400 truncate">{v.label}</span>}
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    {showValues[v.id] ? v.maskedValue : '••••••••••••'}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setShowValues(s => ({ ...s, [v.id]: !s[v.id] }))}
                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-xs"
                    title="Toggle visibility"
                  >
                    {showValues[v.id] ? '🙈' : '👁'}
                  </button>
                  {svcInfo && (
                    <a
                      href={svcInfo.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors text-xs"
                      title="View docs"
                    >
                      📖
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(v.key)}
                    disabled={deletingKey === v.key}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingKey === v.key
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <AlertCircle className="w-3.5 h-3.5" />
                    }
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Service catalog quick-start */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Get API Keys — Quick Links</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {Object.entries(catalog).map(([id, svc]) => (
            <a
              key={id}
              href={svc.getUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 rounded-xl text-xs font-medium text-slate-700 hover:text-indigo-700 transition-colors"
            >
              <span>{SERVICE_ICONS[id] ?? '🔑'}</span>
              {svc.label}
            </a>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 mt-3">
          All values are encrypted with AES-256-GCM before being stored. Your keys are never logged or exposed.
        </p>
      </div>
    </div>
  )
}

// ─── Main Settings Page ────────────────────────────────────────────────────────
function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam && TABS.find((t) => t.id === tabParam) ? tabParam : 'profile',
  );

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    router.replace(`/settings?tab=${tab}`, { scroll: false });
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account, security, and billing preferences.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Sidebar tabs */}
        <aside className="lg:w-52 flex-shrink-0">
          <nav className="flex lg:flex-col gap-1 flex-wrap">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => switchTab(id)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 text-left',
                  activeTab === id
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                )}
              >
                <Icon className={cn('w-4 h-4', activeTab === id ? 'text-indigo-500' : 'text-slate-400')} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content area */}
        <main className="flex-1 min-w-0">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 sm:p-8">
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'security' && <SecurityTab />}
            {activeTab === 'credits' && <CreditsTab />}
            {activeTab === 'billing' && <BillingTab />}
            {activeTab === 'api' && <ApiKeysTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>}>
      <SettingsContent />
    </Suspense>
  );
}
