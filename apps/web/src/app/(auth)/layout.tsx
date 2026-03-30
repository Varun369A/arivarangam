import type { Metadata } from 'next'
import Link from 'next/link'

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
      style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F0FF 50%, #EEF6FF 100%)' }}
    >
      {/* Soft royal orbs */}
      <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)', animation: 'float 14s ease-in-out infinite' }} />
      <div className="absolute bottom-[-15%] right-[-10%] w-[420px] h-[420px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', animation: 'float 18s ease-in-out infinite reverse' }} />
      <div className="absolute top-[40%] right-[15%] w-[260px] h-[260px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.10) 0%, transparent 70%)', animation: 'float 10s ease-in-out infinite' }} />
      <div className="absolute top-[20%] left-[20%] w-[180px] h-[180px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(249,168,37,0.08) 0%, transparent 70%)', animation: 'float 12s ease-in-out infinite' }} />

      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: 'radial-gradient(rgba(79,70,229,0.15) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Logo at top */}
      <div className="relative z-10 mb-8" style={{ animation: 'authCardIn 0.5s cubic-bezier(0.16,1,0.3,1) both' }}>
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 4px 16px rgba(79,70,229,0.35)' }}>
            <span className="text-white font-bold text-base">A</span>
          </div>
          <span className="text-xl font-bold text-[#1E1B4B] group-hover:text-[#4F46E5] transition-colors">arivarangam</span>
        </Link>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div
          className="bg-white rounded-2xl p-8 auth-card-animate"
          style={{
            border: '1px solid #E0E7FF',
            boxShadow: '0 20px 60px rgba(79,70,229,0.12), 0 4px 20px rgba(79,70,229,0.06)',
          }}
        >
          {children}
        </div>
      </div>

      {/* Footer links */}
      <div className="relative z-10 mt-8 flex items-center gap-4 text-xs text-slate-500"
        style={{ animation: 'authCardIn 0.5s 0.2s cubic-bezier(0.16,1,0.3,1) both' }}>
        <Link href="/terms" className="hover:text-[#4F46E5] transition-colors font-medium">Terms</Link>
        <span className="text-slate-300">·</span>
        <Link href="/privacy" className="hover:text-[#4F46E5] transition-colors font-medium">Privacy</Link>
        <span className="text-slate-300">·</span>
        <span>© 2025 Arivarangam</span>
      </div>
    </div>
  )
}
