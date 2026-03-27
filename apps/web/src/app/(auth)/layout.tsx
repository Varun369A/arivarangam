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
      className="min-h-screen flex flex-col items-center justify-center relative"
      style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 40%, #2563eb 100%)' }}
    >
      {/* Subtle dot grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Logo at top */}
      <div className="relative z-10 mb-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-base">A</span>
          </div>
          <span className="text-xl font-bold text-white group-hover:text-indigo-100 transition-colors">arivarangam</span>
        </Link>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div
          className="bg-white rounded-2xl p-8"
          style={{
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}
        >
          {children}
        </div>
      </div>

      {/* Footer links */}
      <div className="relative z-10 mt-8 flex items-center gap-4 text-xs text-indigo-200">
        <Link href="/terms" className="hover:text-white transition-colors">
          Terms
        </Link>
        <span>·</span>
        <Link href="/privacy" className="hover:text-white transition-colors">
          Privacy
        </Link>
        <span>·</span>
        <span>© 2025 Arivarangam</span>
      </div>
    </div>
  )
}
