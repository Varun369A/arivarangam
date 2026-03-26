'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  showClose?: boolean;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const sizeStyles: Record<ModalSize, string> = {
  sm:   'max-w-sm',
  md:   'max-w-md',
  lg:   'max-w-lg',
  xl:   'max-w-2xl',
  full: 'max-w-[95vw] h-[90vh]',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  showClose = true,
  children,
  footer,
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/40 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0'
          )}
        />

        {/* Content */}
        <Dialog.Content
          className={cn(
            // Position
            'fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]',
            // Base styles
            'w-full bg-white rounded-2xl shadow-2xl',
            'flex flex-col',
            'border border-gray-100',
            // Animations
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-bottom-2',
            'data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'duration-200',
            // Size
            sizeStyles[size],
            className
          )}
          onPointerDownOutside={(e) => {
            e.preventDefault();
            onClose();
          }}
        >
          {/* Header */}
          {(title || showClose) && (
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex-1 min-w-0">
                {title && (
                  <Dialog.Title className="text-lg font-semibold text-gray-900 leading-tight">
                    {title}
                  </Dialog.Title>
                )}
                {description && (
                  <Dialog.Description className="mt-1 text-sm text-gray-500">
                    {description}
                  </Dialog.Description>
                )}
              </div>
              {showClose && (
                <Dialog.Close
                  onClick={onClose}
                  className={cn(
                    'shrink-0 p-1.5 rounded-lg text-gray-400',
                    'hover:bg-gray-100 hover:text-gray-600',
                    'transition-colors duration-150',
                    'focus:outline-none focus:ring-2 focus:ring-indigo-300'
                  )}
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Dialog.Close>
              )}
            </div>
          )}

          {/* Body */}
          <div className={cn('flex-1 overflow-y-auto px-6 py-4', size === 'full' && 'min-h-0')}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-6 pb-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ─── Convenience re-exports ───────────────────────────────────────────────────

export { Dialog };

export default Modal;
