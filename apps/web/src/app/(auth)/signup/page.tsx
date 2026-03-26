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
      {/* Badge */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 text-indigo-700 text-xs font-semibold px-3.5 py-1.5 rounded-full">
          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          100 free credits on signup!
        </div>
      </div>

      <div className="text-center mb-7">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Create your account</h1>
        <p className="text-sm text-slate-500">Start building with AI in seconds</p>
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="name">
            Full name
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Arun Kumar"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow
              ${fieldErrors.name ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'}`}
          />
          {fieldErrors.name && <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="signup-email">
            Email address
          </label>
          <input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            placeholder="you@example.com"
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-800 placeholder:text-slate-400
              focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow
              ${fieldErrors.email ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'}`}
          />
          {fieldErrors.email && <p className="mt-1 text-xs text-red-600">{fieldErrors.email}</p>}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="signup-pw">
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
              className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm text-slate-800 placeholder:text-slate-400
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow
                ${fieldErrors.password ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'}`}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.password && <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="signup-confirm-pw">
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
              className={`w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm text-slate-800 placeholder:text-slate-400
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow
                ${fieldErrors.confirmPassword ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'}`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPw(!showConfirmPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.confirmPassword}</p>
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
              className="w-4 h-4 mt-0.5 accent-indigo-600 rounded flex-shrink-0"
            />
            <label htmlFor="terms" className="text-sm text-slate-600 cursor-pointer select-none leading-relaxed">
              I agree to the{' '}
              <Link href="/terms" className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2" target="_blank">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2" target="_blank">
                Privacy Policy
              </Link>
            </label>
          </div>
          {fieldErrors.terms && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.terms}</p>}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm text-white
            bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800
            disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-indigo-100 mt-1"
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

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="px-3 bg-white text-xs text-slate-400">Already have an account?</span>
        </div>
      </div>

      <Link
        href="/login"
        className="block w-full text-center py-2.5 rounded-xl border border-slate-200 text-slate-700 font-medium text-sm
          hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
      >
        Sign in instead
      </Link>
    </>
  );
}
