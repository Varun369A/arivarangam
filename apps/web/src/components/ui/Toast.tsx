'use client';

import { Toaster, toast as hotToast } from 'react-hot-toast';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Toaster Provider ─────────────────────────────────────────────────────────

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      containerClassName="mt-2 mr-2"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'transparent',
          boxShadow: 'none',
          padding: 0,
          border: 'none',
          maxWidth: '380px',
        },
      }}
    />
  );
}

// ─── Shared toast content wrapper ────────────────────────────────────────────

interface ToastContentProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  colorClass: string;
  iconClass: string;
}

function ToastContent({ icon, title, description, colorClass, iconClass }: ToastContentProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3.5',
        'bg-white rounded-2xl shadow-lg border',
        'min-w-[280px] max-w-[380px]',
        colorClass
      )}
    >
      <span className={cn('mt-0.5 shrink-0', iconClass)}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 leading-snug">{title}</p>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{description}</p>
        )}
      </div>
    </div>
  );
}

// ─── Toast helpers ────────────────────────────────────────────────────────────

export const toast = {
  success(title: string, description?: string) {
    hotToast.custom(
      <ToastContent
        icon={<CheckCircle2 className="h-5 w-5" />}
        title={title}
        description={description}
        colorClass="border-green-100"
        iconClass="text-green-500"
      />
    );
  },

  error(title: string, description?: string) {
    hotToast.custom(
      <ToastContent
        icon={<XCircle className="h-5 w-5" />}
        title={title}
        description={description}
        colorClass="border-red-100"
        iconClass="text-red-500"
      />,
      { duration: 6000 }
    );
  },

  warning(title: string, description?: string) {
    hotToast.custom(
      <ToastContent
        icon={<AlertTriangle className="h-5 w-5" />}
        title={title}
        description={description}
        colorClass="border-yellow-100"
        iconClass="text-yellow-500"
      />
    );
  },

  info(title: string, description?: string) {
    hotToast.custom(
      <ToastContent
        icon={<Info className="h-5 w-5" />}
        title={title}
        description={description}
        colorClass="border-blue-100"
        iconClass="text-blue-500"
      />
    );
  },

  loading(title: string, description?: string) {
    return hotToast.custom(
      <ToastContent
        icon={<Loader2 className="h-5 w-5 animate-spin" />}
        title={title}
        description={description}
        colorClass="border-indigo-100"
        iconClass="text-indigo-500"
      />,
      { duration: Infinity }
    );
  },

  dismiss(id?: string) {
    hotToast.dismiss(id);
  },

  promise<T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) {
    return hotToast.promise(promise, messages);
  },
};

export default toast;
