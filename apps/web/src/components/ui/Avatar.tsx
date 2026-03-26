'use client';

import React, { useState } from 'react';
import * as RadixAvatar from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: AvatarSize;
  className?: string;
  showStatus?: boolean;
  status?: 'online' | 'away' | 'busy' | 'offline';
}

// ─── Size map ─────────────────────────────────────────────────────────────────

const sizeMap: Record<AvatarSize, { avatar: string; text: string; status: string }> = {
  xs: { avatar: 'h-6 w-6',  text: 'text-[9px]',   status: 'h-1.5 w-1.5' },
  sm: { avatar: 'h-8 w-8',  text: 'text-[11px]',  status: 'h-2 w-2' },
  md: { avatar: 'h-10 w-10', text: 'text-sm',      status: 'h-2.5 w-2.5' },
  lg: { avatar: 'h-12 w-12', text: 'text-base',    status: 'h-3 w-3' },
  xl: { avatar: 'h-16 w-16', text: 'text-xl',      status: 'h-3.5 w-3.5' },
};

// ─── Color palette for initials backgrounds ───────────────────────────────────

const bgColors = [
  'bg-gradient-to-br from-indigo-400 to-violet-500',
  'bg-gradient-to-br from-emerald-400 to-teal-500',
  'bg-gradient-to-br from-orange-400 to-amber-500',
  'bg-gradient-to-br from-pink-400 to-rose-500',
  'bg-gradient-to-br from-blue-400 to-cyan-500',
  'bg-gradient-to-br from-purple-400 to-indigo-500',
  'bg-gradient-to-br from-green-400 to-emerald-500',
  'bg-gradient-to-br from-yellow-400 to-orange-500',
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return bgColors[Math.abs(hash) % bgColors.length];
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.trim().slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return 'U';
}

const statusColors: Record<string, string> = {
  online:  'bg-green-500',
  away:    'bg-yellow-500',
  busy:    'bg-red-500',
  offline: 'bg-gray-400',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Avatar({
  src,
  name,
  email,
  size = 'md',
  className,
  showStatus = false,
  status = 'offline',
}: AvatarProps) {
  const { avatar: avatarSize, text: textSize, status: statusSize } = sizeMap[size];
  const initials = getInitials(name, email);
  const bgColor = getColorFromName(name ?? email ?? 'User');

  return (
    <div className="relative inline-flex shrink-0">
      <RadixAvatar.Root
        className={cn(
          'rounded-full overflow-hidden flex items-center justify-center',
          'select-none shrink-0',
          avatarSize,
          className
        )}
      >
        {src && (
          <RadixAvatar.Image
            src={src}
            alt={name ?? email ?? 'Avatar'}
            className="w-full h-full object-cover"
          />
        )}
        <RadixAvatar.Fallback
          delayMs={src ? 300 : 0}
          className={cn(
            'flex items-center justify-center w-full h-full',
            'font-bold text-white',
            bgColor,
            textSize
          )}
        >
          {initials}
        </RadixAvatar.Fallback>
      </RadixAvatar.Root>

      {showStatus && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-white',
            statusSize,
            statusColors[status]
          )}
          aria-label={status}
        />
      )}
    </div>
  );
}

// ─── Avatar Group ─────────────────────────────────────────────────────────────

export interface AvatarGroupProps {
  users: Array<{ src?: string | null; name?: string | null; email?: string | null }>;
  max?: number;
  size?: AvatarSize;
  className?: string;
}

export function AvatarGroup({ users, max = 3, size = 'sm', className }: AvatarGroupProps) {
  const visible = users.slice(0, max);
  const remaining = users.length - max;

  return (
    <div className={cn('flex items-center', className)}>
      {visible.map((user, i) => (
        <div
          key={i}
          className="ring-2 ring-white rounded-full -ml-2 first:ml-0"
        >
          <Avatar src={user.src} name={user.name} email={user.email} size={size} />
        </div>
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'ring-2 ring-white rounded-full -ml-2',
            'flex items-center justify-center bg-gray-200 text-gray-600 font-semibold',
            sizeMap[size].avatar,
            sizeMap[size].text
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

export default Avatar;
