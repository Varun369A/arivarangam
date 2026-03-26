'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  GitBranch,
  Zap,
  Settings,
  ChevronDown,
  LogOut,
  User,
  CreditCard,
  Menu,
  X,
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Avatar from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useCredits } from '@/hooks/useCredits'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/repos', label: 'Repos', icon: GitBranch },
  { href: '/task', label: 'Tasks', icon: Zap },
]

function CreditsBadge() {
  const { balance } = useCredits()

  if (balance === undefined) return null

  return (
    <Link
      href="/settings/billing"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-primary-50 to-purple-50 border border-primary-100 text-primary-700 text-sm font-medium hover:from-primary-100 hover:to-purple-100 transition-colors"
    >
      <Zap className="w-3.5 h-3.5 text-brand-purple" />
      <span>{(balance ?? 0).toLocaleString('en-IN')} cr</span>
    </Link>
  )
}

export function MainNavbar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-sm border-b border-surface-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-brand-purple flex items-center justify-center shadow-glow">
              <span className="text-white font-bold text-sm leading-none">A</span>
            </div>
            <span className="text-lg font-bold text-slate-800 hidden sm:block group-hover:text-primary-600 transition-colors">
              arivarangam
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <CreditsBadge />

            {/* User menu */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  aria-label="User menu"
                >
                  <Avatar.Root className="w-7 h-7 rounded-full overflow-hidden bg-gradient-to-br from-primary-400 to-brand-purple">
                    <Avatar.Image
                      src={user?.avatarUrl}
                      alt={user?.name || 'User'}
                      className="w-full h-full object-cover"
                    />
                    <Avatar.Fallback className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                      {initials}
                    </Avatar.Fallback>
                  </Avatar.Root>
                  <span className="hidden sm:block max-w-[100px] truncate">{user?.name || 'Account'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 min-w-[180px] bg-white rounded-xl border border-surface-border shadow-lg p-1.5 animate-in fade-in-0 zoom-in-95"
                >
                  <div className="px-2 py-1.5 mb-1 border-b border-surface-border">
                    <p className="text-xs font-medium text-slate-900 truncate">{user?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  </div>

                  <DropdownMenu.Item asChild>
                    <Link
                      href="/settings/profile"
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50 cursor-pointer outline-none"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      Profile
                    </Link>
                  </DropdownMenu.Item>

                  <DropdownMenu.Item asChild>
                    <Link
                      href="/settings/billing"
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50 cursor-pointer outline-none"
                    >
                      <CreditCard className="w-4 h-4 text-slate-400" />
                      Billing
                    </Link>
                  </DropdownMenu.Item>

                  <DropdownMenu.Item asChild>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50 cursor-pointer outline-none"
                    >
                      <Settings className="w-4 h-4 text-slate-400" />
                      Settings
                    </Link>
                  </DropdownMenu.Item>

                  <DropdownMenu.Separator className="my-1 border-t border-surface-border" />

                  <DropdownMenu.Item
                    onSelect={logout}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 cursor-pointer outline-none"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign out
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-surface-border bg-white px-4 py-3">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
