'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-gradient-to-r from-indigo-500 to-violet-600',
    'text-white',
    'shadow-md shadow-indigo-200',
    'hover:from-indigo-600 hover:to-violet-700',
    'hover:shadow-lg hover:shadow-indigo-300',
    'active:from-indigo-700 active:to-violet-800',
    'disabled:from-indigo-300 disabled:to-violet-400 disabled:shadow-none',
    'focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2',
  ].join(' '),

  secondary: [
    'bg-white',
    'text-gray-700',
    'border border-gray-200',
    'shadow-sm',
    'hover:bg-gray-50 hover:border-gray-300',
    'active:bg-gray-100',
    'disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-100',
    'focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2',
  ].join(' '),

  ghost: [
    'bg-transparent',
    'text-gray-600',
    'hover:bg-gray-100 hover:text-gray-900',
    'active:bg-gray-200',
    'disabled:text-gray-300',
    'focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2',
  ].join(' '),

  danger: [
    'bg-gradient-to-r from-red-500 to-rose-600',
    'text-white',
    'shadow-md shadow-red-200',
    'hover:from-red-600 hover:to-rose-700',
    'hover:shadow-lg hover:shadow-red-300',
    'active:from-red-700 active:to-rose-800',
    'disabled:from-red-300 disabled:to-rose-400 disabled:shadow-none',
    'focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2',
  ].join(' '),

  success: [
    'bg-gradient-to-r from-emerald-500 to-green-600',
    'text-white',
    'shadow-md shadow-emerald-200',
    'hover:from-emerald-600 hover:to-green-700',
    'hover:shadow-lg hover:shadow-emerald-300',
    'active:from-emerald-700 active:to-green-800',
    'disabled:from-emerald-300 disabled:to-green-400 disabled:shadow-none',
    'focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-xl',
};

const iconSizes: Record<ButtonSize, string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

// ─── Component ────────────────────────────────────────────────────────────────

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    iconLeft,
    iconRight,
    fullWidth = false,
    disabled,
    className,
    children,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      className={cn(
        // Base
        'inline-flex items-center justify-center font-medium',
        'transition-all duration-200 ease-out',
        'select-none cursor-pointer',
        'disabled:cursor-not-allowed disabled:opacity-60',
        // Variant
        variantStyles[variant],
        // Size
        sizeStyles[size],
        // Full width
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className={cn('animate-spin shrink-0', iconSizes[size])} />
      ) : iconLeft ? (
        <span className={cn('shrink-0', iconSizes[size])}>{iconLeft}</span>
      ) : null}

      {children && <span className="truncate">{children}</span>}

      {!loading && iconRight && (
        <span className={cn('shrink-0', iconSizes[size])}>{iconRight}</span>
      )}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
