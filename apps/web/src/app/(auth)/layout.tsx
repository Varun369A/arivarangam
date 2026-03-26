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
      style={{ background: '#FFFFFF' }}
    >
      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#E8E5DF 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.65,
        }}
      />

      {/* Logo at top */}
      <div className="relative z-10 mb-8">
        <Link href="/">
          <Logo size={32} showText={true} />
        </Link>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div
          className="bg-white rounded-2xl p-8"
          style={{
            border: '1px solid #E8E5DF',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          {children}
        </div>
      </div>

      {/* Footer links */}
      <div className="relative z-10 mt-8 flex items-center gap-4 text-xs" style={{ color: '#9CA3AF' }}>
        <Link href="/terms" className="hover:text-[#374151] transition-colors">
          Terms
        </Link>
        <span>·</span>
        <Link href="/privacy" className="hover:text-[#374151] transition-colors">
          Privacy
        </Link>
        <span>·</span>
        <span>© 2025 Arivarangam</span>
      </div>
    </div>
  )
}
