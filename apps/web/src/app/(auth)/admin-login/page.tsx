'use client';

import { useState, FormEvent, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';
import Cookies from 'js-cookie';
import { authApi, getApiError } from '@/lib/api';

// ─── OTP Input ────────────────────────────────────────────────────────────────

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(6, '').split('').slice(0, 6);

  function handleChange(i: number, char: string) {
    const d = char.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[i] = d;
    onChange(next.join('').replace(/\s/g, ''));
    if (d && i < 5) inputs.current[i + 1]?.focus();
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) inputs.current[i + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      onChange(pasted);
      inputs.current[5]?.focus();
    }
    e.preventDefault();
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[i] === ' ' ? '' : digits[i]}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-11 h-13 text-center text-xl font-bold border-2 border-[#E8E5DF] rounded-xl
            focus:border-[#1E3461] focus:outline-none focus:ring-0 bg-white text-[#0A0D14]
            transition-colors"
          style={{ height: '52px' }}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminLoginPage() {
  const router = useRouter();

  // Step 1 state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Step 2 state
  const [otp, setOtp] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  // Shared
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── Step 1: validate credentials & send OTP ────────────────────────────────

  async function handleStep1(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    try {
      await authApi.adminOtpSend({ email: email.trim().toLowerCase(), password });
      setStep(2);
      startResendCooldown();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  // ─── Step 2: verify OTP ──────────────────────────────────────────────────────

  async function handleStep2(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (otp.length !== 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.adminOtpVerify({ email: email.trim().toLowerCase(), otp });
      const { token, user } = res.data;
      if (!user?.isAdmin) {
        setError('Access denied.');
        return;
      }
      Cookies.set('accessToken', token, { expires: 7, sameSite: 'Lax' });
      window.location.href = '/admin';
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  // ─── Resend OTP ───────────────────────────────────────────────────────────────

  function startResendCooldown() {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError('');
    setLoading(true);
    try {
      await authApi.adminOtpSend({ email: email.trim().toLowerCase(), password });
      setOtp('');
      startResendCooldown();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-md"
            style={{ background: 'linear-gradient(135deg, #1E3461 0%, #C4882A 100%)' }}>
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#0A0D14' }}>
          {step === 1 ? 'Admin Access' : 'Verify Identity'}
        </h1>
        <p className="text-sm" style={{ color: '#6B7280' }}>
          {step === 1
            ? 'Restricted to administrators only'
            : `OTP sent to ${email.replace(/(.{2}).*@/, '$1***@')}`}
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 justify-center mb-8">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: s <= step ? '#1E3461' : '#F3F4F6',
                color: s <= step ? '#fff' : '#9CA3AF',
              }}
            >
              {s}
            </div>
            {s < 2 && (
              <div className="w-8 h-0.5 rounded" style={{ background: step > 1 ? '#1E3461' : '#E8E5DF' }} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* ── Step 1 ── */}
      {step === 1 && (
        <form onSubmit={handleStep1} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }} htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@arivarangam.com"
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm placeholder:text-[#9CA3AF]
                focus:outline-none focus:ring-2 focus:ring-[#1E3461]/20 focus:border-[#1E3461] transition-all"
              style={{ borderColor: '#E8E5DF', color: '#0A0D14' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }} htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border text-sm placeholder:text-[#9CA3AF]
                  focus:outline-none focus:ring-2 focus:ring-[#1E3461]/20 focus:border-[#1E3461] transition-all"
                style={{ borderColor: '#E8E5DF', color: '#0A0D14' }}
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
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm
              text-white transition-all duration-200 shadow-sm mt-2 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: loading ? '#374151' : '#1E3461' }}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Sending OTP…</>
            ) : (
              <><ShieldCheck className="w-4 h-4" />Continue</>
            )}
          </button>
        </form>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <form onSubmit={handleStep2} noValidate className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-center mb-4" style={{ color: '#374151' }}>
              Enter the 6-digit OTP
            </label>
            <OtpInput value={otp} onChange={setOtp} />
            <p className="text-xs text-center mt-3" style={{ color: '#9CA3AF' }}>
              Check your admin email inbox for the OTP
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm
              text-white transition-all duration-200 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: '#1E3461' }}
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Verifying…</>
            ) : (
              <><ShieldCheck className="w-4 h-4" />Verify & Sign in</>
            )}
          </button>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => { setStep(1); setOtp(''); setError(''); }}
              className="flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: '#6B7280' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0 || loading}
              className="flex items-center gap-1.5 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ color: resendCooldown > 0 ? '#9CA3AF' : '#C4882A' }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
            </button>
          </div>
        </form>
      )}
    </>
  );
}
