'use client';

import React, { useMemo, useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  File,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TaskFile } from '@arrivarangam/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FileTreeProps {
  files: TaskFile[];
  selectedPath?: string | null;
  onSelect?: (file: TaskFile) => void;
  className?: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: TreeNode[];
  file?: TaskFile;
}

// ─── File icon / color map ────────────────────────────────────────────────────

function getFileIcon(filename: string): { icon: React.ReactNode; color: string } {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, { icon: React.ReactNode; color: string }> = {
    tsx:  { icon: <FileText className="h-3.5 w-3.5" />, color: 'text-blue-500' },
    ts:   { icon: <FileText className="h-3.5 w-3.5" />, color: 'text-blue-600' },
    jsx:  { icon: <FileText className="h-3.5 w-3.5" />, color: 'text-cyan-500' },
    js:   { icon: <FileText className="h-3.5 w-3.5" />, color: 'text-yellow-500' },
    json: { icon: <FileText className="h-3.5 w-3.5" />, color: 'text-yellow-600' },
    md:   { icon: <FileText className="h-3.5 w-3.5" />, color: 'text-gray-500' },
    css:  { icon: <FileText className="h-3.5 w-3.5" />, color: 'text-pink-500' },
    scss: { icon: <FileText className="h-3.5 w-3.5" />, color: 'text-pink-600' },
    html: { icon: <FileText className="h-3.5 w-3.5" />, color: 'text-orange-500' },
    py:   { icon: <FileText className="h-3.5 w-3.5" />, color: 'text-green-600' },
    go:   { icon: <FileText className="h-3.5 w-3.5" />, color: 'text-cyan-600' },
    rs:   { icon: <FileText className="h-3.5 w-3.5" />, color: 'text-orange-600' },
    sh:   { icon: <FileText className="h-3.5 w-3.5" />, color: 'text-gray-600' },
    env:  { icon: <FileText className="h-3.5 w-3.5" />, color: 'text-emerald-600' },
    svg:  { icon: <FileText className="h-3.5 w-3.5" />, color: 'text-purple-500' },
    png:  { icon: <File className="h-3.5 w-3.5" />, color: 'text-indigo-400' },
    jpg:  { icon: <File className="h-3.5 w-3.5" />, color: 'text-indigo-400' },
    gif:  { icon: <File className="h-3.5 w-3.5" />, color: 'text-indigo-400' },
  };
  return map[ext] ?? { icon: <File className="h-3.5 w-3.5" />, color: 'text-gray-400' };
}

// ─── Build tree ───────────────────────────────────────────────────────────────

function buildTree(files: TaskFile[]): TreeNode[] {
  const root: Record<string, TreeNode> = {};

  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean);
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const pathSoFar = parts.slice(0, i + 1).join('/');
      const isLast = i === parts.length - 1;

      if (!current[part]) {
        current[part] = {
          name: part,
          path: pathSoFar,
          type: isLast ? 'file' : 'dir',
          children: isLast ? undefined : {},
          file: isLast ? file : undefined,
        } as unknown as TreeNode;
      }

      if (!isLast) {
        current = (current[part] as unknown as { children: Record<string, TreeNode> }).children;
      }
    }
  }

  function toArray(obj: Record<string, TreeNode>): TreeNode[] {
    return Object.values(obj)
      .map((node) => {
        if (node.type === 'dir' && node.children) {
          return {
            ...node,
            children: toArray(node.children as unknown as Record<string, TreeNode>),
          };
        }
        return node;
      })
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  return toArray(root);
}

// ─── Tree Node Component ──────────────────────────────────────────────────────

interface TreeNodeProps {
  node: TreeNode;
  depth: number;
  selectedPath?: string | null;
  onSelect?: (file: TaskFile) => void;
}

function TreeNodeItem({ node, depth, selectedPath, onSelect }: TreeNodeProps) {
  const [open, setOpen] = useState(depth < 2);
  const isSelected = node.type === 'file' && selectedPath === node.path;
  const { icon, color } = node.type === 'file' ? getFileIcon(node.name) : { icon: null, color: '' };

  const indent = depth * 14;

  if (node.type === 'dir') {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{ paddingLeft: `${8 + indent}px` }}
          className="flex items-center gap-1.5 w-full py-1.5 pr-3 text-xs font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors group"
        >
          <span className="text-gray-400 shrink-0">
            {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
          <span className="text-amber-500 shrink-0">
            {open ? <FolderOpen className="h-3.5 w-3.5" /> : <Folder className="h-3.5 w-3.5" />}
          </span>
          <span className="truncate">{node.name}</span>
          {node.children && (
            <span className="text-[10px] text-gray-400 ml-auto shrink-0">
              {node.children.length}
            </span>
          )}
        </button>
        {open && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeNodeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => node.file && onSelect?.(node.file)}
      style={{ paddingLeft: `${8 + indent}px` }}
      className={cn(
        'flex items-center gap-1.5 w-full py-1.5 pr-3 text-xs rounded-lg transition-colors text-left',
        isSelected
          ? 'bg-indigo-50 text-indigo-700 font-medium'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      )}
    >
      <span className="w-3 shrink-0" /> {/* Spacer for alignment */}
      <span className={cn('shrink-0', isSelected ? 'text-indigo-500' : color)}>{icon}</span>
      <span className="truncate">{node.name}</span>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FileTree({ files, selectedPath, onSelect, className }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files]);

  if (files.length === 0) {
    return (
      <div className={cn('bg-white rounded-2xl border border-gray-100 shadow-sm p-4', className)}>
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Folder className="h-8 w-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No files yet</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Files</h3>
        <span className="text-xs text-gray-500">{files.length} file{files.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Tree */}
      <div className="p-2 overflow-y-auto max-h-80">
        {tree.map((node) => (
          <TreeNodeItem
            key={node.path}
            node={node}
            depth={0}
            selectedPath={selectedPath}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

export default FileTree;
