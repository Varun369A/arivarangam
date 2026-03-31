'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { useTaskStream, type TaskEvent, type TaskStreamFile } from '@/hooks/useTaskStream';
import { tasksApi, reposApi, deployApi, getApiError, type Task } from '@/lib/api';
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

// ─── Build live HTML blob URL from project files ──────────────────────────────

function buildHtmlPreview(files: TaskStreamFile[]): string | null {
  // Find HTML entry file
  const htmlFile = files.find(f => f.path === 'index.html' || f.path.endsWith('/index.html'));
  if (!htmlFile?.content) return null;

  // Build a quick lookup map: basename → content
  const fileMap = new Map<string, string>();
  for (const f of files) {
    if (!f.content) continue;
    // Store by full path and by basename
    fileMap.set(f.path, f.content);
    const basename = f.path.split('/').pop() ?? f.path;
    fileMap.set(basename, f.content);
  }

  let html = htmlFile.content;

  // ── Inline all local CSS <link> tags ────────────────────────────────────────
  html = html.replace(/<link([^>]+)rel=["']stylesheet["']([^>]*)>/gi, (tag, before, after) => {
    const hrefMatch = tag.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) return tag;
    const href = hrefMatch[1];
    // Skip CDN URLs
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//')) return tag;
    const basename = href.replace(/^\.\//, '').split('/').pop() ?? href;
    const content = fileMap.get(href) ?? fileMap.get(basename);
    return content ? `<style>${content}</style>` : tag;
  });

  // ── Inline all local JS <script src="..."> tags ──────────────────────────────
  html = html.replace(/<script([^>]+)src=["']([^"']+)["']([^>]*)><\/script>/gi, (tag, before, src, after) => {
    // Skip CDN URLs
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) return tag;
    // Skip node_modules
    if (src.includes('node_modules')) return tag;
    const basename = src.replace(/^\.\//, '').split('/').pop() ?? src;
    const content = fileMap.get(src) ?? fileMap.get(basename);
    if (!content) return tag;
    // Preserve type="text/babel" if present (for React/JSX components)
    const typeMatch = (before + after).match(/type=["']([^"']+)["']/i);
    const typeAttr = typeMatch ? ` type="${typeMatch[1]}"` : '';
    return `<script${typeAttr}>\n${content}\n</script>`;
  });

  const blob = new Blob([html], { type: 'text/html' });
  return URL.createObjectURL(blob);
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
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  // Build blob preview when files are ready
  useEffect(() => {
    if (streamFiles.length === 0) return;
    const url = buildHtmlPreview(streamFiles);
    if (url) {
      setBlobUrl(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setIframeKey(k => k + 1);
    }
    return () => { if (url) URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamFiles.length]);

  const activeUrl = previewUrl ?? (task?.deployUrl) ?? null;

  if (activeUrl) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 border-b border-slate-200 flex-shrink-0">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-white rounded-lg px-3 py-1 text-xs text-slate-500 font-mono truncate border border-slate-200">
            {activeUrl}
          </div>
          <a href={activeUrl} target="_blank" rel="noreferrer"
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium shrink-0">
            Open ↗
          </a>
        </div>
        <iframe src={activeUrl} className="flex-1 w-full border-0" title="Live Preview" />
      </div>
    );
  }

  // Live local HTML preview via blob URL
  if (blobUrl) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700 flex-shrink-0">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 bg-slate-700 rounded-lg px-3 py-1 text-xs text-slate-400 font-mono truncate">
            🔴 Live preview (local)
          </div>
          <button
            type="button"
            onClick={() => setIframeKey(k => k + 1)}
            className="text-xs text-slate-400 hover:text-white transition-colors px-2"
            title="Refresh preview"
          >
            ↺
          </button>
        </div>
        <iframe key={iframeKey} src={blobUrl} className="flex-1 w-full border-0 bg-white" title="Live Preview" />
      </div>
    );
  }

  const imageFile = streamFiles.find(f => ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(fileExt(f.path)));
  const imageUrl = (task?.metadata as any)?.imageUrl ?? task?.previewUrl ?? imageFile?.content ?? null;
  if (task?.category === 'image' && imageUrl) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-100 p-8 gap-4">
        <img src={imageUrl} alt="Generated" className="max-w-full max-h-[60vh] rounded-xl shadow-lg" />
        <div className="flex gap-3">
          <a
            href={imageUrl}
            download="generated-image.png"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            ↓ Download Image
          </a>
          <a
            href={imageUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
          >
            ↗ Open full size
          </a>
        </div>
      </div>
    );
  }

  // Research / Content export
  if (['research', 'content'].includes(task?.category ?? '') && streamFiles.length > 0) {
    const mainFile = streamFiles.find(f => f.path.endsWith('.md') || f.path.endsWith('report.md') || f.path.endsWith('content.md')) ?? streamFiles[0];
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-4 flex items-center justify-between">
            <div>
              <div className="text-2xl mb-1">{task?.category === 'research' ? '📄' : '✍️'}</div>
              <p className="text-sm font-bold text-slate-800">{task?.category === 'research' ? 'Research Report' : 'Content'} ready</p>
              <p className="text-xs text-slate-500 mt-0.5">{streamFiles.length} file{streamFiles.length !== 1 ? 's' : ''} generated</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const content = streamFiles.map(f => `# ${f.path}\n\n${f.content ?? ''}`).join('\n\n---\n\n');
                  const blob = new Blob([content], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `${task?.category}-report.md`; a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                ↓ Download .md
              </button>
              <button
                type="button"
                onClick={() => {
                  const content = streamFiles.map(f => `${f.path}\n${'─'.repeat(40)}\n${f.content ?? ''}`).join('\n\n');
                  const blob = new Blob([content], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = `${task?.category}-report.txt`; a.click();
                  URL.revokeObjectURL(url);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition-colors"
              >
                ↓ Download .txt
              </button>
            </div>
          </div>
          {mainFile && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">{mainFile.content}</pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Presentation preview — look for Reveal.js index.html
  if (task?.category === 'presentation' && streamFiles.length > 0) {
    const htmlF = streamFiles.find(f => f.path === 'index.html');
    if (htmlF?.content) {
      const blob = new Blob([htmlF.content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      return (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700 flex-shrink-0">
            <span className="text-xs text-slate-400">🎯 Presentation preview</span>
            <a href={url} target="_blank" rel="noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 ml-auto">
              Open fullscreen ↗
            </a>
          </div>
          <iframe src={url} className="flex-1 w-full border-0 bg-white" title="Presentation" />
        </div>
      );
    }
  }

  // Mobile preview — show QR link to Expo Snack
  if (task?.category === 'mobile' && streamFiles.length > 0) {
    const appFile = streamFiles.find(f => f.path === 'App.tsx' || f.path === 'App.js');
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-5">
        <div className="text-5xl">📱</div>
        <div className="text-center space-y-2">
          <p className="text-sm font-bold text-slate-700">React Native / Expo App</p>
          <p className="text-xs text-slate-500">Preview on your phone with Expo Go, or open in Expo Snack</p>
        </div>
        {appFile && (
          <a
            href={`https://snack.expo.dev/?code=${encodeURIComponent(appFile.content ?? '')}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
          >
            Open in Expo Snack ↗
          </a>
        )}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-1.5 max-w-sm w-full">
          <p className="font-semibold text-slate-700">To run locally:</p>
          <code className="block bg-slate-800 text-green-400 px-3 py-2 rounded-lg font-mono">npm install -g expo-cli</code>
          <code className="block bg-slate-800 text-green-400 px-3 py-2 rounded-lg font-mono">npx expo start</code>
          <p className="text-slate-400">Scan the QR code with Expo Go on your phone</p>
        </div>
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
              {streamFiles.length} file{streamFiles.length !== 1 ? 's' : ''} generated. Select a file on the left to view its code.
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
  pending: 'text-slate-700', queued: 'text-slate-700', analyzing: 'text-purple-600',
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
  const [showDeployMenu, setShowDeployMenu] = useState(false);
  const [deploying, setDeploying] = useState<string | null>(null); // 'vercel' | 'github' | 'railway' | 'cloudflare'
  const [deployResult, setDeployResult] = useState<{ url: string; label: string } | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

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

  // Reload on complete + auto-save to repo
  const autoSavedRef = useRef(false);
  useEffect(() => {
    if (!isComplete || !taskId) return;
    tasksApi.get(taskId)
      .then(t => {
        const obj = (t as any)?.data?.task ?? (t as any);
        setTask(obj);
        // Auto-save to repos (once per task completion)
        if (!autoSavedRef.current && obj?.status === 'completed' && !obj?.repoId) {
          autoSavedRef.current = true;
          const repoName = (obj.prompt ?? 'Project')
            .split('\n')[0].slice(0, 60).trim() || 'Project';
          reposApi.create({ name: repoName, taskId: obj.id, isPublic: false })
            .then(r => setSavedRepo({ id: (r as any).id ?? (r as any).data?.repo?.id, name: repoName }))
            .catch(() => {});
        }
      })
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
      const repo = await reposApi.create({ name: repoName, isPublic: false, taskId: task.id });
      setSavedRepo({ id: (repo as any).id, name: (repo as any).name });
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

  const handleDeploy = useCallback(async (target: string) => {
    if (!task) return;
    setDeploying(target);
    setDeployError(null);
    setShowDeployMenu(false);
    try {
      let result: { url: string; label: string };
      if (target === 'vercel') {
        const r = await deployApi.vercel(task.id);
        result = { url: r.deployUrl, label: 'Vercel' };
      } else if (target === 'github') {
        const r = await deployApi.github(task.id);
        result = { url: r.repoUrl, label: 'GitHub' };
      } else if (target === 'railway') {
        const r = await deployApi.railway(task.id);
        result = { url: r.railwayUrl, label: 'Railway' };
      } else if (target === 'cloudflare') {
        const r = await deployApi.cloudflare(task.id);
        result = { url: r.workerUrl, label: 'Cloudflare' };
      } else {
        return;
      }
      setDeployResult(result);
      setTask(prev => prev ? { ...prev, deployUrl: result.url } as any : prev);
    } catch (err) {
      const msg = getApiError(err);
      if (msg.includes('token not found') || msg.includes('NO_VERCEL_TOKEN') || msg.includes('NO_GITHUB_TOKEN')) {
        const key = target === 'vercel' ? 'VERCEL_TOKEN' : target === 'github' ? 'GITHUB_TOKEN' : null;
        if (key && typeof window !== 'undefined') {
          window.location.href = `/settings/profile?addKey=${key}`;
          return;
        }
      }
      setDeployError(msg);
    } finally {
      setDeploying(null);
    }
  }, [task]);

  const handlePublishToGallery = useCallback(async () => {
    if (!task) return;
    setPublishing(true);
    try {
      // POST to gallery publish endpoint (auth via cookie interceptor)
      const res = await fetch(`/api/v1/gallery/${task.id}/publish`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(typeof document !== 'undefined' && document.cookie.includes('accessToken')
            ? { Authorization: `Bearer ${document.cookie.match(/accessToken=([^;]+)/)?.[1] ?? ''}` }
            : {}),
        },
      });
      if (res.ok) setIsPublished(true);
    } catch { /* ignore */ }
    finally { setPublishing(false); }
  }, [task]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-700">Loading project…</p>
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
    <div className="h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden" style={{ fontFamily: 'var(--font-inter)', background: 'linear-gradient(135deg, #EEF2FF 0%, #F5F0FF 100%)' }}>

      {/* Deploy error banner */}
      {deployError && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm bg-red-50 border border-red-200 rounded-xl shadow-lg p-4 flex items-start gap-3">
          <span className="text-red-500 mt-0.5">✗</span>
          <div className="flex-1">
            <p className="text-xs font-bold text-red-800">Deploy failed</p>
            <p className="text-xs text-red-600 mt-0.5">{deployError}</p>
            <a href="/settings" className="text-xs text-indigo-600 underline mt-1 block">Add API keys in Settings →</a>
          </div>
          <button type="button" onClick={() => setDeployError(null)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
        </div>
      )}

      {/* Delete confirm dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full border border-[#E0E7FF]">
            <h3 className="text-base font-bold text-[#1E1B4B] mb-2">Delete task?</h3>
            <p className="text-sm text-slate-600 mb-5">This will permanently delete the task and all generated files. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 btn-secondary py-2">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Header ─── */}
      <header className="bg-white border-b border-[#E0E7FF] px-5 py-3.5 flex items-center gap-4 flex-shrink-0" style={{ boxShadow: '0 1px 8px rgba(79,70,229,0.06)' }}>
        <Link href="/task" className="text-slate-600 hover:text-[#4F46E5] transition-colors p-1.5 rounded-lg hover:bg-[#EEF2FF] flex-shrink-0" aria-label="Back">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#1E1B4B] truncate">{taskTitle}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-semibold text-indigo-600 capitalize bg-[#EEF2FF] px-1.5 py-0.5 rounded-md">{task?.category}</span>
            <span className="text-slate-300">·</span>
            <div className={cn('flex items-center gap-1 text-[11px] font-bold', STATUS_COLOR[taskStatus])}>
              <span className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[taskStatus])} />
              {STATUS_TEXT[taskStatus] ?? taskStatus}
            </div>
            {isConnected && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-[11px] text-blue-600 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />Live
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isRunning && (
            <button onClick={handleCancelTask} disabled={cancelling}
              className="px-3 py-1.5 text-xs font-bold border border-red-200 text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50">
              {cancelling ? '…' : 'Stop'}
            </button>
          )}
          {isCompleted && streamFiles.length > 0 && (
            <>
              <div className="relative">
                <button onClick={() => setShowDeployMenu(m => !m)} disabled={!!deploying}
                  className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-60">
                  {deploying ? (
                    <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Deploying…</>
                  ) : <>🚀 Deploy</>}
                </button>
                {showDeployMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDeployMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-lg border border-[#E0E7FF] z-50 overflow-hidden">
                      {[
                        { id: 'vercel', label: '▲ Vercel', desc: 'Web apps (free tier)' },
                        { id: 'github', label: '🐙 GitHub', desc: 'Push to repo' },
                        { id: 'railway', label: '🚂 Railway', desc: 'Node/Python backend' },
                        { id: 'cloudflare', label: '🌐 Cloudflare', desc: 'Edge Workers' },
                      ].map(opt => (
                        <button key={opt.id} type="button" onClick={() => handleDeploy(opt.id)}
                          className="w-full flex flex-col px-4 py-3 hover:bg-[#F5F0FF] transition-colors text-left border-b border-[#F0EDFF] last:border-0">
                          <span className="text-xs font-bold text-[#1E1B4B]">{opt.label}</span>
                          <span className="text-[10px] text-slate-600">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {deployResult && (
                <a href={deployResult.url} target="_blank" rel="noreferrer"
                  className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-1">
                  ✓ {deployResult.label} ↗
                </a>
              )}
            </>
          )}
          {isCodeTask && isCompleted && !savedRepo && streamFiles.length > 0 && (
            <button onClick={handleSaveRepo}
              className="px-3 py-1.5 text-xs font-bold bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#E0E7FF] rounded-xl transition-colors border border-[#C7D2FE]">
              💾 Save
            </button>
          )}
          {savedRepo && (
            <Link href={`/repos/${savedRepo.id}`}
              className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl border border-emerald-200">
              ✓ Saved
            </Link>
          )}
          {isCompleted && !isPublished && (
            <button onClick={handlePublishToGallery} disabled={publishing}
              className="px-3 py-1.5 text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl transition-colors border border-violet-200 disabled:opacity-50">
              {publishing ? '…' : '🌐 Publish'}
            </button>
          )}
          {isPublished && (
            <Link href="/gallery" className="px-3 py-1.5 text-xs font-bold text-violet-700 bg-violet-50 rounded-xl border border-violet-200">
              ✓ In Gallery
            </Link>
          )}
          {streamFiles.length > 0 && (
            <button onClick={handleDownload}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-[#F5F0FF] rounded-xl transition-colors border border-[#E0E7FF]">
              ↓ Export
            </button>
          )}
          <button onClick={() => setShowDeleteConfirm(true)}
            className="p-1.5 text-slate-600 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete task">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* ─── 2-Panel Main Area ─── */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT: Activity / Chat Panel (420px) ── */}
        <div className="w-[420px] flex-shrink-0 bg-white border-r border-[#E0E7FF] flex flex-col overflow-hidden">

          {/* Task prompt card */}
          <div className="px-5 py-4 border-b border-[#E0E7FF] flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F8F7FF, #EEF2FF)' }}>
            <div className="flex items-start justify-between gap-2 mb-2">
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Task Prompt</p>
              {(task as any).creditsActuallyUsed != null && (
                <span className="text-[10px] bg-white text-indigo-600 border border-[#C7D2FE] rounded-full px-2 py-0.5 font-bold flex-shrink-0 shadow-sm">
                  {(task as any).creditsActuallyUsed} cr used
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-[#1E1B4B] leading-relaxed line-clamp-4">{(task as any)?.prompt ?? taskTitle}</p>
            <div className="flex items-center gap-3 mt-3 text-xs text-slate-600 font-medium">
              <span>⏱ {elapsed((task as any).startedAt, (task as any).completedAt)}</span>
              <span className="text-slate-300">·</span>
              <span>{formatDate((task as any).createdAt)}</span>
              {streamFiles.length > 0 && (
                <>
                  <span className="text-slate-300">·</span>
                  <span className="text-indigo-600 font-bold">{streamFiles.length} files</span>
                </>
              )}
            </div>
          </div>

          {/* Activity feed */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
            {events.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-16 text-slate-600">
                <div className="w-9 h-9 rounded-full animate-spin" style={{ border: '3px solid #E0E7FF', borderTopColor: '#818cf8' }} />
                <p className="text-sm font-semibold">Connecting to task…</p>
              </div>
            )}
            {events.map((evt, i) => (
              <ActivityItem key={i} event={evt} />
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Follow-up input */}
          <div className="border-t border-[#E0E7FF] p-4 flex-shrink-0" style={{ background: '#FAFAFE' }}>
            {isCompleted && (
              <div className="flex gap-1.5 flex-wrap mb-3">
                {[
                  { label: '🔧 Fix errors', prompt: 'Fix all errors, bugs, and issues in the code. Make sure everything works correctly.' },
                  { label: '📱 Responsive', prompt: 'Make the UI fully responsive for mobile, tablet, and desktop screens.' },
                  { label: '🎨 Improve UI', prompt: 'Improve the visual design — make it more polished, modern, and professional.' },
                  { label: '📝 Add docs', prompt: 'Add clear comments and documentation to all code files.' },
                ].map(q => (
                  <button key={q.label} type="button" onClick={() => setFollowUp(q.prompt)}
                    className="px-2.5 py-1 text-xs font-semibold bg-white border border-[#E0E7FF] text-slate-700 rounded-lg hover:bg-[#EEF2FF] hover:border-[#C7D2FE] hover:text-[#4F46E5] transition-colors">
                    {q.label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" value={followUp} onChange={e => setFollowUp(e.target.value)}
                placeholder={
                  isCompleted ? 'Ask for changes or paste an error…' :
                  isRunning ? 'AI is working…' :
                  taskStatus === 'failed' ? 'Task failed — ask for fix' : 'Waiting…'
                }
                disabled={!isCompleted || followUpSubmitting}
                className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-[#DDD6FE] bg-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-[#4F46E5] disabled:opacity-50 font-medium text-[#1E1B4B]"
                onKeyDown={e => { if (e.key === 'Enter') handleFollowUp(); }}
              />
              <button type="button" onClick={handleFollowUp}
                disabled={!isCompleted || !followUp.trim() || followUpSubmitting}
                className="w-10 h-10 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-all flex-shrink-0 hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
                {followUpSubmitting
                  ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <span className="text-base font-bold">→</span>
                }
              </button>
            </div>
            {followUpError && <p className="text-xs text-red-500 mt-1.5 font-semibold">{followUpError}</p>}
          </div>
        </div>

        {/* ── RIGHT: Code + Preview Panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Tab bar */}
          <div className="h-12 bg-white border-b border-[#E0E7FF] flex items-center px-4 gap-1 flex-shrink-0" style={{ boxShadow: '0 1px 4px rgba(79,70,229,0.06)' }}>
            {(['code', 'preview'] as const).map(tab => (
              <button key={tab} type="button" onClick={() => setRightTab(tab)}
                className={cn(
                  'px-4 py-2 text-sm font-bold rounded-lg transition-all',
                  rightTab === tab
                    ? 'bg-[#EEF2FF] text-[#4F46E5] shadow-sm'
                    : 'text-slate-600 hover:text-[#4F46E5] hover:bg-[#F8F7FF]'
                )}>
                {tab === 'code' ? '◻ Code' : '◪ Preview'}
              </button>
            ))}
            {selectedFile && rightTab === 'code' && (
              <span className="ml-3 text-xs text-slate-600 font-mono bg-[#F5F0FF] border border-[#E0E7FF] px-2 py-1 rounded-lg truncate max-w-xs">
                {selectedFile.path}
              </span>
            )}
            {isRunning && (
              <div className="ml-auto flex gap-1.5 items-center">
                {[0, 150, 300].map(d => (
                  <span key={d} className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${d}ms` }} />
                ))}
              </div>
            )}
          </div>

          {/* Code tab: file tree + code viewer side by side */}
          {rightTab === 'code' && (
            <div className="flex-1 flex overflow-hidden">
              {/* File tree */}
              <div className="w-56 flex-shrink-0 bg-white border-r border-[#E0E7FF] flex flex-col overflow-hidden">
                <div className="px-3 pt-3 pb-2 border-b border-[#F0EDFF] flex items-center justify-between flex-shrink-0">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Files</span>
                  {streamFiles.length > 0 && (
                    <span className="text-[10px] bg-[#EEF2FF] text-indigo-600 rounded-full px-1.5 font-bold">{streamFiles.length}</span>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto py-1.5 px-1">
                  {streamFiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                      {isRunning ? (
                        <>
                          <div className="w-6 h-6 border-2 border-[#E0E7FF] border-t-indigo-400 rounded-full animate-spin mb-3" />
                          <p className="text-xs text-slate-600 font-semibold">Generating files…</p>
                        </>
                      ) : (
                        <>
                          <span className="text-2xl mb-2">📂</span>
                          <p className="text-xs text-slate-600 font-semibold">No files yet</p>
                        </>
                      )}
                    </div>
                  ) : (
                    treeNodes.map(node => (
                      <FileTreeNode key={node.path} node={node} depth={0}
                        selectedPath={selectedFilePath}
                        onSelect={(p) => { setSelectedFilePath(p); setRightTab('code'); }}
                      />
                    ))
                  )}
                </div>
              </div>
              {/* Code viewer */}
              <div className="flex-1 overflow-hidden bg-slate-900">
                <CodeViewer file={selectedFile} />
              </div>
            </div>
          )}

          {/* Preview tab */}
          {rightTab === 'preview' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              <PreviewContent task={task} previewUrl={previewUrl} streamFiles={streamFiles} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
