'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GitBranch,
  Zap,
  Bell,
  User,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';
import { formatCredits } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import type { PublicUser } from '@arivarangam/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavbarProps {
  user: PublicUser | null;
  onLogout: () => void;
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 group">
      {/* Stylized "A" icon */}
      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200 group-hover:shadow-indigo-300 transition-shadow">
        <span className="text-white font-black text-sm tracking-tight select-none">A</span>
      </div>
      {/* Text */}
      <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 text-lg tracking-tight select-none">
        Arivarangam
      </span>
    </Link>
  );
}

// ─── Nav Link ─────────────────────────────────────────────────────────────────

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick?: () => void;
}

function NavLink({ href, icon, label, active, onClick }: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-150',
        active
          ? 'bg-indigo-50 text-indigo-700'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      <span className="h-4 w-4 flex items-center justify-center shrink-0">{icon}</span>
      {label}
    </Link>
  );
}

// ─── Credits Badge ────────────────────────────────────────────────────────────

function CreditsBadge({ credits }: { credits: number }) {
  return (
    <Link
      href="/settings/billing"
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold',
        'transition-all duration-150',
        credits < 50
          ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
          : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
      )}
      title="Credits — click to buy more"
    >
      <Zap className={cn('h-3.5 w-3.5', credits < 50 ? 'text-amber-500' : 'text-indigo-500')} />
      {formatCredits(credits)}
    </Link>
  );
}

// ─── User Dropdown ────────────────────────────────────────────────────────────

interface UserDropdownProps {
  user: PublicUser;
  onLogout: () => void;
}

function UserDropdown({ user, onLogout }: UserDropdownProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        className={cn(
          'flex items-center gap-2 px-2 py-1.5 rounded-xl',
          'hover:bg-gray-100 transition-colors duration-150 outline-none',
          'data-[state=open]:bg-gray-100'
        )}
      >
        <Avatar src={user.avatar} name={user.name} email={user.email} size="sm" />
        <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate hidden md:block">
          {user.name}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-gray-400 hidden md:block" />
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className={cn(
            'z-50 min-w-[200px] bg-white rounded-2xl shadow-xl border border-gray-100',
            'p-1.5',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'duration-150'
          )}
        >
          {/* User info header */}
          <div className="px-3 py-2.5 border-b border-gray-100 mb-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>

          {/* Items */}
          <DropdownMenu.Item asChild>
            <Link
              href="/profile"
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700',
                'hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer outline-none'
              )}
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <Link
              href="/settings"
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-gray-700',
                'hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer outline-none'
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </DropdownMenu.Item>

          {user.isAdmin && (
            <>
              <DropdownMenu.Separator className="h-px bg-gray-100 my-1" />
              <DropdownMenu.Item asChild>
                <Link
                  href="/admin"
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-violet-700',
                    'hover:bg-violet-50 transition-colors cursor-pointer outline-none'
                  )}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Admin Panel
                </Link>
              </DropdownMenu.Item>
            </>
          )}

          <DropdownMenu.Separator className="h-px bg-gray-100 my-1" />

          <DropdownMenu.Item
            onSelect={onLogout}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-600',
              'hover:bg-red-50 transition-colors cursor-pointer outline-none'
            )}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────

export function Navbar({ user, onLogout }: NavbarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" />, label: 'Dashboard' },
    { href: '/repos', icon: <GitBranch className="h-4 w-4" />, label: 'Repos' },
  ];

  return (
    <>
      {/* Desktop navbar */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Left: Logo */}
          <Logo />

          {/* Center: Nav Links (desktop) */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                {...link}
                active={pathname.startsWith(link.href)}
              />
            ))}
          </div>

          {/* Right: Credits + Bell + User */}
          <div className="flex items-center gap-2">
            {user && <CreditsBadge credits={user.credits} />}

            {/* Notification bell placeholder */}
            <button
              className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors relative"
              aria-label="Notifications"
            >
              <Bell className="h-4.5 w-4.5 h-[18px] w-[18px]" />
              {/* Unread dot placeholder */}
              {/* <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" /> */}
            </button>

            {/* User dropdown or mobile toggle */}
            {user && (
              <div className="hidden md:block">
                <UserDropdown user={user} onLogout={onLogout} />
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 pt-14 bg-white/95 backdrop-blur-md">
          <div className="flex flex-col gap-1 p-4 border-b border-gray-100">
            {navLinks.map((link) => (
              <NavLink
                key={link.href}
                {...link}
                active={pathname.startsWith(link.href)}
                onClick={() => setMobileOpen(false)}
              />
            ))}
          </div>

          {user && (
            <div className="p-4 flex flex-col gap-2">
              {/* User info */}
              <div className="flex items-center gap-3 px-3 py-3 bg-gray-50 rounded-xl">
                <Avatar src={user.avatar} name={user.name} email={user.email} size="md" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>

              <Link
                href="/profile"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                <User className="h-4 w-4" /> Profile
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
              >
                <Settings className="h-4 w-4" /> Settings
              </Link>
              {user.isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-violet-700 hover:bg-violet-50 transition-colors"
                >
                  <ShieldCheck className="h-4 w-4" /> Admin Panel
                </Link>
              )}
              <button
                onClick={() => { setMobileOpen(false); onLogout(); }}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default Navbar;
