'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2, UserPlus, Sparkles, Mail, CheckCircle2, RefreshCw } from 'lucide-react'
import { authApi, getApiError } from '@/lib/api'

// ─── Check Email Screen ────────────────────────────────────────────────────────

function CheckEmailScreen({ email }: { email: string }) {
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  async function handleResend() {
    if (cooldown > 0 || resending) return
    setResending(true)
    try {
      await authApi.resendVerification(email)
      setResent(true)
      setCooldown(60)
      const t = setInterval(() => setCooldown(c => { if (c <= 1) { clearInterval(t); return 0 } return c - 1 }), 1000)
    } catch {
      // ignore
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="text-center py-2">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
        style={{ background: 'linear-gradient(135deg, #1E3461 0%, #C4882A 100%)' }}>
        <Mail className="w-8 h-8 text-white" />
      </div>

      <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0A0D14', letterSpacing: '-0.3px', margin: '0 0 8px' }}>
        Check your email
      </h1>
      <p style={{ fontSize: '15px', color: '#6B7280', margin: '0 0 4px', lineHeight: 1.6 }}>
        We sent a verification link to
      </p>
      <p style={{ fontSize: '15px', fontWeight: 700, color: '#1E3461', margin: '0 0 20px' }}>
        {email}
      </p>
      <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 28px', lineHeight: 1.65 }}>
        Click the link in that email to verify your address and activate your account.
        The link expires in <strong>24 hours</strong>.
      </p>

      <div style={{
        background: '#F7F6F3',
        border: '1px solid #E8E5DF',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '24px',
        textAlign: 'left',
      }}>
        <p style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 600, color: '#374151' }}>
          Didn&apos;t get it?
        </p>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#6B7280', lineHeight: 1.7 }}>
          <li>Check your spam or junk folder</li>
          <li>Make sure you typed the right email</li>
          <li>Wait a minute and try resending</li>
        </ul>
      </div>

      {resent && (
        <div style={{
          background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px',
          padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <CheckCircle2 style={{ width: '16px', height: '16px', color: '#16A34A', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: '#166534', fontWeight: 500 }}>Verification email resent!</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleResend}
        disabled={resending || cooldown > 0}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          width: '100%', padding: '11px', borderRadius: '10px', border: '1.5px solid #E8E5DF',
          background: '#fff', fontSize: '14px', fontWeight: 600,
          color: cooldown > 0 ? '#9CA3AF' : '#1E3461',
          cursor: cooldown > 0 ? 'not-allowed' : 'pointer',
          marginBottom: '16px',
          opacity: resending ? 0.6 : 1,
        }}
      >
        {resending
          ? <><Loader2 style={{ width: '15px', height: '15px' }} className="animate-spin" />Resending…</>
          : cooldown > 0
            ? <><RefreshCw style={{ width: '15px', height: '15px' }} />Resend in {cooldown}s</>
            : <><RefreshCw style={{ width: '15px', height: '15px' }} />Resend verification email</>
        }
      </button>

      <Link
        href="/login"
        style={{ fontSize: '14px', color: '#6B7280', textDecoration: 'none', fontWeight: 500 }}
      >
        Back to sign in
      </Link>
    </div>
  )
}

// ─── Signup Form ───────────────────────────────────────────────────────────────

