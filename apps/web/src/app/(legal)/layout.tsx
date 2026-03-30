import Link from 'next/link';
import type { Metadata } from 'next';
import { Logo } from '@/components/Logo';

export const metadata: Metadata = {
  title: {
    default: 'Legal',
    template: '%s | Arivarangam',
  },
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#FFFFFF' }}>
      {/* Header */}
      <header
        className="bg-white sticky top-0 z-30"
        style={{ borderBottom: '1px solid #E8E5DF' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/">
            <Logo size={26} showText={true} />
          </Link>
          <div className="flex items-center gap-5 text-xs font-medium" style={{ color: '#6B7280' }}>
            <Link href="/" className="hover:text-[#4F46E5] transition-colors">
              ← Back to home
            </Link>
            <Link href="/terms" className="hover:text-[#4F46E5] transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-[#4F46E5] transition-colors">Privacy</Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {children}
      </main>

      {/* Footer */}
      <footer className="mt-12 py-8" style={{ borderTop: '1px solid #E8E5DF' }}>
        <div className="max-w-3xl mx-auto px-4 text-center text-xs" style={{ color: '#9CA3AF' }}>
          © 2025 Arivarangam · All rights reserved ·{' '}
          <a
            href="mailto:legal@arivarangam.com"
            className="transition-colors"
            style={{ color: '#9CA3AF' }}
          >
            legal@arivarangam.com
          </a>
        </div>
      </footer>
    </div>
  );
}
