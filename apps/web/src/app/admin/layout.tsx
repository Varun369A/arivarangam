import type { Metadata } from 'next'
import Link from 'next/link'
import { AdminSidebar } from '@/components/AdminSidebar'
import { AutoLogoutWatcher } from '@/components/AutoLogoutWatcher'

export const metadata: Metadata = {
  title: {
    default: 'Admin Panel',
    template: '%s | Admin | Arivarangam',
  },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 40%, #eff6ff 70%, #f0fdf4 100%)', backgroundAttachment: 'fixed'}}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-purple-200 flex items-center px-6 gap-4 shrink-0"
          style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 60%, #6d28d9 100%)' }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-300 animate-pulse-soft" />
            <span className="text-sm font-bold text-white">Admin Panel</span>
          </div>
          <div className="flex-1" />
          <Link
            href="/dashboard"
            className="text-xs text-indigo-100 bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 border border-white/20"
          >
            ← Back to App
          </Link>
          <span className="text-xs text-indigo-200 bg-white/10 px-2 py-1 rounded-lg font-semibold border border-white/20">
            Restricted Access
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
        <AutoLogoutWatcher />
      </div>
    </div>
  )
}
