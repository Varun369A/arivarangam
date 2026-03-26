'use client';

import React from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  className?: string;
  disabled?: boolean;
}

// ─── Provider (wrap at root) ──────────────────────────────────────────────────

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={300} skipDelayDuration={100}>
      {children}
    </RadixTooltip.Provider>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Tooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 300,
  className,
  disabled = false,
}: TooltipProps) {
  if (disabled || !content) {
    return <>{children}</>;
  }

  return (
    <RadixTooltip.Root delayDuration={delayDuration}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            // Base
            'z-[9999] px-2.5 py-1.5',
            'bg-gray-900 text-white text-xs font-medium',
            'rounded-lg shadow-lg max-w-[220px] text-center',
            // Animations
            'data-[state=delayed-open]:animate-in data-[state=closed]:animate-out',
            'data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95',
            'data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[side=bottom]:slide-in-from-top-1',
            'data-[side=top]:slide-in-from-bottom-1',
            'data-[side=left]:slide-in-from-right-1',
            'data-[side=right]:slide-in-from-left-1',
            'duration-150',
            className
          )}
        >
          {content}
          <RadixTooltip.Arrow className="fill-gray-900" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

export default Tooltip;
