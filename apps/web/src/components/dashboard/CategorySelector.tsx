'use client';

import React from 'react';
import { Code2, Search, Image, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskCategory } from '@arivarangam/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategorySelectorProps {
  value: TaskCategory;
  onChange: (category: TaskCategory) => void;
  disabled?: boolean;
}

interface CategoryTab {
  value: TaskCategory;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: {
    bg: string;
    activeBg: string;
    activeText: string;
    activeBorder: string;
    activeIcon: string;
    inactiveIcon: string;
    dot: string;
  };
}

// ─── Category config ──────────────────────────────────────────────────────────

const categories: CategoryTab[] = [
  {
    value: 'code',
    label: 'Code',
    icon: <Code2 className="h-5 w-5" />,
    description: 'Build apps, scripts & websites',
    color: {
      bg:            'hover:bg-indigo-50',
      activeBg:      'bg-gradient-to-br from-indigo-50 to-violet-50',
      activeText:    'text-indigo-700',
      activeBorder:  'border-indigo-200',
      activeIcon:    'text-indigo-600 bg-indigo-100',
      inactiveIcon:  'text-gray-400 bg-gray-100',
      dot:           'bg-indigo-500',
    },
  },
  {
    value: 'research',
    label: 'Research',
    icon: <Search className="h-5 w-5" />,
    description: 'Deep web research & reports',
    color: {
      bg:            'hover:bg-emerald-50',
      activeBg:      'bg-gradient-to-br from-emerald-50 to-teal-50',
      activeText:    'text-emerald-700',
      activeBorder:  'border-emerald-200',
      activeIcon:    'text-emerald-600 bg-emerald-100',
      inactiveIcon:  'text-gray-400 bg-gray-100',
      dot:           'bg-emerald-500',
    },
  },
  {
    value: 'image',
    label: 'Image',
    icon: <Image className="h-5 w-5" />,
    description: 'AI image generation',
    color: {
      bg:            'hover:bg-orange-50',
      activeBg:      'bg-gradient-to-br from-orange-50 to-amber-50',
      activeText:    'text-orange-700',
      activeBorder:  'border-orange-200',
      activeIcon:    'text-orange-600 bg-orange-100',
      inactiveIcon:  'text-gray-400 bg-gray-100',
      dot:           'bg-orange-500',
    },
  },
  {
    value: 'voice',
    label: 'Voice',
    icon: <Mic className="h-5 w-5" />,
    description: 'Text-to-speech synthesis',
    color: {
      bg:            'hover:bg-pink-50',
      activeBg:      'bg-gradient-to-br from-pink-50 to-rose-50',
      activeText:    'text-pink-700',
      activeBorder:  'border-pink-200',
      activeIcon:    'text-pink-600 bg-pink-100',
      inactiveIcon:  'text-gray-400 bg-gray-100',
      dot:           'bg-pink-500',
    },
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function CategorySelector({ value, onChange, disabled = false }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {categories.map((cat) => {
        const isActive = value === cat.value;
        return (
          <button
            key={cat.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(cat.value)}
            className={cn(
              // Base
              'relative flex flex-col items-center gap-2.5 px-4 py-4 rounded-2xl',
              'border transition-all duration-200 outline-none',
              'focus-visible:ring-2 focus-visible:ring-indigo-300',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              // State
              isActive
                ? cn(cat.color.activeBg, cat.color.activeBorder, 'shadow-sm', '-translate-y-0.5')
                : cn('bg-white border-gray-100 shadow-sm', cat.color.bg, 'hover:-translate-y-0.5 hover:shadow-md')
            )}
          >
            {/* Active indicator dot */}
            {isActive && (
              <span className={cn('absolute top-2.5 right-2.5 h-2 w-2 rounded-full', cat.color.dot)} />
            )}

            {/* Icon */}
            <span
              className={cn(
                'h-10 w-10 rounded-xl flex items-center justify-center transition-colors',
                isActive ? cat.color.activeIcon : cat.color.inactiveIcon
              )}
            >
              {cat.icon}
            </span>

            {/* Label + Description */}
            <div className="text-center">
              <p
                className={cn(
                  'text-sm font-semibold leading-none',
                  isActive ? cat.color.activeText : 'text-gray-700'
                )}
              >
                {cat.label}
              </p>
              <p className="text-[10px] text-gray-400 mt-1 leading-tight">{cat.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── Compact variant (horizontal tabs) ───────────────────────────────────────

export function CategoryTabs({ value, onChange, disabled = false }: CategorySelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
      {categories.map((cat) => {
        const isActive = value === cat.value;
        return (
          <button
            key={cat.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(cat.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150',
              'outline-none focus-visible:ring-2 focus-visible:ring-indigo-300',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isActive
                ? cn('bg-white shadow-sm', cat.color.activeText)
                : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <span className={cn('h-4 w-4', isActive ? cat.color.activeText : 'text-gray-400')}>
              {cat.icon}
            </span>
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Category icon helper ─────────────────────────────────────────────────────

export function CategoryIcon({ category, className }: { category: TaskCategory; className?: string }) {
  const cat = categories.find((c) => c.value === category);
  if (!cat) return null;
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-lg',
        cat.color.activeIcon,
        className
      )}
    >
      {cat.icon}
    </span>
  );
}

export default CategorySelector;
