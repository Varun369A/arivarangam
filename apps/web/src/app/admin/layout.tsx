import type { Metadata } from 'next'
import { AdminSidebar } from '@/components/AdminSidebar'

export const metadata: Metadata = {
  title: {
    default: 'Admin Panel',
    template: '%s | Admin | Arrivarangam',
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
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-lg font-medium">
            Restricted Access
          </span>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
