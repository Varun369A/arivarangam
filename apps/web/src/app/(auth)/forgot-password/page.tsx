'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { authApi, getApiError } from '@/lib/api'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (d = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: d } }),
}
const stagger = { show: { transition: { staggerChildren: 0.07 } }, hidden: {} }

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Please enter your email address.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address.'); return }
    setLoading(true)
    try {
      await authApi.forgotPassword(email.trim().toLowerCase())
      setSent(true)
    } catch (err) {
      setError(getApiError(err))
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <motion.div variants={stagger} initial="hidden" animate="show" className="text-center py-4">
        <motion.div variants={fadeUp}>
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 24px rgba(99,102,241,0.4)' }}>
            <CheckCircle2 className="w-7 h-7 text-white" />
          </div>
        </motion.div>
        <motion.h1 variants={fadeUp} style={{ fontSize: '22px', fontWeight: 800, color: '#0A0D14', letterSpacing: '-0.3px', margin: '0 0 8px' }}>
          Check your inbox
        </motion.h1>
        <motion.p variants={fadeUp} style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 4px' }}>
          We sent a password reset link to
        </motion.p>
        <motion.p variants={fadeUp} style={{ fontSize: '14px', fontWeight: 700, color: '#6366f1', margin: '0 0 20px' }}>
          {email}
        </motion.p>
        <motion.p variants={fadeUp} style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 28px', lineHeight: 1.65 }}>
          If you don&apos;t see it in a few minutes, check your spam folder. The link expires in 1 hour.
        </motion.p>
        <motion.div variants={fadeUp}>
          <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold transition-colors" style={{ color: '#6366f1' }}>
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div variants={stagger} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="text-center mb-7">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
          <Mail className="w-7 h-7 text-white" />
        </div>
        <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0A0D14', letterSpacing: '-0.3px', margin: '0 0 4px' }}>
          Reset your password
        </h1>
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
          Enter the email address linked to your account and we&apos;ll send you a reset link.
        </p>
      </motion.div>

      {error && (
        <motion.div variants={fadeUp} style={{
          marginBottom: '16px', padding: '12px 16px', borderRadius: '10px',
          background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: '14px', fontWeight: 500,
        }}>
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <motion.div variants={fadeUp}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }} htmlFor="fp-email">
            Email address
          </label>
          <input
            id="fp-email" type="email" autoComplete="email"
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: '100%', padding: '10px 14px', borderRadius: '9px', fontSize: '14px', border: '1px solid #E8E5DF', background: '#FFFFFF', color: '#0A0D14', boxSizing: 'border-box', outline: 'none' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#6366f1')}
            onBlur={e => (e.currentTarget.style.borderColor = '#E8E5DF')}
          />
        </motion.div>

        <motion.div variants={fadeUp}>
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', borderRadius: '10px', border: 'none', background: loading ? '#374151' : 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: loading ? 'none' : '0 0 20px rgba(99,102,241,0.35)' }}
          >
            {loading ? <><Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />Sending…</> : 'Send reset link'}
          </motion.button>
        </motion.div>
      </form>

      <motion.div variants={fadeUp} className="mt-6 text-center">
        <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors" style={{ color: '#6B7280' }}>
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </Link>
      </motion.div>
    </motion.div>
  )
}
