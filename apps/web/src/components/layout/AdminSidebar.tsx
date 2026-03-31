'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ListTodo,
  Cpu,
  ShieldAlert,
  CreditCard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/ui/Avatar';
import type { PublicUser } from '@arivarangam/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminSidebarProps {
  user: PublicUser | null;
}

interface SidebarNavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const navItems: SidebarNavItem[] = [
  {
    href: '/admin',
    icon: <LayoutDashboard className="h-5 w-5" />,
    label: 'Overview',
  },
  {
    href: '/admin/users',
    icon: <Users className="h-5 w-5" />,
    label: 'Users',
  },
  {
    href: '/admin/tasks',
    icon: <ListTodo className="h-5 w-5" />,
    label: 'Tasks',
  },
  {
    href: '/admin/platform',
    icon: <Cpu className="h-5 w-5" />,
    label: 'Platform',
  },
  {
    href: '/admin/security',
    icon: <ShieldAlert className="h-5 w-5" />,
    label: 'Security',
  },
  {
    href: '/admin/billing',
    icon: <CreditCard className="h-5 w-5" />,
    label: 'Billing',
  },
];

// ─── Logo ─────────────────────────────────────────────────────────────────────

function SidebarLogo() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5 group px-3 py-1">
      <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200 group-hover:shadow-indigo-300 transition-shadow shrink-0">
        <span className="text-white font-black text-sm tracking-tight select-none">A</span>
      </div>
      <div className="min-w-0">
        <span className="block font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 text-[15px] tracking-tight leading-none select-none">
          Arivarangam
        </span>
        <span className="block text-[10px] text-violet-500 font-semibold tracking-widest uppercase mt-0.5 select-none">
          Admin
        </span>
      </div>
    </Link>
  );
}

// ─── Nav Item ─────────────────────────────────────────────────────────────────

interface SidebarNavLinkProps extends SidebarNavItem {
  active: boolean;
}

function SidebarNavLink({ href, icon, label, badge, active }: SidebarNavLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
        active
          ? 'bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-700 shadow-sm border border-indigo-100'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      )}
    >
      <span
        className={cn(
          'shrink-0 h-5 w-5 flex items-center justify-center',
          active ? 'text-indigo-600' : 'text-gray-400'
        )}
      >
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full min-w-[1.25rem] text-center">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export function AdminSidebar({ user }: AdminSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <aside className="flex flex-col w-64 h-screen bg-white border-r border-gray-100 shadow-sm shrink-0 fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-3 pt-5 pb-5 border-b border-gray-100">
        <SidebarLogo />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1">
        {navItems.map((item) => (
          <SidebarNavLink
            key={item.href}
            {...item}
            active={isActive(item.href)}
          />
        ))}
      </nav>

      {/* Bottom: user info */}
      <div className="px-3 pb-4 pt-3 border-t border-gray-100">
        {user ? (
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100">
            <Avatar src={user.avatar} name={user.name} email={user.email} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{user.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-full uppercase tracking-wider">
              Admin
            </span>
          </div>
        ) : (
          <div className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        )}

        <Link
          href="/dashboard"
          className="mt-2 flex items-center justify-center gap-2 text-xs text-white bg-[#1e1b4b] hover:bg-[#312e81] transition-colors py-1.5 px-3 rounded-lg font-semibold border border-[#3730a3]"
        >
          ← Back to app
        </Link>
      </div>
    </aside>
  );
}

export default AdminSidebar;
