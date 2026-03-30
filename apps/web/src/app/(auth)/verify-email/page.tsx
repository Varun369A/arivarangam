'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react'
import { motion } from 'framer-motion'
import { authApi, getApiError } from '@/lib/api'

type State = 'loading' | 'success' | 'error' | 'no-token'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (d = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: d } }),
}
const stagger = { show: { transition: { staggerChildren: 0.07 } }, hidden: {} }

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [state, setState] = useState<State>(token ? 'loading' : 'no-token')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) return
    authApi.verifyEmail(token)
      .then(res => { setState('success'); setMessage(res.message || 'Your email has been verified!') })
      .catch(err => { setState('error'); setMessage(getApiError(err)) })
  }, [token])

  if (state === 'loading') {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          boxShadow: '0 0 24px rgba(99,102,241,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <Loader2 style={{ width: '28px', height: '28px', color: '#fff' }} className="animate-spin" />
        </div>
        <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#0A0D14', margin: '0 0 8px' }}>
          Verifying your email…
        </h1>
        <p style={{ fontSize: '14px', color: '#9CA3AF', margin: 0 }}>
          Please wait a moment.
        </p>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <motion.div variants={stagger} initial="hidden" animate="show" style={{ textAlign: 'center', padding: '24px 0' }}>
        <motion.div variants={fadeUp}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            boxShadow: '0 0 24px rgba(99,102,241,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <CheckCircle2 style={{ width: '28px', height: '28px', color: '#fff' }} />
          </div>
        </motion.div>
        <motion.h1 variants={fadeUp} style={{ fontSize: '22px', fontWeight: 800, color: '#0A0D14', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
          Email verified!
        </motion.h1>
        <motion.p variants={fadeUp} style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 8px', lineHeight: 1.6 }}>
          {message}
        </motion.p>
        <motion.p variants={fadeUp} style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 28px', lineHeight: 1.6 }}>
          Your <strong>100 welcome credits</strong> have been added to your account.
        </motion.p>
        <motion.div variants={fadeUp}>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link href="/login" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '12px 32px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: '14px', fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 0 20px rgba(99,102,241,0.35)',
            }}>
              Sign in to your account →
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    )
  }

  if (state === 'error') {
    return (
      <motion.div variants={stagger} initial="hidden" animate="show" style={{ textAlign: 'center', padding: '24px 0' }}>
        <motion.div variants={fadeUp}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px', background: '#FEF2F2',
            border: '1.5px solid #FECACA',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          }}>
            <XCircle style={{ width: '28px', height: '28px', color: '#DC2626' }} />
          </div>
        </motion.div>
        <motion.h1 variants={fadeUp} style={{ fontSize: '22px', fontWeight: 800, color: '#0A0D14', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
          Verification failed
        </motion.h1>
        <motion.p variants={fadeUp} style={{ fontSize: '14px', color: '#DC2626', fontWeight: 500, margin: '0 0 6px' }}>{message}</motion.p>
        <motion.p variants={fadeUp} style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 28px', lineHeight: 1.6 }}>
          The link may have expired (valid 24 hours) or already been used.
        </motion.p>
        <motion.div variants={fadeUp} style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Link href="/signup" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: '12px 28px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', fontSize: '14px', fontWeight: 700, textDecoration: 'none',
              boxShadow: '0 0 20px rgba(99,102,241,0.35)',
            }}>
              Try signing up again
            </Link>
          </motion.div>
          <Link href="/login" style={{ fontSize: '14px', color: '#6B7280', textDecoration: 'none', fontWeight: 500 }}>
            Back to sign in
          </Link>
        </motion.div>
      </motion.div>
    )
  }

  // no-token
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" style={{ textAlign: 'center', padding: '24px 0' }}>
      <motion.div variants={fadeUp}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '1px solid rgba(196,136,42,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <Mail style={{ width: '28px', height: '28px', color: '#C4882A' }} />
        </div>
      </motion.div>
      <motion.h1 variants={fadeUp} style={{ fontSize: '22px', fontWeight: 800, color: '#0A0D14', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
        Check your inbox
      </motion.h1>
      <motion.p variants={fadeUp} style={{ fontSize: '14px', color: '#6B7280', margin: '0 0 6px', lineHeight: 1.6 }}>
        We sent a verification link to your email when you signed up.
      </motion.p>
      <motion.p variants={fadeUp} style={{ fontSize: '13px', color: '#9CA3AF', margin: '0 0 28px', lineHeight: 1.6 }}>
        Didn&apos;t get it? Check your spam folder or{' '}
        <Link href="/signup" style={{ color: '#6366f1', fontWeight: 600, textDecoration: 'underline' }}>
          sign up again
        </Link>.
      </motion.p>
      <motion.div variants={fadeUp}>
        <Link href="/login" style={{ fontSize: '14px', color: '#6B7280', textDecoration: 'none', fontWeight: 500 }}>
          Back to sign in
        </Link>
      </motion.div>
    </motion.div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Loader2 style={{ width: '28px', height: '28px', margin: '0 auto' }} className="animate-spin text-slate-600" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
