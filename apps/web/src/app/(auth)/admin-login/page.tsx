'use client'

import { useState, FormEvent, useRef, KeyboardEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'
import Cookies from 'js-cookie'
import { authApi, getApiError } from '@/lib/api'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (d = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: d } }),
}
const stagger = { show: { transition: { staggerChildren: 0.07 } }, hidden: {} }

// ─── OTP Input ────────────────────────────────────────────────────────────────

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.padEnd(6, '').split('').slice(0, 6)

  function handleChange(i: number, char: string) {
    const d = char.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = d
    onChange(next.join('').replace(/\s/g, ''))
    if (d && i < 5) inputs.current[i + 1]?.focus()
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) inputs.current[i - 1]?.focus()
    if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < 5) inputs.current[i + 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) { onChange(pasted); inputs.current[5]?.focus() }
    e.preventDefault()
  }

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length: 6 }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputs.current[i] = el }}
          type="text" inputMode="numeric" maxLength={1}
          value={digits[i] === ' ' ? '' : digits[i]}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-11 text-center text-xl font-bold border-2 rounded-xl focus:outline-none transition-colors bg-white text-[#0A0D14]"
          style={{ height: '52px', borderColor: '#E8E5DF' }}
          onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
          onBlur={e => (e.currentTarget.style.borderColor = '#E8E5DF')}
        />
      ))}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [otp, setOtp] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleStep1(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) { setError('Email and password are required.'); return }
    setLoading(true)
    try {
      await authApi.adminOtpSend({ email: email.trim().toLowerCase(), password })
      setStep(2); startResendCooldown()
    } catch (err) { setError(getApiError(err)) }
    finally { setLoading(false) }
  }

  async function handleStep2(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (otp.length !== 6) { setError('Please enter the 6-digit OTP.'); return }
    setLoading(true)
    try {
      const res = await authApi.adminOtpVerify({ email: email.trim().toLowerCase(), otp })
      const { token, user } = res.data
      if (!user?.isAdmin) { setError('Access denied.'); return }
      Cookies.set('accessToken', token, { expires: 7, sameSite: 'Lax' })
      window.location.href = '/admin'
    } catch (err) { setError(getApiError(err)) }
    finally { setLoading(false) }
  }

  function startResendCooldown() {
    setResendCooldown(60)
    const timer = setInterval(() => setResendCooldown(c => { if (c <= 1) { clearInterval(timer); return 0 } return c - 1 }), 1000)
  }

  async function handleResend() {
    if (resendCooldown > 0) return
    setError(''); setLoading(true)
    try { await authApi.adminOtpSend({ email: email.trim().toLowerCase(), password }); setOtp(''); startResendCooldown() }
    catch (err) { setError(getApiError(err)) }
    finally { setLoading(false) }
  }

  const inp = {
    width: '100%', padding: '10px 14px', borderRadius: '9px', fontSize: '14px',
    border: '1px solid #E8E5DF', background: '#FFFFFF', color: '#0A0D14',
    boxSizing: 'border-box' as const, outline: 'none',
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp} style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 16px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          boxShadow: '0 0 24px rgba(99,102,241,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck style={{ width: '28px', height: '28px', color: '#fff' }} />
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0A0D14', letterSpacing: '-0.3px', margin: '0 0 4px' }}>
          {step === 1 ? 'Admin Access' : 'Verify Identity'}
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
          {step === 1 ? 'Restricted to administrators only' : `OTP sent to ${email.replace(/(.{2}).*@/, '$1***@')}`}
        </p>
      </motion.div>

      {/* Step indicator */}
      <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '28px' }}>
        {[1, 2].map((s) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, transition: 'all 0.2s',
              background: s <= step ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#F3F4F6',
              color: s <= step ? '#fff' : '#9CA3AF',
              boxShadow: s <= step ? '0 0 12px rgba(99,102,241,0.4)' : 'none',
            }}>
              {s}
            </div>
            {s < 2 && (
              <div style={{ width: '32px', height: '2px', borderRadius: '2px', background: step > 1 ? '#6366f1' : '#E8E5DF', transition: 'all 0.3s' }} />
            )}
          </div>
        ))}
      </motion.div>

      {error && (
        <motion.div variants={fadeUp} style={{
          marginBottom: '16px', padding: '12px 16px', borderRadius: '10px',
          background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '14px', fontWeight: 500,
        }}>
          {error}
        </motion.div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <form onSubmit={handleStep1} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <motion.div variants={fadeUp}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }} htmlFor="al-email">
              Email address
            </label>
            <input id="al-email" type="email" autoComplete="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="admin@arivarangam.com"
              style={inp}
              onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
              onBlur={e => (e.currentTarget.style.borderColor = '#E8E5DF')} />
          </motion.div>

          <motion.div variants={fadeUp}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }} htmlFor="al-pw">
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input id="al-pw" type={showPw ? 'text' : 'password'} autoComplete="current-password" value={password}
                onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                style={{ ...inp, paddingRight: '42px' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
                onBlur={e => (e.currentTarget.style.borderColor = '#E8E5DF')} />
              <button type="button" onClick={() => setShowPw(!showPw)} tabIndex={-1}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}>
                {showPw ? <EyeOff style={{ width: '16px', height: '16px' }} /> : <Eye style={{ width: '16px', height: '16px' }} />}
              </button>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <motion.button type="submit" disabled={loading}
              whileHover={!loading ? { scale: 1.02 } : {}} whileTap={!loading ? { scale: 0.98 } : {}}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: loading ? '#374151' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: loading ? 'none' : '0 0 20px rgba(99,102,241,0.35)' }}>
              {loading ? <><Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />Sending OTP…</> : <><ShieldCheck style={{ width: '16px', height: '16px' }} />Continue</>}
            </motion.button>
          </motion.div>
        </form>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <form onSubmit={handleStep2} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <motion.div variants={fadeUp} style={{ textAlign: 'center' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '16px' }}>
              Enter the 6-digit OTP
            </label>
            <OtpInput value={otp} onChange={setOtp} />
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '12px 0 0' }}>
              Check your admin email inbox for the OTP
            </p>
          </motion.div>

          <motion.div variants={fadeUp}>
            <motion.button type="submit" disabled={loading || otp.length !== 6}
              whileHover={!loading && otp.length === 6 ? { scale: 1.02 } : {}} whileTap={!loading && otp.length === 6 ? { scale: 0.98 } : {}}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: (loading || otp.length !== 6) ? 'not-allowed' : 'pointer', opacity: (loading || otp.length !== 6) ? 0.6 : 1, boxShadow: '0 0 20px rgba(99,102,241,0.35)' }}>
              {loading ? <><Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />Verifying…</> : <><ShieldCheck style={{ width: '16px', height: '16px' }} />Verify & Sign in</>}
            </motion.button>
          </motion.div>

          <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button type="button" onClick={() => { setStep(1); setOtp(''); setError('') }}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <ArrowLeft style={{ width: '14px', height: '14px' }} />Back
            </button>
            <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: resendCooldown > 0 ? '#9CA3AF' : '#6366f1', background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer', padding: 0 }}>
              <RefreshCw style={{ width: '13px', height: '13px' }} />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
            </button>
          </motion.div>
        </form>
      )}
    </motion.div>
  )
}
