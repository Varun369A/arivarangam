'use client';

import React, { useState } from 'react';
import { Download, RefreshCw, AlertTriangle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/Spinner';
import type { TaskCategory } from '@arivarangam/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PreviewPanelProps {
  category: TaskCategory;
  previewUrl?: string | null;
  imageUrl?: string | null;
  report?: string | null;
  isRunning?: boolean;
  className?: string;
}

// ─── Skeletons / Waiting state ────────────────────────────────────────────────

function WaitingState({ message = 'Waiting for results…' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[240px] gap-4 p-8">
      <Spinner size="lg" color="indigo" />
      <p className="text-sm text-gray-500 text-center">{message}</p>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <div className="h-3 bg-gray-100 rounded-full animate-pulse" />
        <div className="h-3 bg-gray-100 rounded-full animate-pulse w-4/5" />
        <div className="h-3 bg-gray-100 rounded-full animate-pulse w-3/5" />
      </div>
    </div>
  );
}

// ─── Code preview (iframe) ────────────────────────────────────────────────────

function CodePreview({ url }: { url: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="relative w-full h-full min-h-[400px] flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-red-400" />
          <div className="h-3 w-3 rounded-full bg-yellow-400" />
          <div className="h-3 w-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-2 px-2 py-1 bg-white rounded-lg border border-gray-200 text-xs text-gray-500 truncate">
          {url}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => { setLoading(true); setError(false); }}
            className="p-1 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
            title="Reload"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded-lg text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
            title="Open in new tab"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="absolute inset-0 top-[40px] flex items-center justify-center bg-white/80 z-10">
          <Spinner size="md" color="indigo" label="Loading preview…" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="h-12 w-12 rounded-2xl bg-red-100 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700">Preview failed to load</p>
          <p className="text-xs text-gray-500">
            The preview URL may not be accessible.{' '}
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline">
              Open directly
            </a>
          </p>
        </div>
      )}

      {/* iframe */}
      {!error && (
        <iframe
          src={url}
          className="flex-1 w-full border-0"
          title="Code preview"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
          sandbox="allow-scripts allow-same-origin allow-forms"
        />
      )}
    </div>
  );
}

// ─── Image preview ────────────────────────────────────────────────────────────

function ImagePreview({ url }: { url: string }) {
  const [loading, setLoading] = useState(true);

  const filename = url.split('/').pop() ?? 'generated-image.png';

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="relative w-full max-w-lg">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-2xl">
            <Spinner size="lg" color="indigo" label="Loading image…" />
          </div>
        )}
        <img
          src={url}
          alt="Generated image"
          className={cn(
            'w-full h-auto rounded-2xl shadow-lg border border-gray-100 transition-opacity duration-300',
            loading ? 'opacity-0' : 'opacity-100'
          )}
          onLoad={() => setLoading(false)}
        />
      </div>

      {/* Download button */}
      <a
        href={url}
        download={filename}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium',
          'bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm'
        )}
      >
        <Download className="h-4 w-4" />
        Download Image
      </a>
    </div>
  );
}

// ─── Research preview (Markdown-like render) ──────────────────────────────────

function ResearchPreview({ content }: { content: string }) {
  const lines = content.split('\n');

  const renderLine = (line: string, i: number) => {
    if (line.startsWith('# ')) {
      return <h1 key={i} className="text-xl font-bold text-gray-900 mt-4 mb-2">{line.slice(2)}</h1>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={i} className="text-lg font-semibold text-gray-800 mt-3 mb-1.5">{line.slice(3)}</h2>;
    }
    if (line.startsWith('### ')) {
      return <h3 key={i} className="text-base font-semibold text-gray-700 mt-2 mb-1">{line.slice(4)}</h3>;
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return (
        <li key={i} className="ml-4 text-sm text-gray-700 list-disc mb-1">
          {line.slice(2)}
        </li>
      );
    }
    if (/^\d+\. /.test(line)) {
      return (
        <li key={i} className="ml-4 text-sm text-gray-700 list-decimal mb-1">
          {line.replace(/^\d+\. /, '')}
        </li>
      );
    }
    if (line.startsWith('> ')) {
      return (
        <blockquote key={i} className="border-l-4 border-indigo-300 pl-4 py-0.5 my-2 text-sm text-gray-600 italic">
          {line.slice(2)}
        </blockquote>
      );
    }
    if (line.startsWith('---')) {
      return <hr key={i} className="border-gray-200 my-3" />;
    }
    if (line.trim() === '') {
      return <br key={i} />;
    }
    return (
      <p key={i} className="text-sm text-gray-700 mb-1.5 leading-relaxed">
        {line}
      </p>
    );
  };

  return (
    <div className="p-6 overflow-y-auto">
      <div className="prose max-w-none">
        {lines.map((line, i) => renderLine(line, i))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PreviewPanel({
  category,
  previewUrl,
  imageUrl,
  report,
  isRunning = false,
  className,
}: PreviewPanelProps) {
  const hasContent = previewUrl || imageUrl || report;

  const renderContent = () => {
    if (!hasContent) {
      return <WaitingState message={isRunning ? 'Task is running… preview will appear here.' : 'No preview available yet.'} />;
    }

    switch (category) {
      case 'code':
        return previewUrl
          ? <CodePreview url={previewUrl} />
          : <WaitingState message="Waiting for code preview URL…" />;

      case 'image':
        return imageUrl
          ? <ImagePreview url={imageUrl} />
          : <WaitingState message="Generating image…" />;


      case 'research':
        return report
          ? <ResearchPreview content={report} />
          : <WaitingState message="Compiling research report…" />;

      default:
        return <WaitingState />;
    }
  };

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col',
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 capitalize">{category} Preview</h3>
        {isRunning && (
          <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
            </span>
            Running
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {renderContent()}
      </div>
    </div>
  );
}

export default PreviewPanel;
