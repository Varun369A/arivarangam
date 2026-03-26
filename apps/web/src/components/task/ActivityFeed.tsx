'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Terminal,
  XCircle,
  Wrench,
  FileText,
  Eye,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { StoredTaskEvent, TaskEventType } from '@arivarangam/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ActivityFeedProps {
  events: StoredTaskEvent[];
  className?: string;
  autoScroll?: boolean;
}

// ─── Event config ─────────────────────────────────────────────────────────────

const eventConfig: Record<
  TaskEventType,
  {
    icon: React.ReactNode;
    iconBg: string;
    iconColor: string;
    defaultColor: string;
  }
> = {
  file_created: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    defaultColor: 'text-gray-700',
  },
  file_updated: {
    icon: <FileText className="h-3.5 w-3.5" />,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    defaultColor: 'text-gray-700',
  },
  command_run: {
    icon: <Terminal className="h-3.5 w-3.5" />,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    defaultColor: 'text-gray-700',
  },
  error: {
    icon: <XCircle className="h-3.5 w-3.5" />,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    defaultColor: 'text-red-700',
  },
  error_fixed: {
    icon: <Wrench className="h-3.5 w-3.5" />,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
    defaultColor: 'text-orange-700',
  },
  preview_ready: {
    icon: <Eye className="h-3.5 w-3.5" />,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    defaultColor: 'text-green-700',
  },
  completed: {
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    defaultColor: 'text-green-700',
  },
  log: {
    icon: <FileText className="h-3.5 w-3.5" />,
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-500',
    defaultColor: 'text-gray-500',
  },
};

// ─── Event Row ────────────────────────────────────────────────────────────────

interface EventRowProps {
  event: StoredTaskEvent;
}

function EventRow({ event }: EventRowProps) {
  const [expanded, setExpanded] = useState(false);
  const config = eventConfig[event.type as TaskEventType] ?? eventConfig.log;
  const data = event.data;

  const renderContent = () => {
    switch (event.type) {
      case 'file_created':
      case 'file_updated':
        return (
          <span className="text-gray-700">
            <span className="text-green-700 font-medium">Created: </span>
            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-indigo-700 font-mono">
              {data?.path ?? data?.filename ?? 'unknown'}
            </code>
          </span>
        );

      case 'command_run':
        return (
          <code className="text-xs font-mono bg-gray-900 text-green-400 px-2 py-0.5 rounded">
            $ {data?.command ?? ''}
          </code>
        );

      case 'error': {
        const errMsg = data?.message ?? data?.error ?? String(data ?? '');
        const truncated = errMsg.length > 120;
        return (
          <div>
            <span className="text-red-700 text-xs">
              {expanded || !truncated ? errMsg : errMsg.slice(0, 120) + '...'}
            </span>
            {truncated && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="ml-1.5 text-xs text-red-500 hover:text-red-700 underline flex items-center gap-0.5 inline-flex"
              >
                {expanded ? <><ChevronUp className="h-3 w-3" /> less</> : <><ChevronDown className="h-3 w-3" /> more</>}
              </button>
            )}
          </div>
        );
      }

      case 'error_fixed':
        return (
          <span className="flex items-center gap-2 text-orange-700">
            {data?.message ?? 'Error fixed'}
            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-full border border-orange-200">
              Fixed
            </span>
          </span>
        );

      case 'preview_ready':
        return (
          <span className="font-semibold text-green-700">
            🎉 Preview ready! {data?.url && (
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-indigo-600 hover:text-indigo-800"
              >
                Open preview
              </a>
            )}
          </span>
        );

      case 'completed':
        return (
          <span className="font-semibold text-green-700">
            ✓ Task complete
            {data?.creditsUsed !== undefined && (
              <span className="font-normal text-gray-500">
                {' '}·{' '}
                <span className="inline-flex items-center gap-0.5">
                  <Zap className="h-3 w-3 text-amber-500" />
                  {data.creditsUsed} credits used
                </span>
              </span>
            )}
          </span>
        );

      case 'log':
      default:
        return (
          <span className="text-gray-500 text-xs">
            {typeof data === 'string' ? data : data?.message ?? JSON.stringify(data)}
          </span>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-0"
    >
      {/* Icon */}
      <span
        className={cn(
          'mt-0.5 shrink-0 h-6 w-6 rounded-lg flex items-center justify-center',
          config.iconBg,
          config.iconColor
        )}
      >
        {config.icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-xs leading-relaxed">{renderContent()}</div>
        <p className="text-[10px] text-gray-400 mt-0.5">
          {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
        </p>
      </div>
    </motion.div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyFeed() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="h-10 w-10 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
        <Terminal className="h-5 w-5 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 font-medium">Waiting for activity…</p>
      <p className="text-xs text-gray-400 mt-1">Events will appear here as the task runs.</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ActivityFeed({ events, className, autoScroll = true }: ActivityFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, autoScroll]);

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Activity</h3>
        {events.length > 0 && (
          <span className="text-xs text-gray-500">{events.length} events</span>
        )}
      </div>

      {/* Feed */}
      <div className="overflow-y-auto max-h-96 px-4">
        {events.length === 0 ? (
          <EmptyFeed />
        ) : (
          <AnimatePresence initial={false}>
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </AnimatePresence>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default ActivityFeed;
