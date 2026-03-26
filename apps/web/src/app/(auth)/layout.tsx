import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: {
    default: 'Sign In',
    template: '%s | Arrivarangam',
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Pastel gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, #f0e7ff 0%, #e8edff 30%, #e0eaff 55%, #dbeafe 80%, #e0f2fe 100%)',
        }}
      />

      {/* Decorative blobs */}
      <div
        className="absolute top-[-10%] left-[-5%] w-96 h-96 rounded-full opacity-30 animate-float"
        style={{
          background: 'radial-gradient(circle, #c4b5fd 0%, #a5b4fc 100%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] w-80 h-80 rounded-full opacity-25 animate-float"
        style={{
          background: 'radial-gradient(circle, #93c5fd 0%, #6ee7b7 100%)',
          filter: 'blur(60px)',
          animationDelay: '2s',
        }}
      />
      <div
        className="absolute top-[40%] right-[10%] w-64 h-64 rounded-full opacity-20 animate-float"
        style={{
          background: 'radial-gradient(circle, #f9a8d4 0%, #c4b5fd 100%)',
          filter: 'blur(50px)',
          animationDelay: '4s',
        }}
      />

      {/* Logo */}
      <div className="relative z-10 mb-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-brand-purple flex items-center justify-center shadow-glow">
            <span className="text-white font-bold text-base leading-none">A</span>
          </div>
          <span className="text-xl font-bold text-slate-800 group-hover:text-primary-600 transition-colors">
            arrivarangam
          </span>
        </Link>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="bg-white/90 backdrop-blur-md rounded-xl3 border border-white/70 shadow-xl p-8">
          {children}
        </div>
      </div>

      {/* Footer links */}
      <div className="relative z-10 mt-8 flex items-center gap-4 text-xs text-slate-500">
        <Link href="/terms" className="hover:text-slate-700 transition-colors">
          Terms
        </Link>
        <span>·</span>
        <Link href="/privacy" className="hover:text-slate-700 transition-colors">
          Privacy
        </Link>
        <span>·</span>
        <span>© 2025 Arrivarangam</span>
      </div>
    </div>
  )
}