export default function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' })
  const [terms, setTerms] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [successEmail, setSuccessEmail] = useState('')

  function update(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }))
    if (fieldErrors[key]) setFieldErrors(fe => { const c = { ...fe }; delete c[key]; return c })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Name is required.'
    if (!form.email.trim()) errs.email = 'Email is required.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email.'
    if (!form.password) errs.password = 'Password is required.'
    else if (form.password.length < 8) errs.password = 'At least 8 characters.'
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.'
    if (!terms) errs.terms = 'You must accept the terms to continue.'
    if (Object.keys(errs).length) { setFieldErrors(errs); return }

    setLoading(true)
    try {
      const res = await authApi.signup({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      })
      setSuccessEmail(res.data.email)
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setLoading(false)
    }
  }

  // ── Success: show check-email screen
  if (successEmail) {
    return <CheckEmailScreen email={successEmail} />
  }

  const inp = (hasErr: boolean) => ({
    border: `1px solid ${hasErr ? '#DC2626' : '#E8E5DF'}`,
    background: hasErr ? '#FEF2F2' : '#FFFFFF',
    color: '#0A0D14',
  })

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          fontSize: '12px', fontWeight: 700, padding: '6px 14px', borderRadius: '99px',
          background: '#FEF3C7', border: '1px solid rgba(196,136,42,0.35)', color: '#92400E',
        }}>
          <Sparkles style={{ width: '13px', height: '13px', color: '#C4882A' }} />
          100 free credits on signup!
        </div>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0A0D14', letterSpacing: '-0.3px', margin: '0 0 4px' }}>
          Create your account
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>Start building with AI in seconds</p>
      </div>

      {error && (
        <div style={{
          marginBottom: '16px', padding: '12px 16px', borderRadius: '10px',
          background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '14px', fontWeight: 500,
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Name */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }} htmlFor="name">
            Full name
          </label>
          <input
            id="name" type="text" autoComplete="name"
            value={form.name} onChange={e => update('name', e.target.value)}
            placeholder="Arun Kumar"
            style={{ ...inp(!!fieldErrors.name), width: '100%', padding: '10px 14px', borderRadius: '9px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#1E3461')}
            onBlur={e => (e.currentTarget.style.borderColor = fieldErrors.name ? '#DC2626' : '#E8E5DF')}
          />
          {fieldErrors.name && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#DC2626' }}>{fieldErrors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }} htmlFor="su-email">
            Email address
          </label>
          <input
            id="su-email" type="email" autoComplete="email"
            value={form.email} onChange={e => update('email', e.target.value)}
            placeholder="you@example.com"
            style={{ ...inp(!!fieldErrors.email), width: '100%', padding: '10px 14px', borderRadius: '9px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#1E3461')}
            onBlur={e => (e.currentTarget.style.borderColor = fieldErrors.email ? '#DC2626' : '#E8E5DF')}
          />
          {fieldErrors.email && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#DC2626' }}>{fieldErrors.email}</p>}
        </div>

        {/* Password */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }} htmlFor="su-pw">
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="su-pw" type={showPw ? 'text' : 'password'} autoComplete="new-password"
              value={form.password} onChange={e => update('password', e.target.value)}
              placeholder="Min. 8 characters"
              style={{ ...inp(!!fieldErrors.password), width: '100%', padding: '10px 42px 10px 14px', borderRadius: '9px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#1E3461')}
              onBlur={e => (e.currentTarget.style.borderColor = fieldErrors.password ? '#DC2626' : '#E8E5DF')}
            />
            <button type="button" onClick={() => setShowPw(!showPw)} tabIndex={-1}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}>
              {showPw ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
            </button>
          </div>
          {fieldErrors.password && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#DC2626' }}>{fieldErrors.password}</p>}
        </div>

        {/* Confirm Password */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }} htmlFor="su-confirm">
            Confirm password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="su-confirm" type={showConfirmPw ? 'text' : 'password'} autoComplete="new-password"
              value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)}
              placeholder="Repeat your password"
              style={{ ...inp(!!fieldErrors.confirmPassword), width: '100%', padding: '10px 42px 10px 14px', borderRadius: '9px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#1E3461')}
              onBlur={e => (e.currentTarget.style.borderColor = fieldErrors.confirmPassword ? '#DC2626' : '#E8E5DF')}
            />
            <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} tabIndex={-1}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}>
              {showConfirmPw ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
            </button>
          </div>
          {fieldErrors.confirmPassword && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#DC2626' }}>{fieldErrors.confirmPassword}</p>}
        </div>

        {/* Terms */}
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <input
              id="terms" type="checkbox" checked={terms}
              onChange={e => { setTerms(e.target.checked); if (fieldErrors.terms) setFieldErrors(fe => { const c = { ...fe }; delete c.terms; return c }) }}
              style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#1E3461', flexShrink: 0, cursor: 'pointer' }}
            />
            <label htmlFor="terms" style={{ fontSize: '13px', color: '#6B7280', lineHeight: 1.6, cursor: 'pointer' }}>
              I agree to the{' '}
              <Link href="/terms" target="_blank" style={{ color: '#1E3461', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link href="/privacy" target="_blank" style={{ color: '#1E3461', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                Privacy Policy
              </Link>
            </label>
          </div>
          {fieldErrors.terms && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#DC2626' }}>{fieldErrors.terms}</p>}
        </div>

        {/* Submit */}
        <button
          type="submit" disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
            background: loading ? '#374151' : '#1E3461', color: '#fff',
            fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1, marginTop: '4px',
          }}
        >
          {loading
            ? <><Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />Creating account…</>
            : <><UserPlus style={{ width: '16px', height: '16px' }} />Create free account</>
          }
        </button>
      </form>

      <div style={{ position: 'relative', margin: '24px 0' }}>
        <div style={{ position: 'absolute', inset: '0', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', borderTop: '1px solid #E8E5DF' }} />
        </div>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <span style={{ padding: '0 12px', background: '#fff', fontSize: '12px', color: '#9CA3AF' }}>
            Already have an account?
          </span>
        </div>
      </div>

      <Link href="/login" style={{
        display: 'block', width: '100%', textAlign: 'center', padding: '11px',
        borderRadius: '10px', border: '1.5px solid #E8E5DF', color: '#374151',
        fontSize: '14px', fontWeight: 600, textDecoration: 'none', boxSizing: 'border-box',
      }}>
        Sign in instead
      </Link>
    </>
  )
}
