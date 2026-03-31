'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, LogIn, Mail, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { authApi, getApiError } from '@/lib/api'
import { Suspense } from 'react'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (d = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: d } }),
}
const stagger = { show: { transition: { staggerChildren: 0.07 } }, hidden: {} }

// ─── Unverified Email Banner ───────────────────────────────────────────────────

function UnverifiedBanner({ email }: { email: string }) {
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
    } catch { /* ignore */ } finally { setResending(false) }
  }

  return (
    <div style={{ marginBottom: '20px', padding: '14px 16px', borderRadius: '12px', background: '#FFFBEB', border: '1px solid rgba(196,136,42,0.4)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <Mail style={{ width: '16px', height: '16px', color: '#C4882A', flexShrink: 0, marginTop: '1px' }} />
        <div style={{ flex: 1 }}>
          <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 700, color: '#92400E' }}>Email not verified</p>
          <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#92400E', lineHeight: 1.5 }}>
            Check your inbox for the link we sent to <strong>{email}</strong>.
          </p>
          <button type="button" onClick={handleResend} disabled={resending || cooldown > 0}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: cooldown > 0 ? '#9CA3AF' : '#C4882A', background: 'none', border: 'none', padding: 0, cursor: cooldown > 0 ? 'not-allowed' : 'pointer' }}>
            {resending ? <><Loader2 style={{ width: '13px', height: '13px' }} className="animate-spin" />Sending…</>
              : cooldown > 0 ? <><RefreshCw style={{ width: '13px', height: '13px' }} />Resend in {cooldown}s</>
              : <><RefreshCw style={{ width: '13px', height: '13px' }} />{resent ? 'Email resent!' : 'Resend verification email'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Login Form ────────────────────────────────────────────────────────────────

function LoginForm() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/arena'
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [unverifiedEmail, setUnverifiedEmail] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(''); setUnverifiedEmail(''); setFieldErrors({})
    const errs: Record<string, string> = {}
    if (!email.trim()) errs.email = 'Email is required.'
    if (!password) errs.password = 'Password is required.'
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setLoading(true)
    try {
      await login({ email: email.trim().toLowerCase(), password })
      if (redirect && redirect !== '/arena') window.location.href = redirect
    } catch (err: any) {
      const raw = err?.message || ''
      if (raw.toLowerCase().includes('verify') || raw.toLowerCase().includes('not verified')) {
        setUnverifiedEmail(email.trim().toLowerCase())
      } else {
        setError(raw || 'Invalid email or password.')
      }
    } finally { setLoading(false) }
  }

  const inp = (hasErr: boolean) => ({
    border: `1px solid ${hasErr ? '#DC2626' : '#E8E5DF'}`,
    background: hasErr ? '#FEF2F2' : '#FFFFFF',
    color: '#0A0D14',
  })

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <motion.div variants={fadeUp} style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0A0D14', letterSpacing: '-0.3px', margin: '0 0 4px' }}>
          Welcome back
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>Sign in to your Arivarangam account</p>
      </motion.div>

      {unverifiedEmail && <UnverifiedBanner email={unverifiedEmail} />}

      {error && !unverifiedEmail && (
        <motion.div variants={fadeUp} style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '10px', background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '14px', fontWeight: 500 }}>
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <motion.div variants={fadeUp}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }} htmlFor="lg-email">Email address</label>
          <input id="lg-email" type="email" autoComplete="email" value={email}
            onChange={e => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors(f => { const c = { ...f }; delete c.email; return c }) }}
            placeholder="you@example.com"
            style={{ ...inp(!!fieldErrors.email), width: '100%', padding: '10px 14px', borderRadius: '9px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
            onBlur={e => (e.currentTarget.style.borderColor = fieldErrors.email ? '#DC2626' : '#E8E5DF')} />
          {fieldErrors.email && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#DC2626' }}>{fieldErrors.email}</p>}
        </motion.div>

        <motion.div variants={fadeUp}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }} htmlFor="lg-pw">Password</label>
            <Link href="/forgot-password" style={{ fontSize: '12px', fontWeight: 600, color: '#6366f1', textDecoration: 'none' }}>Forgot password?</Link>
          </div>
          <div style={{ position: 'relative' }}>
            <input id="lg-pw" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password}
              onChange={e => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors(f => { const c = { ...f }; delete c.password; return c }) }}
              placeholder="••••••••"
              style={{ ...inp(!!fieldErrors.password), width: '100%', padding: '10px 42px 10px 14px', borderRadius: '9px', fontSize: '14px', boxSizing: 'border-box', outline: 'none' }}
              onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
              onBlur={e => (e.currentTarget.style.borderColor = fieldErrors.password ? '#DC2626' : '#E8E5DF')} />
            <button type="button" onClick={() => setShowPw(!showPw)} tabIndex={-1}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}>
              {showPw ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
            </button>
          </div>
          {fieldErrors.password && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#DC2626' }}>{fieldErrors.password}</p>}
        </motion.div>

        <motion.div variants={fadeUp}>
          <motion.button type="submit" disabled={loading}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: loading ? '#374151' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '4px', boxShadow: loading ? 'none' : '0 0 20px rgba(99,102,241,0.35)' }}>
            {loading ? <><Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />Signing in…</> : <><LogIn style={{ width: '16px', height: '16px' }} />Sign in</>}
          </motion.button>
        </motion.div>
      </form>

      <motion.div variants={fadeUp} style={{ position: 'relative', margin: '24px 0' }}>
        <div style={{ position: 'absolute', inset: '0', display: 'flex', alignItems: 'center' }}>
          <div style={{ width: '100%', borderTop: '1px solid #E8E5DF' }} />
        </div>
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <span style={{ padding: '0 12px', background: '#fff', fontSize: '12px', color: '#9CA3AF' }}>Don&apos;t have an account?</span>
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Link href="/signup" style={{ display: 'block', width: '100%', textAlign: 'center', padding: '11px', borderRadius: '10px', border: '1.5px solid #E8E5DF', color: '#374151', fontSize: '14px', fontWeight: 600, textDecoration: 'none', boxSizing: 'border-box' }}>
          Create a free account
        </Link>
      </motion.div>
    </motion.div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
