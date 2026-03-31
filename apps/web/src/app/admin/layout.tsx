import type { Metadata } from 'next'
import { AdminSidebar } from '@/components/AdminSidebar'
import { AutoLogoutWatcher } from '@/components/AutoLogoutWatcher'
import { AdminHeaderActions } from '@/components/AdminHeaderActions'

export const metadata: Metadata = {
  title: {
    default: 'Admin Panel',
    template: '%s | Admin | Arivarangam',
  },
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F0FF 50%, #EEF6FF 100%)', backgroundAttachment: 'fixed' }}>
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-[#E0E7FF] flex items-center px-6 gap-4 shrink-0 bg-white shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-bold text-[#1E1B4B]">Admin Panel</span>
          </div>
          <div className="flex-1" />
          <AdminHeaderActions />
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
        <AutoLogoutWatcher />
      </div>
    </div>
  )
}
