'use client'

import dynamic from 'next/dynamic'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useArenaStream } from '@/hooks/useArenaStream'
import { tasksApi, getApiError } from '@/lib/api'
import { CHARACTERS } from '@/lib/characters'
import JSZip from 'jszip'

// ─── Load Three.js scene client-side only (no SSR) ───────────────────────────
const ArenaCanvas = dynamic(
  () => import('@/components/arena/ArenaCanvas').then(m => m.ArenaCanvas),
  { ssr: false, loading: () => <div style={{ width: '100vw', height: '100vh', background: '#060610' }} /> }
)

// ─── Category auto-detect from user message ───────────────────────────────────
function detectCategory(text: string): string {
  const lower = text.toLowerCase()
  if (/\b(logo|brand identity|icon|svg)\b/.test(lower)) return 'logo'
  if (/\b(banner|ad|advertisement)\b/.test(lower)) return 'banner'
  if (/\b(brand|style guide|color palette)\b/.test(lower)) return 'brand'
  if (/\b(slide|presentation|deck|powerpoint)\b/.test(lower)) return 'presentation'
  if (/\b(animation|animate|motion|gsap|lottie)\b/.test(lower)) return 'animation'
  if (/\b(research|find out|investigate|what is|how does)\b/.test(lower)) return 'research'
  if (/\b(image|photo|generate image|picture|dall-e)\b/.test(lower)) return 'image'
  if (/\b(mobile app|react native|ios|android|expo)\b/.test(lower)) return 'mobile'
  if (/\b(chart|graph|dashboard|d3|visualization|dataviz)\b/.test(lower)) return 'dataviz'
  if (/\b(agent|bot|discord|telegram|slack bot)\b/.test(lower)) return 'bot'
  if (/\b(mcp|tool|api wrapper|connector)\b/.test(lower)) return 'mcp'
  if (/\b(landing page|website|web app|portfolio|saas|startup)\b/.test(lower)) return 'code'
  return 'code'
}

// ─── Chat Message Row ─────────────────────────────────────────────────────────
function ChatRow({ msg }: { msg: { type: string; text: string; character?: string } }) {
  if (msg.type === 'user') {
    return (
      <div className="flex justify-end mb-2">
        <div style={{
          background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
          color: 'white',
          borderRadius: '18px 18px 4px 18px',
          padding: '10px 16px',
          maxWidth: '78%',
          fontSize: 13,
          lineHeight: 1.5,
          fontWeight: 500,
          boxShadow: '0 2px 12px rgba(99,102,241,0.35)',
        }}>
          {msg.text}
        </div>
      </div>
    )
  }

  if (msg.type === 'file_done') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ color: '#34D399', fontSize: 11 }}>✓</span>
        <span style={{
          background: 'rgba(16,185,129,0.1)',
          border: '1px solid rgba(16,185,129,0.25)',
          borderRadius: 8,
          padding: '3px 10px',
          color: '#6EE7B7',
          fontSize: 11,
          fontFamily: 'monospace',
        }}>
          {msg.text}
        </span>
      </div>
    )
  }

  if (msg.type === 'completed') {
    return (
      <div style={{
        background: 'rgba(16,185,129,0.1)',
        border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: 12,
        padding: '10px 14px',
        marginBottom: 8,
        marginTop: 4,
      }}>
        <span style={{ color: '#34D399', fontSize: 13, fontWeight: 600 }}>✓ {msg.text}</span>
      </div>
    )
  }

  if (msg.type === 'error') {
    return (
      <div style={{
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.25)',
        borderRadius: 10,
        padding: '8px 12px',
        marginBottom: 6,
        color: '#FCA5A5',
        fontSize: 12,
      }}>
        ✗ {msg.text}
      </div>
    )
  }

  // ai_log
  const charColor = msg.character ? CHARACTERS[msg.character as keyof typeof CHARACTERS]?.color ?? '#94a3b8' : '#94a3b8'
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 5 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: charColor, marginTop: 6, flexShrink: 0 }} />
      <span style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{msg.text}</span>
    </div>
  )
}

