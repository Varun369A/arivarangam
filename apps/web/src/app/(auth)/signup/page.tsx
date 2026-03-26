'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, UserPlus, Sparkles } from 'lucide-react';
import { authApi, getApiError } from '@/lib/api';

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [terms, setTerms] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((fe) => { const copy = { ...fe }; delete copy[key]; return copy; });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name is required.';
    if (!form.email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Please enter a valid email.';
    if (!form.password) errs.password = 'Password is required.';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    if (!terms) errs.terms = 'You must accept terms to continue.';

    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      await authApi.signup({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Free credits badge */}
      <div className="flex justify-center mb-6">
        <div
          className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full"
          style={{
            background: '#FEF3C7',
            border: '1px solid #C4882A40',
            color: '#92400E',
          }}
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: '#C4882A' }} />
          100 free credits on signup!
        </div>
      </div>

      {/* Heading */}
      <div className="mb-7">
        <h1
          className="mb-1"
          style={{ fontSize: '24px', fontWeight: 800, color: '#0A0D14', letterSpacing: '-0.02em' }}
        >
          Create your account
        </h1>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          Start building with AI in seconds
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

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Name */}
        <div>
          <label
            className="block text-sm font-semibold mb-1.5"
            htmlFor="name"
            style={{ color: '#374151' }}
          >
            Full name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Arun Kumar"
            className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-shadow"
            style={{
              border: `1px solid ${fieldErrors.name ? '#DC2626' : '#E8E5DF'}`,
              background: fieldErrors.name ? '#FEF2F2' : '#FFFFFF',
              color: '#0A0D14',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#1E3461')}
            onBlur={e => (e.currentTarget.style.borderColor = fieldErrors.name ? '#DC2626' : '#E8E5DF')}
          />
          {fieldErrors.name && <p className="mt-1 text-xs" style={{ color: '#DC2626' }}>{fieldErrors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label
            className="block text-sm font-semibold mb-1.5"
            htmlFor="signup-email"
            style={{ color: '#374151' }}
          >
            Email address
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="you@example.com"
            className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-shadow"
            style={{
              border: `1px solid ${fieldErrors.email ? '#DC2626' : '#E8E5DF'}`,
              background: fieldErrors.email ? '#FEF2F2' : '#FFFFFF',
              color: '#0A0D14',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = '#1E3461')}
            onBlur={e => (e.currentTarget.style.borderColor = fieldErrors.email ? '#DC2626' : '#E8E5DF')}
          />
          {fieldErrors.email && <p className="mt-1 text-xs" style={{ color: '#DC2626' }}>{fieldErrors.email}</p>}
        </div>

        {/* Password */}
        <div>
          <label
            className="block text-sm font-semibold mb-1.5"
            htmlFor="signup-pw"
            style={{ color: '#374151' }}
          >
            Password
          </label>
          <div className="relative">
            <input
              id="signup-pw"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="Min. 8 characters"
              className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm outline-none transition-shadow"
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
          {fieldErrors.password && <p className="mt-1 text-xs" style={{ color: '#DC2626' }}>{fieldErrors.password}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label
            className="block text-sm font-semibold mb-1.5"
            htmlFor="signup-confirm-pw"
            style={{ color: '#374151' }}
          >
            Confirm password
          </label>
          <div className="relative">
            <input
              id="signup-confirm-pw"
              type={showConfirmPw ? 'text' : 'password'}
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(e) => update('confirmPassword', e.target.value)}
              placeholder="Repeat your password"
              className="w-full px-3.5 py-2.5 pr-10 rounded-lg text-sm outline-none transition-shadow"
              style={{
                border: `1px solid ${fieldErrors.confirmPassword ? '#DC2626' : '#E8E5DF'}`,
                background: fieldErrors.confirmPassword ? '#FEF2F2' : '#FFFFFF',
                color: '#0A0D14',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#1E3461')}
              onBlur={e => (e.currentTarget.style.borderColor = fieldErrors.confirmPassword ? '#DC2626' : '#E8E5DF')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPw(!showConfirmPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: '#9CA3AF' }}
              tabIndex={-1}
            >
              {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p className="mt-1 text-xs" style={{ color: '#DC2626' }}>{fieldErrors.confirmPassword}</p>
          )}
        </div>

        {/* Terms */}
        <div>
          <div className="flex items-start gap-2">
            <input
              id="terms"
              type="checkbox"
              checked={terms}
              onChange={(e) => {
                setTerms(e.target.checked);
                if (fieldErrors.terms) setFieldErrors((fe) => { const copy = { ...fe }; delete copy.terms; return copy; });
              }}
              className="w-4 h-4 mt-0.5 rounded flex-shrink-0"
              style={{ accentColor: '#1E3461' }}
            />
            <label
              htmlFor="terms"
              className="text-sm cursor-pointer select-none leading-relaxed"
              style={{ color: '#6B7280' }}
            >
              I agree to the{' '}
              <Link
                href="/terms"
                className="underline underline-offset-2 transition-colors"
                style={{ color: '#1E3461' }}
                target="_blank"
              >
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link
                href="/privacy"
                className="underline underline-offset-2 transition-colors"
                style={{ color: '#1E3461' }}
                target="_blank"
              >
                Privacy Policy
              </Link>
            </label>
          </div>
          {fieldErrors.terms && (
            <p className="mt-1.5 text-xs" style={{ color: '#DC2626' }}>{fieldErrors.terms}</p>
          )}
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
              Creating account…
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Create free account
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
            Already have an account?
          </span>
        </div>
      </div>

      <Link
        href="/login"
        className="block w-full text-center py-2.5 rounded-lg font-medium text-sm transition-all duration-200"
        style={{
          border: '1px solid #E8E5DF',
          color: '#374151',
        }}
      >
        Sign in instead
      </Link>
    </>
  );
}
