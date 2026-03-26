'use client';

import React, { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InputVariant = 'default' | 'filled';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  variant?: InputVariant;
  showPasswordToggle?: boolean;
  containerClassName?: string;
  labelClassName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    hint,
    iconLeft,
    iconRight,
    variant = 'default',
    showPasswordToggle = false,
    type = 'text',
    containerClassName,
    labelClassName,
    className,
    id,
    ...props
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  const isPassword = type === 'password' || showPasswordToggle;
  const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type;

  const hasRightSlot = isPassword || iconRight || error;

  return (
    <div className={cn('flex flex-col gap-1.5', containerClassName)}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'text-sm font-medium text-gray-700',
            props.disabled && 'text-gray-400',
            labelClassName
          )}
        >
          {label}
        </label>
      )}

      {/* Input wrapper */}
      <div className="relative flex items-center">
        {/* Left icon */}
        {iconLeft && (
          <span className="absolute left-3 text-gray-400 pointer-events-none flex items-center">
            {iconLeft}
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          type={resolvedType}
          className={cn(
            // Base
            'w-full text-sm text-gray-900 placeholder:text-gray-400',
            'transition-all duration-200',
            'outline-none',
            // Variant
            variant === 'default' && [
              'bg-white border rounded-xl px-3 py-2.5',
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                : 'border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100',
            ],
            variant === 'filled' && [
              'bg-gray-100 border border-transparent rounded-xl px-3 py-2.5',
              error
                ? 'bg-red-50 border-red-200 focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-100'
                : 'focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100',
            ],
            // Padding adjustments for icons
            iconLeft && 'pl-10',
            hasRightSlot && 'pr-10',
            // Disabled
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
            className
          )}
          {...props}
        />

        {/* Right slot: error icon / password toggle / custom icon */}
        {hasRightSlot && (
          <span className="absolute right-3 flex items-center gap-1">
            {error && !isPassword && (
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
            )}
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}
            {!isPassword && iconRight && (
              <span className="text-gray-400">{iconRight}</span>
            )}
          </span>
        )}
      </div>

      {/* Error / Hint */}
      {error ? (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