// ─── Build Panel ──────────────────────────────────────────────────────────────
function BuildPanel({
  show,
  taskId,
  files,
  taskStatus,
  onClose,
}: {
  show: boolean
  taskId: string | null
  files: { path: string; content?: string; language?: string }[]
  taskStatus: string
  onClose: () => void
}) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const isCompleted = taskStatus === 'done'
  const apiPreviewUrl = taskId ? `/api/v1/preview/${taskId}` : null

  useEffect(() => {
    if (files.length > 0 && !selectedFile) setSelectedFile(files[0].path)
  }, [files.length, selectedFile])

  async function downloadAll() {
    if (!files.length) return
    const zip = new JSZip()
    for (const f of files) zip.file(f.path, f.content ?? '')
    const blob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `project-${taskId?.slice(0, 8) ?? 'files'}.zip`
    a.click()
    URL.revokeObjectURL(url)
  }

  const activeFile = files.find(f => f.path === selectedFile)

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: '48%',
      background: 'rgba(6, 6, 20, 0.96)',
      backdropFilter: 'blur(20px)',
      borderLeft: '1px solid rgba(99,102,241,0.2)',
      transform: show ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.45s cubic-bezier(0.32, 0, 0.67, 0)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
      boxShadow: '-4px 0 40px rgba(99,102,241,0.15)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '14px 18px',
        borderBottom: '1px solid rgba(99,102,241,0.15)',
        flexShrink: 0,
      }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#f1f5f9', fontSize: 13, fontWeight: 700 }}>
            {isCompleted ? '✓ Build Complete' : '⚙ Building…'}
          </p>
          <p style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>
            {files.length} file{files.length !== 1 ? 's' : ''} generated
          </p>
        </div>
        {isCompleted && (
          <button
            onClick={downloadAll}
            style={{
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              color: 'white',
              border: 'none',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ↓ Download ZIP
          </button>
        )}
        <button
          onClick={onClose}
          style={{ color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, padding: 4 }}
        >
          ✕
        </button>
      </div>

      {/* Tab: Preview / Code */}
      {isCompleted && apiPreviewUrl ? (
        // Preview iframe
        <iframe
          src={apiPreviewUrl}
          className="flex-1 w-full border-0"
          title="Project Preview"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          style={{ flex: 1 }}
        />
      ) : (
        // File viewer
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* File list */}
          <div style={{
            display: 'flex',
            gap: 2,
            padding: '8px 12px',
            overflowX: 'auto',
            flexShrink: 0,
            borderBottom: '1px solid rgba(99,102,241,0.1)',
          }}>
            {files.map(f => (
              <button
                key={f.path}
                onClick={() => setSelectedFile(f.path)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  fontSize: 11,
                  fontFamily: 'monospace',
                  background: selectedFile === f.path ? 'rgba(99,102,241,0.25)' : 'transparent',
                  color: selectedFile === f.path ? '#a5b4fc' : '#64748b',
                  border: selectedFile === f.path ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {f.path.split('/').pop()}
              </button>
            ))}
          </div>
          {/* Code */}
          <div style={{ flex: 1, overflow: 'auto', padding: '12px 16px' }}>
            {activeFile ? (
              <pre style={{
                color: '#a5b4fc',
                fontSize: 12,
                fontFamily: 'monospace',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                margin: 0,
              }}>
                {activeFile.content ?? ''}
              </pre>
            ) : (
              <div style={{ color: '#334155', fontSize: 13, padding: 20, textAlign: 'center' }}>
                Files will appear here as they're built…
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Arena Page ───────────────────────────────────────────────────────────────

export default function ArenaPage() {
  const router = useRouter()
  const { user, isLoading: authLoading, logout } = useAuth()

  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [inputError, setInputError] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    characterStates,
    chatMessages,
    taskStatus,
    files,
    previewAvailable,
    reconnectForFollowUp,
  } = useArenaStream(currentTaskId)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Show build panel when files appear
  useEffect(() => {
    if (files.length > 0) setShowPanel(true)
  }, [files.length])

  const isRunning  = taskStatus === 'running'
  const isDone     = taskStatus === 'done'

  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    if (!text || submitting) return
    if (isRunning) return

    setInputError(null)
    setSubmitting(true)

    try {
      if (isDone && currentTaskId) {
        // Follow-up on existing task
        await tasksApi.followUp(currentTaskId, text)
        setInputText('')
        setShowPanel(true)
        reconnectForFollowUp()
      } else {
        // New task
        const category = detectCategory(text)
        const res = await tasksApi.create({ prompt: text, category })
        const newTaskId = (res as any)?.data?.task?.id ?? (res as any)?.id
        if (!newTaskId) throw new Error('Task creation failed')
        setCurrentTaskId(newTaskId)
        setInputText('')
        setShowPanel(false)
      }
    } catch (err) {
      setInputError(getApiError(err))
    } finally {
      setSubmitting(false)
    }
  }, [inputText, submitting, isRunning, isDone, currentTaskId, reconnectForFollowUp])

  if (authLoading) {
    return (
      <div style={{
        width: '100vw', height: '100vh', background: '#060610',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 44, height: 44, border: '3px solid #1a1060',
          borderTopColor: '#6366f1', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#060610' }}>

      {/* ── Global animations style ── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInBubble { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGlow { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>

      {/* ── Full-screen 3D arena ── */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <ArenaCanvas characterStates={characterStates} />
      </div>

      {/* ── Top bar ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 22px',
        background: 'linear-gradient(to bottom, rgba(6,6,16,0.9), transparent)',
        zIndex: 20,
        pointerEvents: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'auto' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #D97706, #F59E0B)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 900, color: 'white',
            boxShadow: '0 0 16px rgba(217,119,6,0.5)',
          }}>A</div>
          <span style={{ color: '#f1f5f9', fontWeight: 700, fontSize: 15, letterSpacing: '-0.02em' }}>
            Arivarangam
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'auto' }}>
          {user && (
            <span style={{ color: '#64748b', fontSize: 12, fontWeight: 500 }}>
              {user.name?.split(' ')[0]}
            </span>
          )}
          {user && (
            <span style={{
              background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 20, padding: '3px 10px', color: '#a5b4fc', fontSize: 11, fontWeight: 700,
            }}>
              {(user as any).credits ?? 0} cr
            </span>
          )}
          <button
            onClick={logout}
            style={{
              color: '#475569', background: 'none', border: 'none',
              cursor: 'pointer', fontSize: 11, padding: '4px 8px',
              borderRadius: 8, transition: 'color 0.2s',
            }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* ── Chat panel (left side) ── */}
      <div style={{
        position: 'absolute', left: 20, top: '50%',
        transform: 'translateY(-50%)',
        width: 320,
        maxHeight: '55vh',
        display: 'flex', flexDirection: 'column',
        zIndex: 20,
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 14px',
          background: 'rgba(4,4,18,0.82)',
          backdropFilter: 'blur(16px)',
          borderRadius: 20,
          border: '1px solid rgba(99,102,241,0.18)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          maxHeight: '55vh',
        }}>
          {chatMessages.length === 0 ? (
            <div style={{ color: '#334155', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
              {currentTaskId ? 'Connecting…' : 'Tell Claude what to build'}
            </div>
          ) : (
            chatMessages.map(msg => <ChatRow key={msg.id} msg={msg} />)
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ── Input bar (bottom center) ── */}
      <div style={{
        position: 'absolute', bottom: 28, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: 680,
        padding: '0 20px',
        zIndex: 30,
        animation: 'slideUp 0.6s ease',
      }}>
        {inputError && (
          <div style={{
            color: '#FCA5A5', fontSize: 12, textAlign: 'center',
            marginBottom: 6, background: 'rgba(239,68,68,0.12)',
            borderRadius: 8, padding: '4px 12px',
          }}>
            {inputError}
          </div>
        )}

        <div style={{
          display: 'flex', gap: 10, alignItems: 'center',
          background: 'rgba(6, 6, 20, 0.94)',
          backdropFilter: 'blur(24px)',
          border: '1.5px solid rgba(99,102,241,0.35)',
          borderRadius: 24,
          padding: '10px 10px 10px 20px',
          boxShadow: '0 0 40px rgba(99,102,241,0.2), 0 8px 32px rgba(0,0,0,0.5)',
        }}>
          <input
            ref={inputRef}
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSend() }}
            placeholder={
              isRunning ? '⚙ Building your project…' :
              isDone ? 'Ask for changes or improvements…' :
              user ? `What would you like to build, ${user.name?.split(' ')[0]}?` :
              'What would you like to build?'
            }
            disabled={isRunning || submitting}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f1f5f9',
              fontSize: 14,
              fontWeight: 500,
              lineHeight: 1.5,
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || isRunning || submitting}
            style={{
              width: 40, height: 40,
              borderRadius: 16,
              background: (!inputText.trim() || isRunning || submitting)
                ? 'rgba(99,102,241,0.2)'
                : 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              border: 'none',
              cursor: (!inputText.trim() || isRunning || submitting) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 17, color: 'white',
              transition: 'all 0.2s',
              flexShrink: 0,
              boxShadow: (!inputText.trim() || isRunning || submitting) ? 'none' : '0 0 20px rgba(99,102,241,0.5)',
            }}
          >
            {submitting || isRunning
              ? <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              : '→'
            }
          </button>
        </div>

        {/* Quick prompts when idle */}
        {!currentTaskId && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              'Build a SaaS landing page',
              'Create a portfolio website',
              'Design a data dashboard',
              'Make an animated hero',
            ].map(q => (
              <button
                key={q}
                onClick={() => setInputText(q)}
                style={{
                  background: 'rgba(6,6,20,0.8)',
                  border: '1px solid rgba(99,102,241,0.2)',
                  borderRadius: 20,
                  padding: '5px 14px',
                  color: '#64748b',
                  fontSize: 11,
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s',
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Build panel toggle button (when panel is hidden but files exist) ── */}
      {!showPanel && files.length > 0 && (
        <button
          onClick={() => setShowPanel(true)}
          style={{
            position: 'absolute', right: 20, top: '50%',
            transform: 'translateY(-50%)',
            background: 'rgba(6,6,20,0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 14,
            padding: '10px 16px',
            color: '#a5b4fc',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            zIndex: 25,
            boxShadow: '0 0 20px rgba(99,102,241,0.2)',
          }}
        >
          ◪ {files.length} files
        </button>
      )}

      {/* ── Build panel ── */}
      <BuildPanel
        show={showPanel}
        taskId={currentTaskId}
        files={files}
        taskStatus={taskStatus}
        onClose={() => setShowPanel(false)}
      />
    </div>
  )
}
