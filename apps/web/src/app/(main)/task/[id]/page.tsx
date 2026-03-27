'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { useTaskStream, type TaskEvent, type TaskStreamFile } from '@/hooks/useTaskStream';
import { tasksApi, reposApi, getApiError, type Task } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function elapsed(start?: string | null, end?: string | null): string {
  if (!start) return '—';
  const ms = new Date(end ?? new Date()).getTime() - new Date(start).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function fileExt(path: string): string {
  return path.split('.').pop()?.toLowerCase() ?? '';
}

function fileIcon(path: string): string {
  const ext = fileExt(path);
  const map: Record<string, string> = {
    ts: '🔷', tsx: '🔷', js: '🟡', jsx: '🟡',
    css: '🎨', scss: '🎨', html: '🟠',
    json: '📋', md: '📝', txt: '📄',
    py: '🐍', rs: '🦀', go: '🐹',
    svg: '🖼️', png: '🖼️', jpg: '🖼️',
    sh: '⚙️', env: '🔑',
  };
  return map[ext] ?? '📄';
}

function langLabel(path: string): string {
  const ext = fileExt(path);
  const map: Record<string, string> = {
    ts: 'TypeScript', tsx: 'TSX', js: 'JavaScript', jsx: 'JSX',
    css: 'CSS', scss: 'SCSS', html: 'HTML', json: 'JSON',
    md: 'Markdown', py: 'Python', rs: 'Rust', go: 'Go',
    sh: 'Shell', txt: 'Text', svg: 'SVG',
  };
  return (map[ext] ?? ext.toUpperCase()) || 'Text';
}

// Simple syntax highlight (escape HTML first, then wrap tokens in spans)
function syntaxHighlight(code: string, path: string): string {
  const ext = fileExt(path);
  // Escape HTML entities
  let s = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (ext === 'json') {
    s = s
      .replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, '<span class="hl-key">$1</span>$2')
      .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="hl-str">$1</span>')
      .replace(/\b(true|false|null)\b/g, '<span class="hl-kw">$1</span>')
      .replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="hl-num">$1</span>');
  } else if (['ts', 'tsx', 'js', 'jsx'].includes(ext)) {
    s = s
      .replace(/(\/\/[^\n]*)/g, '<span class="hl-comment">$1</span>')
      .replace(/(&quot;(?:[^&]|&(?!quot;))*&quot;|&#x27;[^&#x27;]*&#x27;)/g, '<span class="hl-str">$1</span>')
      .replace(/\b(const|let|var|function|class|import|export|from|return|if|else|for|while|async|await|new|this|interface|type|extends|implements|default|null|undefined|true|false|void|string|number|boolean)\b/g, '<span class="hl-kw">$1</span>');
  } else if (ext === 'css' || ext === 'scss') {
    s = s
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="hl-comment">$1</span>')
      .replace(/([.#][\w-]+)(?=\s*\{)/g, '<span class="hl-cls">$1</span>')
      .replace(/([\w-]+)\s*:/g, '<span class="hl-key">$1</span>:');
  } else if (ext === 'html') {
    s = s
      .replace(/(&lt;\/?[\w]+)/g, '<span class="hl-tag">$1</span>')
      .replace(/([\w-]+=)(&quot;[^&]*&quot;)/g, '<span class="hl-attr">$1</span><span class="hl-str">$2</span>');
  } else if (ext === 'py') {
    s = s
      .replace(/(#[^\n]*)/g, '<span class="hl-comment">$1</span>')
      .replace(/\b(def|class|import|from|return|if|else|elif|for|while|with|as|try|except|finally|pass|None|True|False|and|or|not|in|is)\b/g, '<span class="hl-kw">$1</span>');
  }

  return s;
}

// Build a folder tree from flat file list
interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function buildTree(files: TaskStreamFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  for (const file of files) {
    const parts = file.path.split('/');
    let nodes = root;
    let fullPath = '';
    for (let i = 0; i < parts.length; i++) {
      fullPath = fullPath ? `${fullPath}/${parts[i]}` : parts[i];
      const isLast = i === parts.length - 1;
      let node = nodes.find(n => n.name === parts[i]);
      if (!node) {
        node = { name: parts[i], path: fullPath, isDir: !isLast, children: [] };
        nodes.push(node);
      }
      if (!isLast) nodes = node.children;
    }
  }
  return root;
}

// ─── FileTree ──────────────────────────────────────────────────────────────────

function FileTreeNode({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
}) {
  const [open, setOpen] = useState(true);

  if (node.isDir) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors text-left"
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          <span className="text-slate-400 text-[10px]">{open ? '▾' : '▸'}</span>
          <span className="text-slate-400">📁</span>
          <span className="font-medium truncate">{node.name}</span>
        </button>
        {open && node.children.map(child => (
          <FileTreeNode key={child.path} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />
        ))}
      </div>
    );
  }

  const isSelected = selectedPath === node.path;
  return (
    <button
      type="button"
      onClick={() => onSelect(node.path)}
      className={cn(
        'w-full flex items-center gap-1.5 px-2 py-1 text-xs rounded-lg transition-colors text-left group',
        isSelected ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'
      )}
      style={{ paddingLeft: `${8 + depth * 12}px` }}
    >
      <span>{fileIcon(node.name)}</span>
      <span className={cn('truncate', isSelected ? 'font-semibold' : 'font-medium')}>{node.name}</span>
    </button>
  );
}

// ─── Chat Activity ─────────────────────────────────────────────────────────────

function ActivityItem({ event }: { event: TaskEvent }) {
  const [expanded, setExpanded] = useState(false);
  const d = (event.data ?? {}) as any;

  if (event.type === 'connected' || event.type === 'stream_end') return null;

  if (event.type === 'user_message') {
    return (
      <div className="flex justify-end mb-2">
        <div className="max-w-[85%] bg-indigo-600 text-white text-xs px-3 py-2 rounded-2xl rounded-br-sm leading-relaxed font-medium">
          {String(d.message ?? '')}
        </div>
      </div>
    );
  }

  if (event.type === 'file_created') {
    return (
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-600 text-[10px] flex items-center justify-center flex-shrink-0 font-bold">✓</span>
        <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 min-w-0">
          <span className="text-[10px]">{fileIcon(String(d.path ?? ''))}</span>
          <code className="text-xs text-emerald-700 font-mono truncate">{String(d.path ?? '')}</code>
        </div>
      </div>
    );
  }

  if (event.type === 'file_updated') {
    return (
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 text-[10px] flex items-center justify-center flex-shrink-0 font-bold">↻</span>
        <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 min-w-0">
          <span className="text-[10px]">{fileIcon(String(d.path ?? ''))}</span>
          <code className="text-xs text-blue-700 font-mono truncate">{String(d.path ?? '')}</code>
        </div>
      </div>
    );
  }

  if (event.type === 'completed') {
    return (
      <div className="my-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <span className="text-emerald-500 text-sm">✓</span>
          <span className="text-xs font-semibold text-emerald-700">
            {String(d.message ?? 'Task completed!')}
          </span>
        </div>
        {d.fileCount != null && (
          <p className="text-xs text-emerald-600 mt-1 ml-5">{d.fileCount} file{d.fileCount !== 1 ? 's' : ''} generated</p>
        )}
      </div>
    );
  }

  if (event.type === 'error') {
    return (
      <div className="my-1.5">
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-2.5 py-1.5">
          <span className="text-red-500 text-xs">✗</span>
          <span className="text-xs text-red-700 truncate">{String(d.message ?? d.error ?? 'Error')}</span>
          {(d.snippet || d.details) && (
            <button type="button" className="text-[10px] text-red-500 underline ml-auto shrink-0" onClick={() => setExpanded(e => !e)}>
              {expanded ? 'hide' : 'details'}
            </button>
          )}
        </div>
        {expanded && (
          <pre className="mt-1 text-[10px] bg-red-50 border border-red-100 rounded p-2 overflow-x-auto whitespace-pre-wrap text-red-700">
            {String(d.snippet ?? d.details)}
          </pre>
        )}
      </div>
    );
  }

  if (event.type === 'log') {
    return (
      <div className="flex items-start gap-2 mb-1">
        <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
        <span className="text-xs text-slate-500 leading-relaxed">{String(d.message ?? d.log ?? '')}</span>
      </div>
    );
  }

  if (event.type === 'command_run') {
    return (
      <div className="mb-1.5 bg-slate-900 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
        <span className="text-slate-500 text-xs">$</span>
        <code className="text-xs text-green-400 font-mono truncate">{String(d.command ?? d.cmd ?? '')}</code>
      </div>
    );
  }

  if (event.type === 'error_fixed') {
    return (
      <div className="flex items-center gap-2 mb-1">
        <span className="text-orange-500 text-xs">🔧</span>
        <span className="text-xs text-orange-600">Fixed: <code className="font-mono">{String(d.file ?? d.path ?? '')}</code></span>
      </div>
    );
  }

  return null;
}

// ─── Code Viewer ──────────────────────────────────────────────────────────────

function CodeViewer({ file }: { file: TaskStreamFile | null }) {
  const [copied, setCopied] = useState(false);

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="text-4xl mb-3">👈</div>
        <p className="text-sm font-semibold text-slate-600">Select a file</p>
        <p className="text-xs text-slate-400 mt-1">Click any file in the explorer to view its code</p>
      </div>
    );
  }

  const fileContent = file.content ?? '';
  const lines = fileContent.split('\n');
  const highlighted = syntaxHighlight(fileContent, file.path);

  function copyToClipboard() {
    navigator.clipboard.writeText(fileContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const filePath = file.path;
  function downloadFile() {
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filePath.split('/').pop() ?? 'file.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* File header */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-800 border-b border-slate-700 flex-shrink-0">
        <span className="text-sm">{fileIcon(file.path)}</span>
        <span className="text-xs font-mono text-slate-300 truncate flex-1">{file.path}</span>
        <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-0.5 rounded font-medium">{langLabel(file.path)}</span>
        <span className="text-[10px] text-slate-500">{lines.length} lines</span>
        <button
          type="button"
          onClick={downloadFile}
          className="text-[10px] text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded hover:bg-slate-700"
        >
          ↓ Save
        </button>
        <button
          type="button"
          onClick={copyToClipboard}
          className={cn(
            'text-[10px] px-2 py-1 rounded transition-colors',
            copied ? 'text-emerald-400 bg-emerald-900/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
          )}
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      {/* Code area */}
      <div className="flex-1 overflow-auto bg-slate-900">
        <style>{`
          .hl-kw  { color: #f97583; }
          .hl-str { color: #9ecbff; }
          .hl-comment { color: #6a737d; font-style: italic; }
          .hl-num { color: #f8c555; }
          .hl-key { color: #79b8ff; }
          .hl-cls { color: #b392f0; }
          .hl-tag { color: #85e89d; }
          .hl-attr { color: #ffab70; }
        `}</style>
        <table className="w-full text-xs font-mono" style={{ borderSpacing: 0 }}>
          <tbody>
            {lines.map((_, i) => {
              const lineHtml = highlighted.split('\n')[i] ?? '';
              return (
                <tr key={i} className="hover:bg-white/5">
                  <td
                    className="text-slate-600 text-right pr-3 pl-4 select-none w-8 align-top"
                    style={{ fontSize: '10px', paddingTop: '2px', paddingBottom: '2px' }}
                  >
                    {i + 1}
                  </td>
                  <td
                    className="text-slate-200 pr-4 align-top whitespace-pre"
                    style={{ paddingTop: '2px', paddingBottom: '2px' }}
                    dangerouslySetInnerHTML={{ __html: lineHtml || ' ' }}
                  />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Preview Panel ────────────────────────────────────────────────────────────

function PreviewContent({
  task,
  previewUrl,
  streamFiles,
}: {
  task: any;
  previewUrl: string | null;
  streamFiles: TaskStreamFile[];
}) {
  if (previewUrl) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 border-b border-slate-200 flex-shrink-0">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-white rounded-lg px-3 py-1 text-xs text-slate-500 font-mono truncate border border-slate-200">
            {previewUrl}
          </div>
          <a href={previewUrl} target="_blank" rel="noreferrer"
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium shrink-0">
            Open ↗
          </a>
        </div>
        <iframe src={previewUrl} className="flex-1 w-full border-0" title="Preview" />
      </div>
    );
  }

  const imageFile = streamFiles.find(f => ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(fileExt(f.path)));
  if (task?.category === 'image' && imageFile?.content) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-100 p-8">
        <img src={imageFile.content} alt="Generated" className="max-w-full max-h-full rounded-xl shadow-lg" />
      </div>
    );
  }

  if (streamFiles.length > 0) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-lg mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4">
            <div className="text-3xl mb-3">📦</div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Project ready</h3>
            <p className="text-sm text-slate-500 mb-4">
              {streamFiles.length} file{streamFiles.length !== 1 ? 's' : ''} generated. Select a file on the left to view its code, or download everything below.
            </p>
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([JSON.stringify(
                  Object.fromEntries(streamFiles.map(f => [f.path, f.content ?? ''])),
                  null, 2
                )], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'project-files.json';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              ↓ Download all files
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Generated files</p>
            </div>
            <div className="divide-y divide-slate-50">
              {streamFiles.map(f => (
                <div key={f.path} className="flex items-center gap-3 px-4 py-2.5">
                  <span>{fileIcon(f.path)}</span>
                  <code className="text-xs text-slate-700 font-mono flex-1 truncate">{f.path}</code>
                  <span className="text-[10px] text-slate-400">{(f.content ?? '').split('\n').length} lines</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="text-5xl mb-4">🔭</div>
      <p className="text-sm font-semibold text-slate-600">Preview will appear here</p>
      <p className="text-xs text-slate-400 mt-1">Once your task completes, you can view the output here</p>
    </div>
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  pending:   'bg-slate-400',
  queued:    'bg-slate-400',
  analyzing: 'bg-purple-500 animate-pulse',
  running:   'bg-blue-500 animate-pulse',
  done:      'bg-emerald-500',
  completed: 'bg-emerald-500',
  failed:    'bg-red-500',
  cancelled: 'bg-slate-300',
};
const STATUS_TEXT: Record<string, string> = {
  pending: 'Pending', queued: 'Queued', analyzing: 'Analyzing…',
  running: 'Running…', done: 'Completed', completed: 'Completed',
  failed: 'Failed', cancelled: 'Cancelled',
};
const STATUS_COLOR: Record<string, string> = {
  pending: 'text-slate-500', queued: 'text-slate-500', analyzing: 'text-purple-600',
  running: 'text-blue-600', done: 'text-emerald-600', completed: 'text-emerald-600',
  failed: 'text-red-600', cancelled: 'text-slate-400',
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TaskPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const taskId = params.id;

  const { user } = useAuth();
  const { balance } = useCredits();
  const _u = user; const _b = balance; // suppress unused

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'code' | 'preview'>('code');
  const [followUp, setFollowUp] = useState('');
  const [followUpSubmitting, setFollowUpSubmitting] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [savedRepo, setSavedRepo] = useState<{ id: string; name: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isTerminal = (s: string) => ['done', 'completed', 'failed', 'cancelled'].includes(s);
  const streamActive = task !== null && confirmed;
  const {
    events, status: streamStatus, previewUrl, files: streamFiles,
    isConnected, isComplete, forceReconnect,
  } = useTaskStream(streamActive ? taskId : null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load task
  useEffect(() => {
    if (!taskId) return;
    setLoading(true);
    tasksApi.get(taskId)
      .then(t => {
        const obj = (t as any)?.data?.task ?? (t as any);
        setTask(obj);
        const s = (obj as any).status ?? '';
        if (['running', 'analyzing', 'done', 'completed', 'failed', 'cancelled'].includes(s)) {
          setConfirmed(true);
        } else {
          setConfirmed(true); // auto-confirm
        }
      })
      .catch(() => setLoadError('Task not found'))
      .finally(() => setLoading(false));
  }, [taskId]);

  // Sync stream status
  useEffect(() => {
    if (!streamStatus || !task) return;
    setTask(prev => prev ? { ...prev, status: streamStatus } as any : prev);
  }, [streamStatus]);

  // Reload on complete
  useEffect(() => {
    if (!isComplete || !taskId) return;
    tasksApi.get(taskId)
      .then(t => setTask((t as any)?.data?.task ?? (t as any)))
      .catch(() => {});
  }, [isComplete, taskId]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  // Auto-select first file
  useEffect(() => {
    if (streamFiles.length > 0 && !selectedFilePath) {
      const firstFile = streamFiles.find(f => !f.path.endsWith('/'));
      if (firstFile) setSelectedFilePath(firstFile.path);
    }
  }, [streamFiles, selectedFilePath]);

  const handleFollowUp = useCallback(async () => {
    if (!task || !followUp.trim()) return;
    setFollowUpSubmitting(true);
    setFollowUpError(null);
    try {
      await tasksApi.followUp(task.id, followUp.trim());
      setFollowUp('');
      setTask(prev => prev ? { ...prev, status: 'running' } as any : prev);
      setConfirmed(true);
      forceReconnect();
    } catch (err) {
      setFollowUpError(getApiError(err));
    } finally {
      setFollowUpSubmitting(false);
    }
  }, [task, followUp, forceReconnect]);

  const handleCancelTask = useCallback(async () => {
    if (!task) return;
    setCancelling(true);
    try {
      await tasksApi.cancel(task.id);
      setTask(prev => prev ? { ...prev, status: 'cancelled' } as any : prev);
    } catch { /* ignore */ }
    finally { setCancelling(false); }
  }, [task]);

  const handleSaveRepo = useCallback(async () => {
    if (!task) return;
    const repoName = (task as any).prompt.split('\n')[0]
      .slice(0, 50).replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'my-project';
    try {
      const repo = await reposApi.create({ name: repoName, isPublic: false });
      const obj = (repo as any)?.data?.repo ?? (repo as any);
      setSavedRepo({ id: obj.id, name: obj.name });
    } catch { /* ignore */ }
  }, [task]);

  const handleDownload = useCallback(() => {
    if (!streamFiles.length) return;
    const content = streamFiles.map(f => `// === ${f.path} ===\n${f.content ?? ''}`).join('\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `task-${taskId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [streamFiles, taskId]);

  const handleDelete = useCallback(async () => {
    if (!task) return;
    try {
      await tasksApi.deletePermanent(task.id);
      router.push('/task');
    } catch { /* ignore */ }
  }, [task, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading project…</p>
        </div>
      </div>
    );
  }

  if (loadError || !task) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-slate-700 font-semibold">{loadError ?? 'Task not found'}</p>
          <Link href="/task" className="btn-primary">← Back to Tasks</Link>
        </div>
      </div>
    );
  }

  const taskStatus = (task as any)?.status ?? '';
  const isRunning = !isTerminal(taskStatus) && confirmed;
  const isCompleted = taskStatus === 'done' || taskStatus === 'completed';
  const isCodeTask = task?.category === 'code';
  const taskTitle = (task as any).prompt?.split('\n')[0]?.slice(0, 72) ?? 'Untitled task';
  const treeNodes = buildTree(streamFiles);
  const selectedFile = streamFiles.find(f => f.path === selectedFilePath) ?? null;

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-50" style={{ fontFamily: 'var(--font-inter)' }}>

      {/* Delete confirm dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-base font-bold text-slate-900 mb-2">Delete task?</h3>
            <p className="text-sm text-slate-500 mb-5">This will permanently delete the task and all generated files. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 btn-secondary py-2">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Header ─── */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm">
        <Link href="/task" className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded-lg hover:bg-slate-100 flex-shrink-0" aria-label="Back">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 truncate leading-tight">{taskTitle}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-slate-400 capitalize font-medium">{task?.category}</span>
            <span className="text-slate-300">·</span>
            <div className={cn('flex items-center gap-1 text-[11px] font-semibold', STATUS_COLOR[taskStatus])}>
              <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[taskStatus])} />
              {STATUS_TEXT[taskStatus] ?? taskStatus}
            </div>
            {isConnected && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                  <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />Live
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isRunning && (
            <button onClick={handleCancelTask} disabled={cancelling}
              className="px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50">
              {cancelling ? '…' : 'Cancel'}
            </button>
          )}
          {isCodeTask && isCompleted && !savedRepo && streamFiles.length > 0 && (
            <button onClick={handleSaveRepo}
              className="px-3 py-1.5 text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl transition-colors border border-indigo-200">
              💾 Save to Repos
            </button>
          )}
          {savedRepo && (
            <Link href={`/repos/${savedRepo.id}`}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
              ✓ Saved
            </Link>
          )}
          {streamFiles.length > 0 && (
            <button onClick={handleDownload}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200">
              ↓ Export
            </button>
          )}
          <button onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete task">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* ─── Main 3-panel area ─── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Panel 1: File Explorer */}
        <div className="w-52 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
          <div className="px-3 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Files</span>
            {streamFiles.length > 0 && (
              <span className="text-[10px] bg-indigo-100 text-indigo-600 rounded-full px-1.5 font-semibold">{streamFiles.length}</span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto py-1.5 px-1">
            {streamFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                {isRunning ? (
                  <>
                    <div className="w-6 h-6 border-2 border-slate-200 border-t-indigo-400 rounded-full animate-spin mb-2" />
                    <p className="text-[11px] text-slate-400">Generating…</p>
                  </>
                ) : (
                  <>
                    <span className="text-2xl mb-2">📂</span>
                    <p className="text-[11px] text-slate-400">No files yet</p>
                  </>
                )}
              </div>
            ) : (
              treeNodes.map(node => (
                <FileTreeNode
                  key={node.path}
                  node={node}
                  depth={0}
                  selectedPath={selectedFilePath}
                  onSelect={(p) => { setSelectedFilePath(p); setRightTab('code'); }}
                />
              ))
            )}
          </div>
        </div>

        {/* Panel 2: Chat / Activity */}
        <div className="w-80 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-hidden">
          <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Activity</span>
            <div className="flex items-center gap-3">
              {(task as any).creditsActuallyUsed != null && (
                <span className="text-[10px] text-slate-400 font-medium">
                  {(task as any).creditsActuallyUsed} cr used
                </span>
              )}
              {isRunning && (
                <div className="flex gap-1">
                  {[0, 150, 300].map(d => (
                    <span key={d} className="w-1 h-1 bg-blue-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${d}ms` }} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Chat feed */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
            {events.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
                <div className="w-8 h-8 border-2 border-slate-200 border-t-indigo-400 rounded-full animate-spin" />
                <p className="text-xs">Connecting…</p>
              </div>
            )}
            {events.map((evt, i) => (
              <ActivityItem key={i} event={evt} />
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Follow-up input */}
          <div className="border-t border-slate-100 p-3 flex-shrink-0 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={followUp}
                onChange={e => setFollowUp(e.target.value)}
                placeholder={
                  isCompleted ? 'Ask for changes…' :
                  isRunning ? 'Working on it…' :
                  taskStatus === 'failed' ? 'Task failed' : 'Waiting…'
                }
                disabled={!isCompleted || followUpSubmitting}
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent disabled:opacity-50 font-medium"
                onKeyDown={e => { if (e.key === 'Enter') handleFollowUp(); }}
              />
              <button
                type="button"
                onClick={handleFollowUp}
                disabled={!isCompleted || !followUp.trim() || followUpSubmitting}
                className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
              >
                {followUpSubmitting
                  ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <span className="text-sm">→</span>
                }
              </button>
            </div>
            {followUpError && <p className="text-[11px] text-red-500">{followUpError}</p>}
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              <span>⏱ {elapsed((task as any).startedAt, (task as any).completedAt)}</span>
              <span>·</span>
              <span>{formatDate((task as any).createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Panel 3: Code / Preview */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-900">
          {/* Tab bar */}
          <div className="flex items-center gap-0 bg-slate-800 border-b border-slate-700 flex-shrink-0 px-3">
            {(['code', 'preview'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setRightTab(tab)}
                className={cn(
                  'px-4 py-2.5 text-xs font-semibold capitalize transition-colors border-b-2',
                  rightTab === tab
                    ? 'text-white border-indigo-400'
                    : 'text-slate-500 border-transparent hover:text-slate-300'
                )}
              >
                {tab === 'code' ? '◻ Code' : '◪ Preview'}
              </button>
            ))}
            {selectedFile && rightTab === 'code' && (
              <span className="ml-3 text-[10px] text-slate-600 font-mono truncate">
                {selectedFile.path}
              </span>
            )}
          </div>

          {/* Panel content */}
          {rightTab === 'code' ? (
            <CodeViewer file={selectedFile} />
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              <PreviewContent task={task} previewUrl={previewUrl} streamFiles={streamFiles} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
