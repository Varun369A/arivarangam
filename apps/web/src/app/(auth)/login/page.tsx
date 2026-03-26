'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { authApi, getApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = 'Email is required.';
    if (!password) errs.password = 'Password is required.';
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await authApi.login({ email: email.trim().toLowerCase(), password });
      router.push('/dashboard');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Heading */}
      <div className="mb-8">
        <h1
          className="mb-1"
          style={{ fontSize: '24px', fontWeight: 800, color: '#0A0D14', letterSpacing: '-0.02em' }}
        >
          Welcome back
        </h1>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Sign in to your Arrivarangam account
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          className="mb-5 px-4 py-3 rounded-xl text-sm font-medium"
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#DC2626',
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Email */}
        <div>
          <label
            className="block text-sm font-semibold mb-1.5"
            htmlFor="email"
            style={{ color: '#374151' }}
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3.5 py-2.5 rounded-lg text-sm transition-shadow outline-none"
            style={{
              border: `1px solid ${fieldErrors.email ? '#DC2626' : '#E8E5DF'}`,
              background: fieldErrors.email ? '#FEF2F2' : '#FFFFFF',
              color: '#0A0D14',
              boxShadow: 'none',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#1E3461')}
            onBlur={e => (e.currentTarget.style.borderColor = fieldErrors.email ? '#DC2626' : '#E8E5DF')}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs" style={{ color: '#DC2626' }}>{fieldErrors.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              className="block text-sm font-semibold"
              htmlFor="password"
              style={{ color: '#374151' }}
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium transition-colors"
              style={{ color: '#C4882A' }}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm transition-shadow outline-none"
              style={{
                border: `1px solid ${fieldErrors.password ? '#DC2626' : '#E8E5DF'}`,
                background: fieldErrors.password ? '#FEF2F2' : '#FFFFFF',
                color: '#0A0D14',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#1E3461')}
              onBlur={e => (e.currentTarget.style.borderColor = fieldErrors.password ? '#DC2626' : '#E8E5DF')}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: '#9CA3AF' }}
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="mt-1 text-xs" style={{ color: '#DC2626' }}>{fieldErrors.password}</p>
          )}
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2">
          <input
            id="remember"
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded"
            style={{ accentColor: '#1E3461' }}
          />
          <label
            htmlFor="remember"
            className="text-sm cursor-pointer select-none"
            style={{ color: '#6B7280' }}
          >
            Remember me for 30 days
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm text-white transition-all duration-200 mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ background: '#1E3461' }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#16284D'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#1E3461'; }}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              Sign in
            </>
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full" style={{ borderTop: '1px solid #E8E5DF' }} />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-white text-xs" style={{ color: '#9CA3AF' }}>
            Don&apos;t have an account?
          </span>
        </div>
      </div>

      <Link
        href="/signup"
        className="block w-full text-center py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
        style={{
          border: '1px solid #E8E5DF',
          color: '#374151',
        }}
      >
        Create a free account
      </Link>
    </>
  );
}
