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
  ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users, exact: false },
  { href: '/admin/tasks', label: 'Tasks', icon: Zap, exact: false },
  { href: '/admin/platform', label: 'Platform Logs', icon: Terminal, exact: false },
  { href: '/admin/security', label: 'Security', icon: Shield, exact: false },
  { href: '/admin/billing', label: 'Billing', icon: CreditCard, exact: false },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 bg-white border-r border-surface-border flex flex-col shadow-sm">
      {/* Logo / brand */}
      <div className="h-14 flex items-center px-5 border-b border-surface-border gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-600 to-brand-purple flex items-center justify-center shadow-glow">
          <span className="text-white font-bold text-xs">A</span>
        </div>
        <div>
          <p className="text-xs font-bold text-primary-700 tracking-wide uppercase leading-none">
            Admin
          </p>
          <p className="text-[10px] text-slate-400 leading-tight">arivarangam</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Management
        </p>
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                active
                  ? 'bg-primary-50 text-primary-700 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <Icon
                className={cn('w-4 h-4 shrink-0', active ? 'text-primary-600' : 'text-slate-400')}
              />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-surface-border">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to App
        </Link>
      </div>
    </aside>
  )
}
