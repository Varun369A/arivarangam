'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Zap, X, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreditsBannerProps {
  credits: number;
  threshold?: number;
  className?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreditsBanner({ credits, threshold = 50, className }: CreditsBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || credits >= threshold) return null;

  return (
    <div
      className={cn(
        'relative flex items-center gap-3 px-4 py-3 rounded-2xl',
        'bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500',
        'shadow-md shadow-amber-200',
        className
      )}
      role="alert"
    >
      {/* Icon */}
      <div className="shrink-0 h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
        <Zap className="h-4.5 w-4.5 h-[18px] w-[18px] text-white" />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white leading-none">
          Running low on credits
        </p>
        <p className="text-xs text-amber-100 mt-0.5">
          You have <span className="font-semibold text-white">{credits}</span> credits remaining. Top up to keep going.
        </p>
      </div>

      {/* CTA */}
      <Link
        href="/settings/billing"
        className={cn(
          'shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl',
          'bg-white text-amber-700 text-xs font-bold',
          'hover:bg-amber-50 transition-colors duration-150 shadow-sm',
          'whitespace-nowrap'
        )}
      >
        Buy Credits
        <ArrowRight className="h-3 w-3" />
      </Link>

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default CreditsBanner;
