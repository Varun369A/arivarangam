import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/Logo'

export const metadata: Metadata = {
  title: {
    default: 'Sign In',
    template: '%s | Arivarangam',
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #05061a 0%, #0d0a2e 40%, #07061e 100%)' }}
    >
      {/* Animated orbs */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)', animation: 'float 14s ease-in-out infinite' }} />
      <div className="absolute bottom-[-15%] right-[-10%] w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)', animation: 'float 18s ease-in-out infinite reverse' }} />
      <div className="absolute top-[40%] right-[15%] w-[260px] h-[260px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', animation: 'float 10s ease-in-out infinite' }} />

      {/* Dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Logo at top */}
      <div className="relative z-10 mb-8" style={{ animation: 'authCardIn 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
            <span className="text-white font-bold text-base">A</span>
          </div>
          <span className="text-xl font-bold text-white group-hover:text-indigo-200 transition-colors">arivarangam</span>
        </Link>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div
          className="bg-white rounded-2xl p-8 auth-card-animate"
          style={{
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 60px rgba(99,102,241,0.1)',
          }}
        >
          {children}
        </div>
      </div>

      {/* Footer links */}
      <div className="relative z-10 mt-8 flex items-center gap-4 text-xs text-slate-500"
        style={{ animation: 'authCardIn 0.5s 0.2s cubic-bezier(0.16,1,0.3,1) both' }}>
        <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms</Link>
        <span>·</span>
        <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy</Link>
        <span>·</span>
        <span>© 2025 Arivarangam</span>
      </div>
    </div>
  )
}
