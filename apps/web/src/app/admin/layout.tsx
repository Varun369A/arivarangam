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
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-surface-border flex items-center px-6 gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse-soft" />
            <span className="text-sm font-semibold text-slate-700">Admin Panel</span>
          </div>
          <div className="flex-1" />
          <Link
            href="/dashboard"
            className="text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5"
          >
            ← Back to App
          </Link>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg font-medium">
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
