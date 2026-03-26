import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    default: 'Legal',
    template: '%s | Arrivarangam',
  },
};

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      {/* Simple header */}
      <header className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">A</span>
            </div>
            <span className="font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors text-sm">
              arrivarangam
            </span>
          </Link>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <Link href="/terms" className="hover:text-slate-600 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-600 transition-colors">Privacy</Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 mt-12 py-8">
        <div className="max-w-3xl mx-auto px-4 text-center text-xs text-slate-400">
          © 2025 Arrivarangam · All rights reserved ·{' '}
          <a href="mailto:legal@arivarangam.com" className="hover:text-slate-600 transition-colors">
            legal@arivarangam.com
          </a>
        </div>
      </footer>
    </div>
  );
}
