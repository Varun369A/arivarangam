'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FollowUpInputProps {
  onSubmit: (prompt: string) => void;
  isRunning?: boolean;
  availableCredits?: number;
  estimatedCostMin?: number;
  estimatedCostMax?: number;
  maxLength?: number;
  placeholder?: string;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FollowUpInput({
  onSubmit,
  isRunning = false,
  availableCredits,
  estimatedCostMin,
  estimatedCostMax,
  maxLength = 2000,
  placeholder = 'Ask a follow-up or request a change…',
  className,
}: FollowUpInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isRunning || trimmed.length > maxLength) return;
    onSubmit(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const remaining = maxLength - value.length;
  const nearLimit = remaining < 200;
  const overLimit = remaining < 0;
  const hasCredits = availableCredits === undefined || availableCredits > 0;
  const canSubmit = value.trim().length > 0 && !isRunning && !overLimit && hasCredits;

  return (
    <div className={cn('bg-white rounded-2xl border border-gray-100 shadow-sm p-4', className)}>
      {/* Label */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Follow-up
      </p>

      <form onSubmit={handleSubmit}>
        {/* Textarea */}
        <div
          className={cn(
            'relative border rounded-xl transition-all duration-200',
            isRunning
              ? 'border-gray-100 bg-gray-50'
              : 'border-gray-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 bg-white'
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRunning ? 'Task is running…' : placeholder}
            disabled={isRunning}
            rows={2}
            className={cn(
              'w-full px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-400',
              'bg-transparent resize-none outline-none',
              'disabled:cursor-not-allowed disabled:opacity-60',
              'min-h-[60px] max-h-[160px]'
            )}
          />

          {/* Send button (inside textarea) */}
          <div className="flex items-end justify-end px-3 pb-2.5">
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold',
                'transition-all duration-150',
                canSubmit
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-sm hover:shadow-md hover:from-indigo-600 hover:to-violet-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
              title="Send (Cmd/Ctrl + Enter)"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </button>
          </div>
        </div>

        {/* Footer: char count + credit estimate */}
        <div className="flex items-center justify-between mt-2">
          {/* Credit estimate */}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            {estimatedCostMin !== undefined && estimatedCostMax !== undefined && value.trim().length > 0 ? (
              <>
                <Zap className="h-3 w-3 text-amber-500" />
                <span>
                  ~{estimatedCostMin}–{estimatedCostMax} credits
                </span>
              </>
            ) : availableCredits !== undefined ? (
              <>
                <Zap className="h-3 w-3 text-indigo-400" />
                <span className={cn(availableCredits < 10 ? 'text-amber-600 font-semibold' : '')}>
                  {availableCredits} credits available
                </span>
              </>
            ) : null}
          </div>

          {/* Char count */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-xs',
                overLimit ? 'text-red-500 font-semibold' : nearLimit ? 'text-amber-500' : 'text-gray-400'
              )}
            >
              {value.length} / {maxLength}
            </span>
            <span className="text-[10px] text-gray-400">⌘↵ to send</span>
          </div>
        </div>

        {/* No credits warning */}
        {availableCredits !== undefined && availableCredits <= 0 && (
          <p className="mt-2 text-xs text-amber-600 font-medium flex items-center gap-1.5">
            <Zap className="h-3 w-3" />
            No credits remaining.{' '}
            <a href="/settings/billing" className="underline hover:text-amber-800">
              Top up
            </a>{' '}
            to continue.
          </p>
        )}
      </form>
    </div>
  );
}

export default FollowUpInput;
