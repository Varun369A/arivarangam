'use client';

import React from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TabItem {
  value: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string | number;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onValueChange: (value: string) => void;
  children?: React.ReactNode;
  variant?: 'line' | 'pill' | 'card';
  className?: string;
  listClassName?: string;
}

// ─── Variant styles ───────────────────────────────────────────────────────────

const listVariantStyles = {
  line: 'border-b border-gray-200 gap-0',
  pill: 'bg-gray-100 p-1 rounded-xl gap-1',
  card: 'bg-white border border-gray-200 rounded-xl p-1 gap-1',
};

const triggerVariantStyles = {
  line: cn(
    'relative pb-3 px-4 text-sm font-medium text-gray-500',
    'hover:text-gray-900 transition-colors',
    'data-[state=active]:text-indigo-600',
    'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5',
    'after:bg-transparent data-[state=active]:after:bg-indigo-500',
    'after:rounded-full after:transition-all'
  ),
  pill: cn(
    'px-4 py-1.5 rounded-lg text-sm font-medium text-gray-600',
    'hover:text-gray-900 transition-all',
    'data-[state=active]:bg-white data-[state=active]:text-indigo-600',
    'data-[state=active]:shadow-sm data-[state=active]:shadow-indigo-100'
  ),
  card: cn(
    'px-4 py-1.5 rounded-lg text-sm font-medium text-gray-600',
    'hover:text-gray-900 transition-all',
    'data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700',
    'data-[state=active]:border data-[state=active]:border-indigo-200'
  ),
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Tabs({
  items,
  value,
  onValueChange,
  children,
  variant = 'line',
  className,
  listClassName,
}: TabsProps) {
  return (
    <RadixTabs.Root
      value={value}
      onValueChange={onValueChange}
      className={cn('w-full', className)}
    >
      <RadixTabs.List
        className={cn(
          'flex items-center',
          listVariantStyles[variant],
          listClassName
        )}
      >
        {items.map((item) => (
          <RadixTabs.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={cn(
              'inline-flex items-center gap-2 outline-none whitespace-nowrap',
              'focus-visible:ring-2 focus-visible:ring-indigo-300 focus-visible:ring-offset-1',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              triggerVariantStyles[variant]
            )}
          >
            {item.icon && (
              <span className="h-4 w-4 shrink-0 flex items-center justify-center">
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
            {item.badge !== undefined && (
              <span className="bg-indigo-100 text-indigo-600 text-xs font-semibold px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center">
                {item.badge}
              </span>
            )}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>

      {children}
    </RadixTabs.Root>
  );
}

// ─── TabPanel ─────────────────────────────────────────────────────────────────

export interface TabPanelProps {
  value: string;
  children?: React.ReactNode;
  className?: string;
}

export function TabPanel({ value, children, className }: TabPanelProps) {
  return (
    <RadixTabs.Content
      value={value}
      className={cn(
        'outline-none',
        'data-[state=active]:animate-in data-[state=active]:fade-in-0',
        'duration-150',
        className
      )}
    >
      {children}
    </RadixTabs.Content>
  );
}

export default Tabs;
