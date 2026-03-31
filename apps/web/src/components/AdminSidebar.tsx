'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Zap,
  Terminal,
  Shield,
  CreditCard,
  Cpu,
  Megaphone,
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin',               label: 'Overview',       icon: LayoutDashboard, exact: true,  color: 'text-indigo-500' },
  { href: '/admin/users',         label: 'Users',          icon: Users,           exact: false, color: 'text-sky-500' },
  { href: '/admin/tasks',         label: 'Tasks',          icon: Zap,             exact: false, color: 'text-amber-500' },
  { href: '/admin/billing',       label: 'Billing',        icon: CreditCard,      exact: false, color: 'text-purple-500' },
  { href: '/admin/models',        label: 'AI Models',      icon: Cpu,             exact: false, color: 'text-emerald-500' },
  { href: '/admin/announcements', label: 'Announcements',  icon: Megaphone,       exact: false, color: 'text-rose-500' },
  { href: '/admin/platform',      label: 'Platform Logs',  icon: Terminal,        exact: false, color: 'text-slate-500' },
  { href: '/admin/security',      label: 'Security',       icon: Shield,          exact: false, color: 'text-red-500' },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-60 shrink-0 flex flex-col border-r border-[#E0E7FF] shadow-sm"
      style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F8F7FF 100%)' }}
    >
      {/* Logo / brand */}
      <div className="h-14 flex items-center px-5 border-b border-[#E0E7FF] gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)', boxShadow: '0 2px 8px rgba(79,70,229,0.25)' }}>
          <span className="text-white font-bold text-xs">A</span>
        </div>
        <div>
          <p className="text-xs font-bold text-[#1E1B4B] tracking-wide uppercase leading-none">
            Admin
          </p>
          <p className="text-[10px] text-[#6B7280] leading-tight">arivarangam</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        <p className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wider px-3 mb-2">
          Management
        </p>
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact, color }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all',
                active
                  ? 'bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] shadow-sm'
                  : 'text-[#374151] hover:bg-[#F5F0FF] hover:text-[#4F46E5]'
              )}
            >
              <Icon
                className={cn('w-4 h-4 shrink-0', active ? 'text-[#4F46E5]' : color)}
              />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#E0E7FF]">
        <Link
          href="/arena"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#6B7280] hover:text-[#4F46E5] hover:bg-[#EEF2FF] transition-colors font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to App
        </Link>
      </div>
    </aside>
  )
}
