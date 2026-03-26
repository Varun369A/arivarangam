'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Zap, Code2, Search, Image, Mic, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TaskStatusBadge } from '@/components/ui/Badge';
import type { Task, TaskCategory } from '@arivarangam/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
  className?: string;
}

// ─── Category config ──────────────────────────────────────────────────────────

const categoryConfig: Record<TaskCategory, {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  accent: string;
}> = {
  code: {
    icon: <Code2 className="h-4 w-4" />,
    iconBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    accent: 'group-hover:border-indigo-200',
  },
  research: {
    icon: <Search className="h-4 w-4" />,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    accent: 'group-hover:border-emerald-200',
  },
  image: {
    icon: <Image className="h-4 w-4" />,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    accent: 'group-hover:border-orange-200',
  },
  voice: {
    icon: <Mic className="h-4 w-4" />,
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600',
    accent: 'group-hover:border-pink-200',
  },
  content: {
    icon: <FileText className="h-4 w-4" />,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    accent: 'group-hover:border-purple-200',
  },
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function TaskCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded-md w-3/4" />
          <div className="h-3 bg-gray-100 rounded-md w-1/2" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="h-5 w-20 bg-gray-200 rounded-full" />
        <div className="h-4 w-16 bg-gray-100 rounded-md" />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TaskCard({ task, onClick, className }: TaskCardProps) {
  const config = categoryConfig[task.category] ?? categoryConfig.code;
  const title = task.prompt.slice(0, 60) + (task.prompt.length > 60 ? '…' : '');
  const isRunning = task.status === 'running' || task.status === 'analyzing';

  const timeAgo = formatDistanceToNow(new Date(task.createdAt), { addSuffix: true });

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={() => onClick?.(task)}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.(task)}
      className={cn(
        'group bg-white rounded-2xl border border-gray-100 p-4',
        'shadow-sm transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        onClick && config.accent,
        className
      )}
    >
      {/* Top row: icon + title */}
      <div className="flex items-start gap-3">
        {/* Category icon */}
        <div
          className={cn(
            'h-9 w-9 rounded-xl flex items-center justify-center shrink-0',
            config.iconBg
          )}
        >
          <span className={config.iconColor}>{config.icon}</span>
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
            {title}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 capitalize">{task.category}</p>
        </div>

        {/* Running pulse indicator */}
        {isRunning && (
          <span className="shrink-0 mt-1">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500" />
            </span>
          </span>
        )}
      </div>

      {/* Bottom row: status + credits + time */}
      <div className="mt-3 flex items-center justify-between gap-2">
        <TaskStatusBadge status={task.status} size="sm" />

        <div className="flex items-center gap-2.5 shrink-0">
          {task.creditsActuallyUsed !== null && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Zap className="h-3 w-3 text-amber-500" />
              {task.creditsActuallyUsed}
            </span>
          )}
          <span className="text-xs text-gray-400">{timeAgo}</span>
        </div>
      </div>
    </div>
  );
}

export default TaskCard;
