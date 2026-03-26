'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerColor = 'indigo' | 'white' | 'gray' | 'green' | 'red' | 'orange';

export interface SpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
  className?: string;
  label?: string;
}

// ─── Size map ─────────────────────────────────────────────────────────────────

const sizeMap: Record<SpinnerSize, { outer: string; inner: string }> = {
  xs: { outer: 'h-3 w-3', inner: 'border-[1.5px]' },
  sm: { outer: 'h-4 w-4', inner: 'border-2' },
  md: { outer: 'h-6 w-6', inner: 'border-2' },
  lg: { outer: 'h-8 w-8', inner: 'border-[3px]' },
  xl: { outer: 'h-12 w-12', inner: 'border-4' },
};

// ─── Color map ────────────────────────────────────────────────────────────────

const colorMap: Record<SpinnerColor, string> = {
  indigo: 'border-indigo-200 border-t-indigo-600',
  white:  'border-white/30 border-t-white',
  gray:   'border-gray-200 border-t-gray-500',
  green:  'border-green-200 border-t-green-600',
  red:    'border-red-200 border-t-red-600',
  orange: 'border-orange-200 border-t-orange-600',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Spinner({ size = 'md', color = 'indigo', className, label }: SpinnerProps) {
  const { outer, inner } = sizeMap[size];

  return (
    <span
      role="status"
      aria-label={label ?? 'Loading'}
      className={cn('inline-flex flex-col items-center justify-center gap-2', className)}
    >
      <span
        className={cn(
          'rounded-full animate-spin',
          outer,
          inner,
          colorMap[color]
        )}
      />
      {label && (
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      )}
    </span>
  );
}

// ─── Full-page loading overlay ────────────────────────────────────────────────

export function SpinnerOverlay({ label }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm">
      <Spinner size="xl" color="indigo" label={label} />
    </div>
  );
}

// ─── Centered loading block ───────────────────────────────────────────────────

export function SpinnerBlock({ label, className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 gap-3', className)}>
      <Spinner size="lg" color="indigo" />
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  );
}

export default Spinner;
