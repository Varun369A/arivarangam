'use client';

import React from 'react';
import {
  Code2, Search, Image, Mic, FileText, Smartphone, Monitor,
  Bot, GitMerge, Sparkles, BarChart2, Layers, Layout, Palette,
  Grid3X3, Server, MessageSquare,
} from 'lucide-react';
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
    description: 'Immersive web apps & sites',
    color: {
      bg:           'hover:bg-indigo-50',
      activeBg:     'bg-gradient-to-br from-indigo-50 to-violet-50',
      activeText:   'text-indigo-700',
      activeBorder: 'border-indigo-200',
      activeIcon:   'text-indigo-600 bg-indigo-100',
      inactiveIcon: 'text-gray-400 bg-gray-100',
      dot:          'bg-indigo-500',
    },
  },
  {
    value: 'animation',
    label: 'Animation',
    icon: <Sparkles className="h-5 w-5" />,
    description: 'Three.js, GSAP, Canvas magic',
    color: {
      bg:           'hover:bg-fuchsia-50',
      activeBg:     'bg-gradient-to-br from-fuchsia-50 to-pink-50',
      activeText:   'text-fuchsia-700',
      activeBorder: 'border-fuchsia-200',
      activeIcon:   'text-fuchsia-600 bg-fuchsia-100',
      inactiveIcon: 'text-gray-400 bg-gray-100',
      dot:          'bg-fuchsia-500',
    },
  },
  {
    value: 'logo',
    label: 'Logo',
    icon: <Layers className="h-5 w-5" />,
    description: 'SVG logos & brand marks',
    color: {
      bg:           'hover:bg-rose-50',
      activeBg:     'bg-gradient-to-br from-rose-50 to-red-50',
      activeText:   'text-rose-700',
      activeBorder: 'border-rose-200',
      activeIcon:   'text-rose-600 bg-rose-100',
      inactiveIcon: 'text-gray-400 bg-gray-100',
      dot:          'bg-rose-500',
    },
  },
  {
    value: 'banner',
    label: 'Banner',
    icon: <Layout className="h-5 w-5" />,
    description: 'Social media & ad banners',
    color: {
      bg:           'hover:bg-amber-50',
      activeBg:     'bg-gradient-to-br from-amber-50 to-yellow-50',
      activeText:   'text-amber-700',
      activeBorder: 'border-amber-200',
      activeIcon:   'text-amber-600 bg-amber-100',
      inactiveIcon: 'text-gray-400 bg-gray-100',
      dot:          'bg-amber-500',
    },
  },
  {
    value: 'brand',
    label: 'Brand',
    icon: <Palette className="h-5 w-5" />,
    description: 'Full brand identity kit',
    color: {
      bg:           'hover:bg-pink-50',
      activeBg:     'bg-gradient-to-br from-pink-50 to-rose-50',
      activeText:   'text-pink-700',
      activeBorder: 'border-pink-200',
      activeIcon:   'text-pink-600 bg-pink-100',
      inactiveIcon: 'text-gray-400 bg-gray-100',
      dot:          'bg-pink-500',
    },
  },
  {
    value: 'design_system',
    label: 'Design System',
    icon: <Grid3X3 className="h-5 w-5" />,
    description: 'Tokens, components & docs',
    color: {
      bg:           'hover:bg-slate-50',
      activeBg:     'bg-gradient-to-br from-slate-50 to-gray-100',
      activeText:   'text-slate-700',
      activeBorder: 'border-slate-300',
      activeIcon:   'text-slate-600 bg-slate-100',
      inactiveIcon: 'text-gray-400 bg-gray-100',
      dot:          'bg-slate-500',
    },
  },
  {
    value: 'dataviz',
    label: 'Data Viz',
    icon: <BarChart2 className="h-5 w-5" />,
    description: 'D3, Chart.js, Plotly dashboards',
    color: {
      bg:           'hover:bg-cyan-50',
      activeBg:     'bg-gradient-to-br from-cyan-50 to-sky-50',
      activeText:   'text-cyan-700',
      activeBorder: 'border-cyan-200',
      activeIcon:   'text-cyan-600 bg-cyan-100',
      inactiveIcon: 'text-gray-400 bg-gray-100',
      dot:          'bg-cyan-500',
    },
  },
  {
    value: 'presentation',
    label: 'Slides',
    icon: <Monitor className="h-5 w-5" />,
    description: 'Reveal.js presentations',
    color: {
      bg:           'hover:bg-yellow-50',
      activeBg:     'bg-gradient-to-br from-yellow-50 to-amber-50',
      activeText:   'text-yellow-700',
      activeBorder: 'border-yellow-200',
      activeIcon:   'text-yellow-600 bg-yellow-100',
      inactiveIcon: 'text-gray-400 bg-gray-100',
      dot:          'bg-yellow-500',
    },
  },
  {
    value: 'content',
    label: 'Content',
    icon: <FileText className="h-5 w-5" />,
    description: 'Articles, SEO & copy',
    color: {
      bg:           'hover:bg-purple-50',
      activeBg:     'bg-gradient-to-br from-purple-50 to-violet-50',
      activeText:   'text-purple-700',
      activeBorder: 'border-purple-200',
      activeIcon:   'text-purple-600 bg-purple-100',
      inactiveIcon: 'text-gray-400 bg-gray-100',
      dot:          'bg-purple-500',
    },
  },
  {
    value: 'agent',
    label: 'AI Agent',
    icon: <Bot className="h-5 w-5" />,
    description: 'LangChain, CrewAI, LlamaIndex',
    color: {
      bg:           'hover:bg-violet-50',
      activeBg:     'bg-gradient-to-br from-violet-50 to-purple-50',
      activeText:   'text-violet-700',
      activeBorder: 'border-violet-200',
      activeIcon:   'text-violet-600 bg-violet-100',
      inactiveIcon: 'text-gray-400 bg-gray-100',
      dot:          'bg-violet-500',
    },
  },
  {
    value: 'workflow',
    label: 'Workflow',
    icon: <GitMerge className="h-5 w-5" />,
    description: 'n8n, GitHub Actions, Shell',
    color: {
      bg:           'hover:bg-teal-50',
      activeBg:     'bg-gradient-to-br from-teal-50 to-emerald-50',
      activeText:   'text-teal-700',
      activeBorder: 'border-teal-200',
      activeIcon:   'text-teal-600 bg-teal-100',
      inactiveIcon: 'text-gray-400 bg-gray-100',
      dot:          'bg-teal-500',
    },
  },
  {
    value: 'mcp',
    label: 'MCP Server',
    icon: <Server className="h-5 w-5" />,
    description: 'Model Context Protocol tools',
    color: {
      bg:           'hover:bg-green-50',
      activeBg:     'bg-gradient-to-br from-green-50 to-emerald-50',
      activeText:   'text-green-700',
      activeBorder: 'border-green-200',
      activeIcon:   'text-green-600 bg-green-100',
      inactiveIcon: 'text-gray-400 bg-gray-100',
      dot:          'bg-green-500',
    },
  },
  {
    value: 'bot',
    label: 'Bot',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Discord & Telegram bots',
    color: {
      bg:           'hover:bg-sky-50',
      activeBg:     'bg-gradient-to-br from-sky-50 to-blue-50',
      activeText:   'text-sky-700',
      activeBorder: 'border-sky-200',
      activeIcon:   'text-sky-600 bg-sky-100',
      inactiveIcon: 'text-gray-400 bg-gray-100',
      dot:          'bg-sky-500',
    },
  },
  {
    value: 'mobile',
    label: 'Mobile',
    icon: <Smartphone className="h-5 w-5" />,
    description: 'Expo + React Native apps',
    color: {
      bg:           'hover:bg-blue-50',
      activeBg:     'bg-gradient-to-br from-blue-50 to-indigo-50',
      activeText:   'text-blue-700',
      activeBorder: 'border-blue-200',
      activeIcon:   'text-blue-600 bg-blue-100',
      inactiveIcon: 'text-gray-400 bg-gray-100',
      dot:          'bg-blue-500',
    },
  },
  {
    value: 'research',
    label: 'Research',
    icon: <Search className="h-5 w-5" />,
    description: 'Deep web research & reports',
    color: {
      bg:           'hover:bg-emerald-50',
      activeBg:     'bg-gradient-to-br from-emerald-50 to-teal-50',
      activeText:   'text-emerald-700',
      activeBorder: 'border-emerald-200',
      activeIcon:   'text-emerald-600 bg-emerald-100',
      inactiveIcon: 'text-gray-400 bg-gray-100',
      dot:          'bg-emerald-500',
    },
  },
  {
    value: 'image',
    label: 'Image',
    icon: <Image className="h-5 w-5" />,
    description: 'DALL-E AI image generation',
    color: {
      bg:           'hover:bg-orange-50',
      activeBg:     'bg-gradient-to-br from-orange-50 to-amber-50',
      activeText:   'text-orange-700',
      activeBorder: 'border-orange-200',
      activeIcon:   'text-orange-600 bg-orange-100',
      inactiveIcon: 'text-gray-400 bg-gray-100',
      dot:          'bg-orange-500',
    },
  },
  {
    value: 'voice',
    label: 'Voice',
    icon: <Mic className="h-5 w-5" />,
    description: 'Sarvam AI text-to-speech',
    color: {
      bg:           'hover:bg-red-50',
      activeBg:     'bg-gradient-to-br from-red-50 to-rose-50',
      activeText:   'text-red-700',
      activeBorder: 'border-red-200',
      activeIcon:   'text-red-600 bg-red-100',
      inactiveIcon: 'text-gray-400 bg-gray-100',
      dot:          'bg-red-500',
    },
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function CategorySelector({ value, onChange, disabled = false }: CategorySelectorProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {categories.map((cat) => {
        const isActive = value === cat.value;
        return (
          <button
            key={cat.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(cat.value)}
            className={cn(
              'relative flex flex-col items-center gap-2 px-3 py-3 rounded-2xl',
              'border transition-all duration-200 outline-none',
              'focus-visible:ring-2 focus-visible:ring-indigo-300',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isActive
                ? cn(cat.color.activeBg, cat.color.activeBorder, 'shadow-sm', '-translate-y-0.5')
                : cn('bg-white border-gray-100 shadow-sm', cat.color.bg, 'hover:-translate-y-0.5 hover:shadow-md')
            )}
          >
            {isActive && (
              <span className={cn('absolute top-2 right-2 h-1.5 w-1.5 rounded-full', cat.color.dot)} />
            )}
            <span
              className={cn(
                'h-9 w-9 rounded-xl flex items-center justify-center transition-colors',
                isActive ? cat.color.activeIcon : cat.color.inactiveIcon
              )}
            >
              {cat.icon}
            </span>
            <div className="text-center">
              <p className={cn('text-xs font-semibold leading-none', isActive ? cat.color.activeText : 'text-gray-700')}>
                {cat.label}
              </p>
              <p className="text-[9px] text-gray-400 mt-0.5 leading-tight line-clamp-1">{cat.description}</p>
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
    <div className="flex items-center gap-1 flex-wrap">
      {categories.map((cat) => {
        const isActive = value === cat.value;
        return (
          <button
            key={cat.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(cat.value)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
              'outline-none focus-visible:ring-2 focus-visible:ring-indigo-300',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isActive
                ? cn('bg-white shadow-sm border border-gray-200', cat.color.activeText)
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            )}
          >
            <span className={cn('h-3.5 w-3.5', isActive ? cat.color.activeText : 'text-gray-400')}>
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
    <span className={cn('flex items-center justify-center rounded-lg', cat.color.activeIcon, className)}>
      {cat.icon}
    </span>
  );
}

export default CategorySelector;
