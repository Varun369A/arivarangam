'use client';

import React from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  options?: SelectOption[];
  groups?: SelectGroup[];
  disabled?: boolean;
  label?: string;
  error?: string;
  hint?: string;
  className?: string;
  triggerClassName?: string;
}

// ─── Item component ───────────────────────────────────────────────────────────

function SelectItem({ option }: { option: SelectOption }) {
  return (
    <RadixSelect.Item
      value={option.value}
      disabled={option.disabled}
      className={cn(
        'relative flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg',
        'text-gray-700 cursor-pointer select-none outline-none',
        'hover:bg-indigo-50 hover:text-indigo-700',
        'data-[state=checked]:text-indigo-600 data-[state=checked]:font-medium',
        'data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed',
        'transition-colors duration-100'
      )}
    >
      <RadixSelect.ItemIndicator className="absolute right-2.5">
        <Check className="h-3.5 w-3.5 text-indigo-500" />
      </RadixSelect.ItemIndicator>

      {option.icon && (
        <span className="shrink-0 text-gray-500">{option.icon}</span>
      )}

      <div className="flex-1 min-w-0 pr-5">
        <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
        {option.description && (
          <p className="text-xs text-gray-400 mt-0.5">{option.description}</p>
        )}
      </div>
    </RadixSelect.Item>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Select({
  value,
  onValueChange,
  placeholder = 'Select an option',
  options = [],
  groups = [],
  disabled = false,
  label,
  error,
  hint,
  className,
  triggerClassName,
}: SelectProps) {
  const labelId = label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={labelId}
          className="text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}

      <RadixSelect.Root
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <RadixSelect.Trigger
          id={labelId}
          className={cn(
            'inline-flex items-center justify-between gap-2',
            'w-full h-10 px-3 text-sm',
            'bg-white border rounded-xl',
            'text-gray-900 placeholder:text-gray-400',
            'transition-all duration-200 outline-none',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-100'
              : 'border-gray-200 hover:border-gray-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50',
            'data-[placeholder]:text-gray-400',
            triggerClassName
          )}
          aria-label={label}
        >
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon className="text-gray-400 shrink-0">
            <ChevronDown className="h-4 w-4" />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>

        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={6}
            className={cn(
              'z-50 w-[var(--radix-select-trigger-width)]',
              'min-w-[160px] max-h-64',
              'bg-white rounded-xl shadow-xl border border-gray-100',
              'overflow-hidden',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
              'data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              'data-[side=bottom]:slide-in-from-top-2',
              'data-[side=top]:slide-in-from-bottom-2',
              'duration-150'
            )}
          >
            <RadixSelect.ScrollUpButton className="flex items-center justify-center h-7 bg-white text-gray-500">
              <ChevronUp className="h-4 w-4" />
            </RadixSelect.ScrollUpButton>

            <RadixSelect.Viewport className="p-1.5">
              {/* Flat options */}
              {options.map((option) => (
                <SelectItem key={option.value} option={option} />
              ))}

              {/* Grouped options */}
              {groups.map((group, i) => (
                <RadixSelect.Group key={i}>
                  <RadixSelect.Label className="px-3 py-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    {group.label}
                  </RadixSelect.Label>
                  {group.options.map((option) => (
                    <SelectItem key={option.value} option={option} />
                  ))}
                  {i < groups.length - 1 && (
                    <RadixSelect.Separator className="h-px bg-gray-100 my-1" />
                  )}
                </RadixSelect.Group>
              ))}
            </RadixSelect.Viewport>

            <RadixSelect.ScrollDownButton className="flex items-center justify-center h-7 bg-white text-gray-500">
              <ChevronDown className="h-4 w-4" />
            </RadixSelect.ScrollDownButton>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>

      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

export default Select;
