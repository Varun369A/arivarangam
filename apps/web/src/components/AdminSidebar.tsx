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
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true, color: 'text-indigo-300' },
  { href: '/admin/users', label: 'Users', icon: Users, exact: false, color: 'text-sky-300' },
  { href: '/admin/tasks', label: 'Tasks', icon: Zap, exact: false, color: 'text-yellow-300' },
  { href: '/admin/platform', label: 'Platform Logs', icon: Terminal, exact: false, color: 'text-emerald-300' },
  { href: '/admin/security', label: 'Security', icon: Shield, exact: false, color: 'text-red-300' },
  { href: '/admin/billing', label: 'Billing', icon: CreditCard, exact: false, color: 'text-purple-300' },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-60 shrink-0 flex flex-col shadow-lg"
      style={{ background: 'linear-gradient(180deg, #312e81 0%, #4c1d95 40%, #1e1b4b 100%)' }}
    >
      {/* Logo / brand */}
      <div className="h-14 flex items-center px-5 border-b border-white/10 gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
          <span className="text-white font-bold text-xs">A</span>
        </div>
        <div>
          <p className="text-xs font-bold text-indigo-200 tracking-wide uppercase leading-none">
            Admin
          </p>
          <p className="text-[10px] text-indigo-400 leading-tight">arivarangam</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-0.5">
        <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wider px-3 mb-2">
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
                  ? 'bg-white/20 text-white shadow-sm border border-white/20'
                  : 'text-indigo-200 hover:bg-white/10 hover:text-white'
              )}
            >
              <Icon
                className={cn('w-4 h-4 shrink-0', active ? 'text-white' : color)}
              />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-300" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-indigo-300 hover:text-white hover:bg-white/10 transition-colors font-semibold"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to App
        </Link>
      </div>
    </aside>
  )
}
