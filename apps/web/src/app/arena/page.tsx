'use client'

import dynamic from 'next/dynamic'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useArenaStream } from '@/hooks/useArenaStream'
import { tasksApi, creditsApi, getApiError } from '@/lib/api'
import { CHARACTERS } from '@/lib/characters'
import JSZip from 'jszip'

// ─── Load 2D SVG arena client-side only (no SSR) ─────────────────────────────
const ArenaCanvas2D = dynamic(
  () => import('@/components/arena/ArenaCanvas2D').then(m => m.ArenaCanvas2D),
  { ssr: false, loading: () => <div style={{ width: '100vw', height: '100vh', background: '#f0e8d8' }} /> }
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

// ─── AI brand config for chat bubbles ─────────────────────────────────────────
const AI_CHAT_STYLE: Record<string, { color: string; bg: string; border: string; icon: string; role: string }> = {
  claude:     { color: '#F59E0B', bg: 'rgba(217,119,6,0.12)',   border: 'rgba(245,158,11,0.28)',  icon: '◆', role: 'Builder'    },
  perplexity: { color: '#14B8A6', bg: 'rgba(13,148,136,0.12)',  border: 'rgba(20,184,166,0.28)',  icon: '⬡', role: 'Researcher' },
  chatgpt:    { color: '#10B981', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.28)',  icon: '●', role: 'Advisor'    },
  gemini:     { color: '#A78BFA', bg: 'rgba(139,92,246,0.12)',  border: 'rgba(167,139,250,0.28)', icon: '◈', role: 'Visualizer' },
  sarvam:     { color: '#FBBF24', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(251,191,36,0.28)',  icon: '❋', role: 'Translator' },
}

// ─── Chat Message Row ─────────────────────────────────────────────────────────
function ChatRow({ msg }: { msg: { type: string; text: string; character?: string } }) {
  if (msg.type === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <div style={{
          background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
          color: 'white',
          borderRadius: '18px 18px 4px 18px',
          padding: '10px 16px',
          maxWidth: '82%',
          fontSize: 13,
          lineHeight: 1.6,
          fontWeight: 500,
          boxShadow: '0 2px 16px rgba(99,102,241,0.4), 0 1px 4px rgba(0,0,0,0.3)',
        }}>
          {msg.text}
        </div>
      </div>
    )
  }

  if (msg.type === 'file_done') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, paddingLeft: 6 }}>
        <span style={{ color: '#34D399', fontSize: 10, flexShrink: 0 }}>✦</span>
        <span style={{
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.22)',
          borderRadius: 8,
          padding: '2px 9px',
          color: '#6EE7B7',
          fontSize: 10.5,
          fontFamily: 'monospace',
          letterSpacing: '0.02em',
        }}>
          {msg.text}
        </span>
      </div>
    )
  }

  if (msg.type === 'completed') {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(5,150,105,0.08))',
        border: '1px solid rgba(16,185,129,0.35)',
        borderRadius: 14,
        padding: '11px 16px',
        marginBottom: 8,
        marginTop: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ fontSize: 16, lineHeight: 1 }}>✓</span>
        <span style={{ color: '#6EE7B7', fontSize: 13, fontWeight: 700 }}>{msg.text}</span>
      </div>
    )
  }

  if (msg.type === 'error') {
    return (
      <div style={{
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.22)',
        borderRadius: 10,
        padding: '8px 12px',
        marginBottom: 6,
        display: 'flex', alignItems: 'flex-start', gap: 6,
      }}>
        <span style={{ color: '#F87171', fontSize: 11, flexShrink: 0, marginTop: 1 }}>✗</span>
        <span style={{ color: '#FCA5A5', fontSize: 12, lineHeight: 1.5 }}>{msg.text}</span>
      </div>
    )
  }

  // ai_log — per-AI styled bubble
  const charId = msg.character ?? 'claude'
  const ai = AI_CHAT_STYLE[charId] ?? { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', icon: '·', role: 'AI' }
  const charName = CHARACTERS[charId as keyof typeof CHARACTERS]?.name ?? charId

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 8,
      animation: 'fadeInBubble 0.3s ease',
    }}>
      {/* Avatar dot */}
      <div style={{
        width: 26,
        height: 26,
        borderRadius: 8,
        background: ai.bg,
        border: `1.5px solid ${ai.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        marginTop: 1,
        fontSize: 11,
        color: ai.color,
        boxShadow: `0 0 8px ${ai.color}30`,
      }}>
        {ai.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Name badge */}
        <div style={{ marginBottom: 3, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            fontSize: 10,
            fontWeight: 800,
            color: ai.color,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}>
            {charName}
          </span>
          <span style={{
            fontSize: 9,
            color: ai.color,
            opacity: 0.55,
            fontWeight: 500,
          }}>
            {ai.role}
          </span>
        </div>

        {/* Message bubble */}
        <div style={{
          background: ai.bg,
          border: `1px solid ${ai.border}`,
          borderRadius: '4px 14px 14px 14px',
          padding: '8px 12px',
          color: '#e2e8f0',
          fontSize: 12.5,
          lineHeight: 1.6,
          boxShadow: `0 0 12px ${ai.color}15`,
        }}>
          {msg.text}
        </div>
      </div>
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
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isCompleted = taskStatus === 'done'
  const apiPreviewUrl = taskId ? `/api/v1/preview/${taskId}` : null

  // Auto-expand to 65% when build completes, exit fullscreen
  useEffect(() => {
    if (isCompleted) setIsFullscreen(false)
  }, [isCompleted])

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

  const panelWidth = isFullscreen ? '100%' : isCompleted ? '65%' : '48%'

  return (
    <div style={{
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: panelWidth,
      background: 'rgba(6, 6, 20, 0.96)',
      backdropFilter: 'blur(20px)',
      borderLeft: '1px solid rgba(99,102,241,0.2)',
      transform: show ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 0.45s cubic-bezier(0.32, 0, 0.67, 0), width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
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
              flexShrink: 0,
            }}
          >
            ↓ Download ZIP
          </button>
        )}
        <button
          onClick={() => setIsFullscreen(f => !f)}
          title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen preview'}
          style={{
            color: '#94a3b8',
            background: 'rgba(99,102,241,0.1)',
            border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            padding: '4px 8px',
            flexShrink: 0,
            transition: 'all 0.2s',
          }}
        >
          {isFullscreen ? '⊡' : '⛶'}
        </button>
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
  const [stopping, setStopping] = useState(false)
  const [showPanel, setShowPanel] = useState(false)
  const [inputError, setInputError] = useState<string | null>(null)
  const [estimate, setEstimate] = useState<{ min: number; max: number; typical: number } | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [userCredits, setUserCredits] = useState<number | null>(null)
  const [showProjects, setShowProjects] = useState(false)
  const [projectsList, setProjectsList] = useState<any[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)
  const [welcomeUser, setWelcomeUser] = useState<string | null>(null)
  const welcomedRef = useRef(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const estimateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    characterStates,
    chatMessages,
    taskStatus,
    files,
    previewAvailable,
    creditsUsedLive,
    reconnectForFollowUp,
  } = useArenaStream(currentTaskId, user?.name?.split(' ')[0] ?? user?.email?.split('@')[0])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login')
  }, [authLoading, user, router])

  // Load user credit balance
  useEffect(() => {
    if (!user) return
    creditsApi.getBalance().then(r => setUserCredits((r as any).data?.balance ?? (r as any).balance ?? null)).catch(() => {})
  }, [user])

  // Claude welcome wave on first load
  useEffect(() => {
    if (!user || welcomedRef.current) return
    welcomedRef.current = true
    const name = user.name?.split(' ')[0] ?? 'there'
    setWelcomeUser(name)
    const t = setTimeout(() => setWelcomeUser(null), 6000)
    return () => clearTimeout(t)
  }, [user])

  const isRunning = taskStatus === 'running'
  const isDone    = taskStatus === 'done'

  // Debounced credit estimate as user types
  useEffect(() => {
    if (!inputText.trim() || inputText.length < 10 || isRunning) {
      setEstimate(null)
      return
    }
    if (estimateTimer.current) clearTimeout(estimateTimer.current)
    setEstimating(true)
    estimateTimer.current = setTimeout(async () => {
      try {
        const cat = detectCategory(inputText)
        const res = await tasksApi.estimate(inputText, cat)
        setEstimate((res as any).data?.estimate ?? (res as any).estimate ?? null)
      } catch { setEstimate(null) }
      finally { setEstimating(false) }
    }, 800)
    return () => { if (estimateTimer.current) clearTimeout(estimateTimer.current) }
  }, [inputText, isRunning])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // Show build panel when files appear
  useEffect(() => {
    if (files.length > 0) setShowPanel(true)
  }, [files.length])

  const handleStop = useCallback(async () => {
    if (!currentTaskId || stopping) return
    setStopping(true)
    try {
      await tasksApi.cancel(currentTaskId)
    } catch { /* stream will reflect cancelled status */ }
    finally { setStopping(false) }
  }, [currentTaskId, stopping])

  const handleShowProjects = useCallback(async () => {
    setProjectsLoading(true)
    setShowProjects(true)
    try {
      const res = await tasksApi.list()
      setProjectsList((res as any)?.data?.tasks ?? (res as any)?.tasks ?? [])
    } catch { setProjectsList([]) }
    finally { setProjectsLoading(false) }
  }, [])

  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    if (!text || submitting) return
    if (isRunning) return

    // Intercept: "show my projects" command
    if (/show.*project|my project|list.*project|view.*project|all project/i.test(text)) {
      setInputText('')
      handleShowProjects()
      return
    }

    setInputError(null)
    setSubmitting(true)

    try {
      if (isDone && currentTaskId) {
        // Follow-up / enhance existing task
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
  }, [inputText, submitting, isRunning, isDone, currentTaskId, reconnectForFollowUp, handleShowProjects])

  if (authLoading) {
    return (
      <div style={{
        width: '100vw', height: '100vh', background: '#f0e8d8',
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
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#f0e8d8' }}>

      {/* ── Global animations style ── */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInBubble { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulseGlow { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>

      {/* ── Full-screen 3D arena ── */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <ArenaCanvas2D
          characterStates={characterStates}
          welcomeUser={welcomeUser}
          taskStatus={taskStatus}
        />
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
          {user?.isAdmin && (
            <a
              href="/admin"
              style={{
                color: '#a78bfa', background: 'rgba(109,40,217,0.18)',
                border: '1px solid rgba(139,92,246,0.4)',
                borderRadius: 10, padding: '4px 12px',
                fontSize: 11, fontWeight: 700, textDecoration: 'none',
                letterSpacing: '0.02em',
              }}
            >
              Admin Panel →
            </a>
          )}
          {user && (
            <span style={{ color: '#64748b', fontSize: 12, fontWeight: 500 }}>
              {user.name?.split(' ')[0]}
            </span>
          )}
          {user && (
            <span style={{
              background: isRunning && creditsUsedLive > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)',
              border: isRunning && creditsUsedLive > 0 ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(99,102,241,0.3)',
              borderRadius: 20, padding: '3px 10px',
              color: isRunning && creditsUsedLive > 0 ? '#fca5a5' : '#a5b4fc',
              fontSize: 11, fontWeight: 700,
              transition: 'all 0.3s',
            }}>
              {isRunning && creditsUsedLive > 0
                ? `-${creditsUsedLive} cr used`
                : `${userCredits ?? (user as any).credits ?? 0} cr`}
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
          {isRunning && (
            <button
              onClick={handleStop}
              disabled={stopping}
              style={{
                height: 40, padding: '0 14px',
                borderRadius: 16,
                background: stopping ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.85)',
                border: '1.5px solid rgba(239,68,68,0.6)',
                cursor: stopping ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, color: 'white', fontSize: 12, fontWeight: 700,
                flexShrink: 0, transition: 'all 0.2s',
                boxShadow: stopping ? 'none' : '0 0 16px rgba(239,68,68,0.4)',
              }}
            >
              {stopping
                ? <span style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
                : <span style={{ width: 10, height: 10, background: 'white', borderRadius: 2, display: 'inline-block' }} />
              }
              {stopping ? 'Stopping…' : 'Stop'}
            </button>
          )}
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
            {submitting
              ? <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />
              : '→'
            }
          </button>
        </div>

        {/* Credit estimate pill */}
        {!isRunning && inputText.length >= 10 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
            {estimating ? (
              <span style={{ fontSize: 11, color: '#475569', background: 'rgba(6,6,20,0.7)', borderRadius: 20, padding: '3px 12px' }}>
                Estimating cost…
              </span>
            ) : estimate ? (
              <span style={{
                fontSize: 11, fontWeight: 600,
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: 20, padding: '3px 14px', color: '#a5b4fc',
              }}>
                ≈ {estimate.min}–{estimate.max} credits · typical {estimate.typical} cr
              </span>
            ) : null}
          </div>
        )}

        {/* Quick prompts when idle */}
        {!currentTaskId && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={handleShowProjects}
              style={{
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.35)',
                borderRadius: 20, padding: '5px 14px',
                color: '#a5b4fc', fontSize: 11, cursor: 'pointer',
                backdropFilter: 'blur(8px)', fontWeight: 600,
              }}
            >
              📂 My Projects
            </button>
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

      {/* ── Projects modal ── */}
      {showProjects && (
        <div
          onClick={() => setShowProjects(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'rgba(6,6,24,0.98)',
              border: '1.5px solid rgba(99,102,241,0.35)',
              borderRadius: 24,
              width: '100%', maxWidth: 600,
              maxHeight: '80vh',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 0 60px rgba(99,102,241,0.25), 0 24px 64px rgba(0,0,0,0.8)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid rgba(99,102,241,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ color: '#f1f5f9', fontSize: 17, fontWeight: 700, margin: 0 }}>My Projects</h2>
                <p style={{ color: '#64748b', fontSize: 12, margin: '3px 0 0' }}>
                  Click a project to continue or enhance it
                </p>
              </div>
              <button
                onClick={() => setShowProjects(false)}
                style={{ background: 'none', border: 'none', color: '#475569', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1, padding: '12px 16px' }}>
              {projectsLoading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#475569', fontSize: 13 }}>
                  <span style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  <div style={{ marginTop: 10 }}>Loading projects…</div>
                </div>
              ) : projectsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#475569', fontSize: 13 }}>
                  No projects yet. Start building something!
                </div>
              ) : (
                projectsList.map((task, i) => {
                  const statusColor: Record<string, string> = {
                    completed: '#34D399', running: '#60A5FA', failed: '#F87171',
                    cancelled: '#94A3B8', pending: '#FCD34D', analyzing: '#A78BFA',
                  }
                  const col = statusColor[task.status] ?? '#64748b'
                  return (
                    <div
                      key={task.id}
                      onClick={() => {
                        setCurrentTaskId(task.id)
                        setShowProjects(false)
                        if (task.status === 'completed') setShowPanel(true)
                      }}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 14,
                        padding: '14px 16px',
                        borderRadius: 16,
                        border: '1px solid rgba(99,102,241,0.15)',
                        background: 'rgba(99,102,241,0.06)',
                        marginBottom: 8,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span style={{
                        minWidth: 28, height: 28, borderRadius: 10,
                        background: 'rgba(99,102,241,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#a5b4fc', fontSize: 12, fontWeight: 800, flexShrink: 0,
                      }}>
                        {i + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 600, lineHeight: 1.4, marginBottom: 4 }}>
                          {task.prompt?.slice(0, 90)}{(task.prompt?.length ?? 0) > 90 ? '…' : ''}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: col,
                            background: `${col}18`, border: `1px solid ${col}40`,
                            borderRadius: 8, padding: '2px 8px', textTransform: 'uppercase',
                          }}>
                            {task.status}
                          </span>
                          <span style={{ color: '#475569', fontSize: 11 }}>
                            {new Date(task.createdAt).toLocaleDateString()}
                          </span>
                          {task.category && (
                            <span style={{ color: '#6366f1', fontSize: 11 }}>#{task.category}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
