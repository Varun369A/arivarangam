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
  Globe,
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as Avatar from '@radix-ui/react-avatar'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useCredits } from '@/hooks/useCredits'
import { useAutoLogout } from '@/hooks/useAutoLogout'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/repos', label: 'Repos', icon: GitBranch },
  { href: '/task', label: 'Tasks', icon: Zap },
  { href: '/gallery', label: 'Gallery', icon: Globe },
]

function CreditsBadge() {
  const { balance } = useCredits()

  if (balance === null) return null

  return (
    <Link
      href="/settings/billing"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 border border-white/30 text-white text-sm font-semibold hover:bg-white/30 transition-colors"
    >
      <Zap className="w-3.5 h-3.5 text-yellow-300" />
      <span>{(balance ?? 0).toLocaleString('en-IN')} cr</span>
    </Link>
  )
}

export function MainNavbar() {
  const pathname = usePathname()
  const { user, logout, isLoggedIn } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { showWarning, secondsLeft, staySignedIn } = useAutoLogout(logout, isLoggedIn)

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w: string) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?'

  return (
    <header className="sticky top-0 z-40 w-full border-b border-indigo-200 shadow-sm" style={{background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #2563eb 100%)'}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-white font-bold text-sm leading-none">A</span>
            </div>
            <span className="text-lg font-bold text-white hidden sm:block group-hover:text-indigo-100 transition-colors">
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
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-white/25 text-white'
                    : 'text-indigo-100 hover:text-white hover:bg-white/15'
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
            {user?.isAdmin && (
              <Link
                href="/admin"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 text-white text-xs font-semibold hover:bg-white/30 transition-colors border border-white/30"
              >
                <Settings className="w-3.5 h-3.5" />
                Admin Panel
              </Link>
            )}

            {/* User menu */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-white hover:bg-white/15 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-indigo-600"
                  aria-label="User menu"
                >
                  <Avatar.Root className="w-7 h-7 rounded-full overflow-hidden bg-white/20 border border-white/40">
                    <Avatar.Image
                      src={user?.avatarUrl}
                      alt={user?.name || 'User'}
                      className="w-full h-full object-cover"
                    />
                    <Avatar.Fallback className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                      {initials}
                    </Avatar.Fallback>
                  </Avatar.Root>
                  <span className="hidden sm:block max-w-[100px] truncate text-white">{user?.name || 'Account'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-indigo-200 hidden sm:block" />
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

      {/* Auto-logout warning banner */}
      {showWarning && (
        <div className="border-t border-yellow-500/30 bg-yellow-500/10 px-4 py-2 flex items-center justify-between gap-4">
          <p className="text-xs text-yellow-100 font-medium">
            You will be signed out in <span className="font-bold text-yellow-300">{secondsLeft}s</span> due to inactivity.
          </p>
          <button
            onClick={staySignedIn}
            className="px-3 py-1 text-xs font-semibold bg-yellow-400 text-yellow-900 rounded-lg hover:bg-yellow-300 transition-colors flex-shrink-0"
          >
            Stay signed in
          </button>
        </div>
      )}

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/20 bg-indigo-700 px-4 py-3">
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-colors',
                  pathname.startsWith(href)
                    ? 'bg-white/25 text-white'
                    : 'text-indigo-100 hover:text-white hover:bg-white/15'
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
