'use client';

import React from 'react';
import { Zap, Star, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatINR } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import type { CreditPack } from '@arivarangam/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreditPackCardProps {
  pack: CreditPack;
  onBuy: (pack: CreditPack) => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

// ─── Default feature lists per pack name ─────────────────────────────────────

const defaultFeatures: Record<string, string[]> = {
  Starter: [
    'All task categories',
    'Code, Research, Image & Content',
    'File downloads',
  ],
  Pro: [
    'Everything in Starter',
    'Priority queue',
    'Larger context tasks',
    'Best value per credit',
  ],
  Business: [
    'Everything in Pro',
    'Bulk discount applied',
    'Dedicated support',
    'API access (soon)',
  ],
  Basic: [
    'All task categories',
    'Code, Research, Image & Content',
    '30-day validity',
  ],
};

function getFeatures(pack: CreditPack): string[] {
  return (
    defaultFeatures[pack.name] ?? [
      'All task categories',
      `${pack.credits.toLocaleString()} total credits`,
      'No expiry',
    ]
  );
}

// ─── Per-credit price ─────────────────────────────────────────────────────────

function perCreditPrice(pack: CreditPack): string {
  const paise = (pack.price_inr / pack.credits) * 100;
  if (paise < 100) return `${paise.toFixed(0)}p / credit`;
  return `₹${(pack.price_inr / pack.credits).toFixed(2)} / credit`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CreditPackCard({
  pack,
  onBuy,
  loading = false,
  disabled = false,
  className,
}: CreditPackCardProps) {
  const features = getFeatures(pack);

  return (
    <div
      className={cn(
        'relative flex flex-col bg-white rounded-2xl border',
        'transition-all duration-200',
        pack.popular
          ? [
              'border-indigo-300 shadow-lg shadow-indigo-100',
              'hover:shadow-xl hover:shadow-indigo-200 hover:-translate-y-1',
              'bg-gradient-to-br from-white to-indigo-50/50',
            ]
          : [
              'border-gray-100 shadow-sm',
              'hover:shadow-md hover:border-indigo-100 hover:-translate-y-0.5',
            ],
        className
      )}
    >
      {/* Popular badge */}
      {pack.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-bold rounded-full shadow-md shadow-indigo-200">
            <Star className="h-3 w-3 fill-current" />
            Most Popular
          </span>
        </div>
      )}

      <div className="flex flex-col flex-1 p-6">
        {/* Pack name */}
        <div className="flex items-center justify-between mb-4">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center">
            <Zap className="h-4.5 w-4.5 h-[18px] w-[18px] text-indigo-600" />
          </div>
          <span className="text-sm font-semibold text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
            {pack.name}
          </span>
        </div>

        {/* Price */}
        <div className="mb-1">
          <span className="text-3xl font-black text-gray-900">
            {formatINR(pack.price_inr)}
          </span>
        </div>

        {/* Credits */}
        <div className="flex items-center gap-1.5 mb-1">
          <Zap className="h-4 w-4 text-amber-500" />
          <span className="text-lg font-bold text-gray-800">
            {pack.credits.toLocaleString()} credits
          </span>
        </div>

        {/* Per-credit price */}
        <p className="text-xs text-gray-500 mb-5">{perCreditPrice(pack)}</p>

        {/* Description */}
        {pack.description && (
          <p className="text-sm text-gray-600 mb-5 leading-relaxed">{pack.description}</p>
        )}

        {/* Features */}
        <ul className="flex flex-col gap-2 mb-6 flex-1">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
              <span
                className={cn(
                  'h-4.5 h-[18px] w-[18px] rounded-full flex items-center justify-center shrink-0 mt-0.5',
                  pack.popular
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'bg-green-100 text-green-600'
                )}
              >
                <Check className="h-3 w-3" />
              </span>
              {feature}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Button
          variant={pack.popular ? 'primary' : 'secondary'}
          fullWidth
          loading={loading}
          disabled={disabled}
          onClick={() => onBuy(pack)}
          className={pack.popular ? 'shadow-md shadow-indigo-200' : ''}
        >
          Buy {pack.name}
        </Button>
      </div>
    </div>
  );
}

// ─── Grid wrapper ─────────────────────────────────────────────────────────────

export function CreditPackGrid({
  packs,
  onBuy,
  loadingId,
  className,
}: {
  packs: CreditPack[];
  onBuy: (pack: CreditPack) => void;
  loadingId?: string | null;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4', className)}>
      {packs.map((pack) => (
        <CreditPackCard
          key={pack.id}
          pack={pack}
          onBuy={onBuy}
          loading={loadingId === pack.id}
          disabled={loadingId !== null && loadingId !== pack.id}
        />
      ))}
    </div>
  );
}

export default CreditPackCard;
