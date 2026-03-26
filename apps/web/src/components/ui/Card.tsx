'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padding?: CardPadding;
  active?: boolean;
  gradient?: boolean;
  children?: React.ReactNode;
}

const paddingStyles: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-5',
  lg: 'p-7',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn('flex items-start justify-between gap-3', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children?: React.ReactNode;
}

export function CardTitle({ className, children, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn('font-semibold text-gray-900 text-base leading-snug', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function CardBody({ className, children, ...props }: CardBodyProps) {
  return (
    <div className={cn('text-sm text-gray-600', className)} {...props}>
      {children}
    </div>
  );
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
}

export function CardFooter({ className, children, ...props }: CardFooterProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 pt-4 mt-4 border-t border-gray-100',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// ─── Main Card ────────────────────────────────────────────────────────────────

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  {
    hover = false,
    padding = 'md',
    active = false,
    gradient = false,
    className,
    children,
    ...props
  },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        // Base
        'bg-white rounded-2xl border border-gray-100 shadow-sm',
        // Padding
        paddingStyles[padding],
        // Hover
        hover && [
          'cursor-pointer',
          'transition-all duration-200',
          'hover:shadow-md hover:border-indigo-100 hover:-translate-y-0.5',
        ],
        // Active state
        active && 'border-indigo-300 ring-2 ring-indigo-100 shadow-indigo-100',
        // Gradient overlay
        gradient && 'bg-gradient-to-br from-white to-indigo-50/30',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
