'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { TaskStatus, UserTier, UserStatus } from '@arrivarangam/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BadgeColor =
  | 'green'
  | 'red'
  | 'blue'
  | 'yellow'
  | 'gray'
  | 'indigo'
  | 'emerald'
  | 'violet'
  | 'orange'
  | 'red-gradient';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  color?: BadgeColor;
  size?: BadgeSize;
  dot?: boolean;
  children?: React.ReactNode;
}

// ─── Color map ────────────────────────────────────────────────────────────────

const colorStyles: Record<BadgeColor, string> = {
  green:         'bg-green-100 text-green-700 border border-green-200',
  red:           'bg-red-100 text-red-700 border border-red-200',
  blue:          'bg-blue-100 text-blue-700 border border-blue-200',
  yellow:        'bg-yellow-100 text-yellow-700 border border-yellow-200',
  gray:          'bg-gray-100 text-gray-600 border border-gray-200',
  indigo:        'bg-indigo-100 text-indigo-700 border border-indigo-200',
  emerald:       'bg-emerald-100 text-emerald-700 border border-emerald-200',
  violet:        'bg-violet-100 text-violet-700 border border-violet-200',
  orange:        'bg-orange-100 text-orange-700 border border-orange-200',
  'red-gradient':'bg-gradient-to-r from-red-500 to-rose-500 text-white border-0 shadow-sm shadow-red-200',
};

const dotColors: Record<BadgeColor, string> = {
  green:         'bg-green-500',
  red:           'bg-red-500',
  blue:          'bg-blue-500',
  yellow:        'bg-yellow-500',
  gray:          'bg-gray-400',
  indigo:        'bg-indigo-500',
  emerald:       'bg-emerald-500',
  violet:        'bg-violet-500',
  orange:        'bg-orange-500',
  'red-gradient':'bg-white',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-0.5 gap-1.5',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function taskStatusColor(status: TaskStatus): BadgeColor {
  switch (status) {
    case 'completed':  return 'green';
    case 'running':    return 'blue';
    case 'analyzing':  return 'blue';
    case 'pending':    return 'yellow';
    case 'failed':     return 'red';
    case 'cancelled':  return 'gray';
    default:           return 'gray';
  }
}

export function userStatusColor(status: UserStatus): BadgeColor {
  switch (status) {
    case 'ACTIVE':     return 'green';
    case 'SUSPENDED':  return 'red';
    case 'DELETED':    return 'gray';
    default:           return 'gray';
  }
}

export function tierColor(tier: UserTier): BadgeColor {
  switch (tier) {
    case 'FREE':      return 'indigo';
    case 'STARTER':   return 'emerald';
    case 'PRO':       return 'violet';
    case 'BUSINESS':  return 'orange';
    case 'ADMIN':     return 'red-gradient';
    default:          return 'gray';
  }
}

// ─── Pre-built badge helpers ──────────────────────────────────────────────────

export function TaskStatusBadge({ status, size = 'md' }: { status: TaskStatus; size?: BadgeSize }) {
  const labels: Record<TaskStatus, string> = {
    pending:   'Pending',
    analyzing: 'Analyzing',
    running:   'Running',
    completed: 'Completed',
    failed:    'Failed',
    cancelled: 'Cancelled',
  };
  return (
    <Badge color={taskStatusColor(status)} size={size} dot>
      {labels[status]}
    </Badge>
  );
}

export function TierBadge({ tier, size = 'md' }: { tier: UserTier; size?: BadgeSize }) {
  return (
    <Badge color={tierColor(tier)} size={size}>
      {tier}
    </Badge>
  );
}

export function UserStatusBadge({ status, size = 'md' }: { status: UserStatus; size?: BadgeSize }) {
  return (
    <Badge color={userStatusColor(status)} size={size} dot>
      {status}
    </Badge>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Badge({
  color = 'gray',
  size = 'md',
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full whitespace-nowrap',
        colorStyles[color],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'rounded-full shrink-0',
            size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2',
            dotColors[color]
          )}
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
