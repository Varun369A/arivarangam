'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { reposApi, getApiError } from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx',
    css: 'css', scss: 'scss', html: 'html', json: 'json', md: 'markdown',
    py: 'python', sh: 'bash', bash: 'bash', zsh: 'bash', env: 'env',
    yml: 'yaml', yaml: 'yaml', prisma: 'prisma', sql: 'sql',
    toml: 'toml', rs: 'rust', go: 'go', rb: 'ruby', php: 'php',
    txt: 'text',
  };
  return map[ext] ?? 'text';
}

// Very lightweight syntax colouring via regex token classes
function tokeniseLine(line: string, lang: string): React.ReactNode[] {
  // We keep this simple: keywords, strings, comments, numbers
  const keywordSets: Record<string, string[]> = {
    typescript: ['const', 'let', 'var', 'function', 'return', 'import', 'export', 'default', 'from', 'interface', 'type', 'class', 'extends', 'implements', 'new', 'if', 'else', 'for', 'while', 'async', 'await', 'try', 'catch', 'throw', 'null', 'undefined', 'true', 'false'],
    tsx: ['const', 'let', 'var', 'function', 'return', 'import', 'export', 'default', 'from', 'interface', 'type', 'class', 'extends', 'implements', 'new', 'if', 'else', 'for', 'while', 'async', 'await', 'true', 'false'],
    javascript: ['const', 'let', 'var', 'function', 'return', 'import', 'export', 'default', 'from', 'class', 'new', 'if', 'else', 'for', 'while', 'async', 'await', 'null', 'undefined', 'true', 'false'],
    python: ['def', 'class', 'import', 'from', 'return', 'if', 'else', 'elif', 'for', 'while', 'try', 'except', 'with', 'as', 'True', 'False', 'None', 'lambda', 'pass', 'in', 'is', 'not', 'and', 'or'],
    css: ['@import', '@media', '@keyframes', 'from', 'to'],
    json: [],
    yaml: [],
    text: [],
  };

  const keywords = keywordSets[lang] ?? keywordSets.typescript;

  // Use simple string parsing to produce spans
  const tokens: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  // Comment detection
  if (/^\s*(\/\/|#|--\s)/.test(line)) {
    return [<span key={0} className="text-slate-400 italic">{line}</span>];
  }

  // String detection (rough)
  const strMatch = remaining.match(/^(.*?)(".*?"|'.*?'|`[^`]*`)(.*)$/);
  if (strMatch) {
    const [, before, str, after] = strMatch;
    if (before) tokens.push(<span key={key++}>{before}</span>);
    tokens.push(<span key={key++} className="text-emerald-600">{str}</span>);
    if (after) tokens.push(<span key={key++}>{after}</span>);
    return tokens;
  }

  // Number detection
  const numMatch = remaining.match(/^(.*?)(\b\d+\.?\d*\b)(.*)$/);
  if (numMatch) {
    const [, before, num, after] = numMatch;
    if (before) tokens.push(<span key={key++}>{before}</span>);
    tokens.push(<span key={key++} className="text-orange-500">{num}</span>);
    if (after) tokens.push(<span key={key++}>{after}</span>);
    return tokens;
  }

  // Keyword detection
  const wordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`);
  const kwMatch = remaining.match(new RegExp(`^(.*?)(${keywords.join('|')})(\\W.*)$`));
  if (kwMatch && keywords.length > 0) {
    const [, before, kw, after] = kwMatch;
    if (before) tokens.push(<span key={key++}>{before}</span>);
    tokens.push(<span key={key++} className="text-indigo-600 font-medium">{kw}</span>);
    if (after) tokens.push(<span key={key++}>{after}</span>);
    return tokens;
  }

  return [<span key={0}>{line}</span>];
}

function SyntaxHighlighter({ content, language }: { content: string; language: string }) {
  const lines = content.split('\n');
  return (
    <pre className="text-xs font-mono leading-relaxed text-slate-700 p-0 m-0">
      {lines.map((line, i) => (
        <div key={i} className="flex hover:bg-indigo-50/40 group">
          <span className="select-none text-slate-300 text-right pr-4 pl-3 py-0.5 min-w-[2.5rem] flex-shrink-0 group-hover:text-slate-400 transition-colors">
            {i + 1}
          </span>
          <span className="flex-1 pr-4 py-0.5 break-all whitespace-pre-wrap">
            {tokeniseLine(line, language)}
          </span>
        </div>
      ))}
    </pre>
  );
}

// ─── File tree (re-using same logic as task page) ────────────────────────────

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

interface RepoFile {
  path: string;
  content: string;
}

function buildTree(files: RepoFile[]): TreeNode[] {
  const root: TreeNode[] = [];
  const dirs = new Map<string, TreeNode>();

  const getOrCreateDir = (parts: string[], index: number): TreeNode[] => {
    if (index === 0) return root;
    const dirPath = parts.slice(0, index).join('/');
    if (!dirs.has(dirPath)) {
      const node: TreeNode = { name: parts[index - 1], path: dirPath, isDir: true, children: [] };
      dirs.set(dirPath, node);
      getOrCreateDir(parts, index - 1).push(node);
    }
    return dirs.get(dirPath)!.children;
  };

  for (const file of files) {
    const parts = file.path.replace(/^\//, '').split('/');
    const parent = getOrCreateDir(parts, parts.length - 1);
    parent.push({ name: parts[parts.length - 1], path: file.path, isDir: false, children: [] });
  }

  return root;
}

function FileTreeNode({
  node,
  depth,
  onSelect,
  selectedPath,
}: {
  node: TreeNode;
  depth: number;
  onSelect: (path: string) => void;
  selectedPath: string | null;
}) {
  const [open, setOpen] = useState(true);

  if (node.isDir) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 w-full text-left py-1 hover:bg-slate-50 rounded text-xs text-slate-500 font-medium"
          style={{ paddingLeft: 8 + depth * 14 }}
        >
          <span className="text-slate-400 w-3">{open ? '▾' : '▸'}</span>
          <span>📁</span>
          <span className="truncate">{node.name}/</span>
        </button>
        {open && node.children.map(child => (
          <FileTreeNode
            key={child.path}
            node={child}
            depth={depth + 1}
            onSelect={onSelect}
            selectedPath={selectedPath}
          />
        ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(node.path)}
      className={cn(
        'flex items-center gap-1.5 w-full text-left py-1 rounded text-xs transition-colors',
        selectedPath === node.path
          ? 'bg-indigo-50 text-indigo-700 font-medium'
          : 'text-slate-600 hover:bg-slate-50',
      )}
      style={{ paddingLeft: 8 + depth * 14 }}
    >
      <span>📄</span>
      <span className="truncate">{node.name}</span>
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RepoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const repoId = params.id;

  const [repo, setRepo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [activeVersion, setActiveVersion] = useState<number | null>(null);

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Rename/metadata editing
  const [editingMeta, setEditingMeta] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);

  const startWithEdit = searchParams.get('edit') === '1';

  // Load repo
  useEffect(() => {
    setLoading(true);
    reposApi.get(repoId)
      .then(r => {
        setRepo(r);
        setActiveVersion((r as any).currentVersion ?? 1);
        // Select first file if any
        const files = (r as any).files ?? [];
        if (files.length > 0 && !selectedPath) {
          setSelectedPath(files[0].path);
        }
        setEditName((r as any).name ?? '');
        setEditDesc((r as any).description ?? '');
        if (startWithEdit) {
          setEditingMeta(true);
        }
      })
      .catch(() => setLoadError('Repo not found or access denied'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repoId]);

  // Get files for active version
  const currentFiles: RepoFile[] = (() => {
    if (!repo) return [];
    const versions = (repo.versions ?? []) as any[];
    const versionObj = versions.find((v: any) => v.version === activeVersion);
    if (versionObj) return versionObj.files ?? [];
    return repo.files ?? [];
  })();

  const selectedFile = currentFiles.find(f => f.path === selectedPath) ?? null;
  const selectedLanguage = selectedPath ? getLanguage(selectedPath) : 'text';
  const tree = buildTree(currentFiles);

  const handleSelectFile = useCallback((path: string) => {
    setSelectedPath(path);
    setEditMode(false);
    setEditContent('');
    setSaveError(null);
  }, []);

  const handleStartEdit = () => {
    if (!selectedFile) return;
    setEditContent(selectedFile.content ?? '');
    setEditMode(true);
    setSaveError(null);
  };

  const handleSaveEdit = async () => {
    if (!repo || !selectedPath) return;
    setSaving(true);
    setSaveError(null);

    // Update the files array locally
    const updatedFiles: RepoFile[] = currentFiles.map(f =>
      f.path === selectedPath ? { ...f, content: editContent } : f,
    );

    try {
      // Save as new version via the /save endpoint
      const result = await reposApi.saveVersion(repoId, `Updated ${selectedPath}`);
      // Patch the local state optimistically
      const newVersion = (result as any).versionId ?? ((repo.currentVersion ?? 1) + 1);
      const newVersionEntry = {
        version: typeof newVersion === 'number' ? newVersion : (repo.currentVersion ?? 1) + 1,
        files: updatedFiles,
        savedAt: new Date().toISOString(),
        message: `Updated ${selectedPath}`,
      };
      setRepo((prev: any) => ({
        ...prev,
        files: updatedFiles,
        currentVersion: newVersionEntry.version,
        versions: [...(prev.versions ?? []), newVersionEntry],
      }));
      setActiveVersion(newVersionEntry.version);
      setEditMode(false);
    } catch (err) {
      setSaveError(getApiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMeta = async () => {
    if (!repo) return;
    setSavingMeta(true);
    try {
      const updated = await reposApi.update(repoId, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
      });
      setRepo((prev: any) => ({ ...prev, ...(updated as any) }));
      setEditingMeta(false);
    } catch {
      // ignore
    } finally {
      setSavingMeta(false);
    }
  };

  const handleOpenInBuilder = () => {
    router.push(`/dashboard?repoId=${repoId}`);
  };

  const allVersions = (repo?.versions ?? []) as any[];

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading repo...</p>
        </div>
      </div>
    );
  }

  if (loadError || !repo) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-slate-800 font-medium">{loadError ?? 'Repo not found'}</p>
          <Link href="/repos" className="btn-primary">← Back to Repos</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-surface">
      {/* Header */}
      <div className="bg-white border-b border-surface-border px-4 sm:px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <Link
          href="/repos"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Repos
        </Link>

        <span className="text-slate-200">/</span>

        {editingMeta ? (
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="input py-1 text-sm font-semibold max-w-xs"
              placeholder="Repo name"
            />
            <input
              type="text"
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              className="input py-1 text-sm text-slate-500 max-w-sm"
              placeholder="Description (optional)"
            />
            <button
              type="button"
              onClick={handleSaveMeta}
              disabled={savingMeta || !editName.trim()}
              className="btn-primary text-xs py-1.5 px-3"
            >
              {savingMeta ? '...' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => { setEditingMeta(false); setEditName(repo.name); setEditDesc(repo.description ?? ''); }}
              className="btn-secondary text-xs py-1.5 px-3"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="font-semibold text-slate-900 text-base truncate">{repo.name}</h1>
              {repo.description && (
                <span className="text-sm text-slate-400 truncate hidden sm:block">{repo.description}</span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleOpenInBuilder}
            className="btn-secondary text-xs py-1.5 px-3 hidden sm:inline-flex"
          >
            Open in Builder
          </button>
          <button
            type="button"
            onClick={() => setEditingMeta(e => !e)}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            Edit
          </button>
          <a
            href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(currentFiles, null, 2))}`}
            download={`${repo.name}-files.json`}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            Download
          </a>
        </div>
      </div>

      {/* Main Two-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left — File Tree */}
        <div className="w-56 flex-shrink-0 border-r border-surface-border bg-white flex flex-col overflow-hidden">
          <div className="px-3 pt-3 pb-2 border-b border-surface-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Files</p>
              <span className="text-xs text-slate-400">{currentFiles.length}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-1">
            {currentFiles.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 px-3">
                <div className="text-2xl mb-2">📂</div>
                No files in this repo
              </div>
            ) : (
              <>
                {tree.map(node => (
                  <FileTreeNode
                    key={node.path}
                    node={node}
                    depth={0}
                    onSelect={handleSelectFile}
                    selectedPath={selectedPath}
                  />
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right — Content Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {selectedFile ? (
            <>
              {/* File header */}
              <div className="px-4 sm:px-6 py-3 border-b border-surface-border flex items-center justify-between gap-3 flex-shrink-0 bg-slate-50">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">📄</span>
                  <code className="text-sm font-mono font-medium text-slate-700 truncate">
                    {selectedFile.path}
                  </code>
                  <span className="badge bg-slate-100 text-slate-500 text-xs hidden sm:inline-flex">
                    {selectedLanguage}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {editMode ? (
                    <>
                      <button
                        type="button"
                        onClick={() => { setEditMode(false); setSaveError(null); }}
                        className="btn-secondary text-xs py-1.5 px-3"
                        disabled={saving}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={saving}
                        className="btn-primary text-xs py-1.5 px-3"
                      >
                        {saving ? (
                          <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : '💾 Save version'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartEdit}
                      className="btn-secondary text-xs py-1.5 px-3 text-indigo-600"
                    >
                      Edit this file
                    </button>
                  )}
                </div>
              </div>

              {saveError && (
                <div className="px-6 py-2 bg-red-50 border-b border-red-100 text-xs text-red-600">
                  {saveError}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 overflow-auto">
                {editMode ? (
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    className="w-full h-full p-4 font-mono text-xs text-slate-700 resize-none border-0 outline-none focus:ring-0 bg-white leading-relaxed"
                    spellCheck={false}
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                ) : (
                  <SyntaxHighlighter
                    content={selectedFile.content || ''}
                    language={selectedLanguage}
                  />
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400 p-8">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-3xl">
                📄
              </div>
              <p className="font-medium text-slate-600">Select a file to view its contents</p>
              {currentFiles.length === 0 && (
                <p className="text-sm text-center max-w-xs">
                  This repo has no files yet. You can save a version after completing a task.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar — Versions */}
      <div className="bg-white border-t border-surface-border px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-xs font-medium text-slate-500 flex-shrink-0">Versions:</span>
          {allVersions.length === 0 ? (
            <span className="text-xs text-slate-400">No versions saved yet</span>
          ) : (
            allVersions.map((v: any) => (
              <button
                key={v.version}
                type="button"
                onClick={() => { setActiveVersion(v.version); setSelectedPath(null); setEditMode(false); }}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                  activeVersion === v.version
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
                title={`${v.message ?? ''} — ${v.savedAt ? formatDate(v.savedAt) : ''}`}
              >
                v{v.version}
                {v.version === repo.currentVersion && (
                  <span className="ml-1 text-xs opacity-70">(current)</span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-slate-400 hidden sm:block">
            Updated {repo.updatedAt ? formatDate(repo.updatedAt) : '—'}
          </span>
          <button
            type="button"
            onClick={handleOpenInBuilder}
            className="btn-primary text-xs py-1.5 px-3 sm:hidden"
          >
            Open in Builder
          </button>
          <button
            type="button"
            onClick={handleOpenInBuilder}
            className="btn-primary text-xs py-1.5 px-3 hidden sm:inline-flex items-center gap-1.5"
          >
            <span>🔨</span> Open in Builder
          </button>
        </div>
      </div>
    </div>
  );
}
