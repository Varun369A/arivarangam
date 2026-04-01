'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { CharacterAction, CharacterState } from '@/components/arena/CharacterFigure'
import type { CharacterId } from '@/lib/characters'
import { CHARACTERS } from '@/lib/characters'
import type { TaskStreamFile } from './useTaskStream'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ArenaStreamState {
  // Task state
  taskStatus: 'idle' | 'running' | 'done' | 'failed' | 'cancelled'
  files: TaskStreamFile[]
  previewAvailable: boolean

  // Live credit tracking
  creditsUsedLive: number

  // Character animation state
  characterStates: Record<CharacterId, CharacterState>

  // Chat / activity log (non-character events only)
  chatMessages: ChatMessage[]

  // Connection
  isConnected: boolean
  isComplete: boolean
  error: string | null
}

export interface ChatMessage {
  id: string
  type: 'user' | 'system' | 'ai_log' | 'file_done' | 'error' | 'completed'
  text: string
  timestamp: string
  character?: CharacterId
}

// ─── Default state factory ────────────────────────────────────────────────────

function makeDefaultCharacterStates(): Record<CharacterId, CharacterState> {
  const states = {} as Record<CharacterId, CharacterState>
  for (const id of Object.keys(CHARACTERS) as CharacterId[]) {
    states[id] = { action: 'idle', targetPosition: null, speech: null }
  }
  return states
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useArenaStream(taskId: string | null, username?: string) {
  const [state, setState] = useState<ArenaStreamState>({
    taskStatus: 'idle',
    files: [],
    previewAvailable: false,
    creditsUsedLive: 0,
    characterStates: makeDefaultCharacterStates(),
    chatMessages: [],
    isConnected: false,
    isComplete: false,
    error: null,
  })

  const esRef              = useRef<EventSource | null>(null)
  const reconnectRef       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectCountRef  = useRef(0)
  const speechTimersRef    = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  // Tracks when a walking-in character will arrive — prevents speak events interrupting walk
  const walkEndTimeRef     = useRef<Record<string, number>>({})

  // ── Speech management ──────────────────────────────────────────────────────

  const setSpeech = useCallback((
    characterId: CharacterId,
    text: string,
    durationMs = 7000
  ) => {
    // Clear previous timer for this character
    if (speechTimersRef.current[characterId]) {
      clearTimeout(speechTimersRef.current[characterId])
    }

    setState(prev => ({
      ...prev,
      characterStates: {
        ...prev.characterStates,
        [characterId]: { ...prev.characterStates[characterId], speech: text },
      },
    }))

    // Auto-clear after duration
    speechTimersRef.current[characterId] = setTimeout(() => {
      setState(prev => ({
        ...prev,
        characterStates: {
          ...prev.characterStates,
          [characterId]: { ...prev.characterStates[characterId], speech: null },
        },
      }))
    }, durationMs)
  }, [])

  const setCharacterAction = useCallback((
    characterId: CharacterId,
    action: CharacterAction,
    targetPosition?: [number, number, number] | null
  ) => {
    setState(prev => ({
      ...prev,
      characterStates: {
        ...prev.characterStates,
        [characterId]: {
          ...prev.characterStates[characterId],
          action,
          targetPosition: targetPosition ?? prev.characterStates[characterId].targetPosition,
        },
      },
    }))
  }, [])

  // ── Chat message ───────────────────────────────────────────────────────────

  const addChatMessage = useCallback((msg: Omit<ChatMessage, 'id'>) => {
    setState(prev => ({
      ...prev,
      chatMessages: [
        ...prev.chatMessages,
        { ...msg, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
      ],
    }))
  }, [])

  // ── Character event processor ──────────────────────────────────────────────

  const processCharacterEvent = useCallback((data: Record<string, unknown>) => {
    const charId      = data.character as CharacterId
    const action      = data.action as string
    const text        = data.text as string | undefined
    const targetChar  = data.targetCharacter as CharacterId | undefined
    const duration    = (data.duration as number | undefined) ?? 7000

    if (!charId || !CHARACTERS[charId]) return

    switch (action) {
      case 'speak': {
        // Delay speech if this character is still walking in from a call
        const walkEnd = walkEndTimeRef.current[charId] ?? 0
        const waitMs  = Math.max(0, walkEnd - Date.now() + 800)
        const doSpeak = () => {
          setCharacterAction(charId, 'talking')
          if (text) setSpeech(charId, text, duration)
          setTimeout(() => setCharacterAction(charId, 'idle'), duration + 200)
        }
        if (waitMs > 400) setTimeout(doSpeak, waitMs)
        else doSpeak()
        break
      }

      case 'think': {
        const walkEnd2 = walkEndTimeRef.current[charId] ?? 0
        const waitMs2  = Math.max(0, walkEnd2 - Date.now() + 800)
        const doThink = () => {
          setCharacterAction(charId, 'thinking')
          if (text) setSpeech(charId, text, duration)
          setTimeout(() => setCharacterAction(charId, 'idle'), duration + 200)
        }
        if (waitMs2 > 400) setTimeout(doThink, waitMs2)
        else doThink()
        break
      }

      case 'wave':
        setCharacterAction(charId, 'waving')
        if (text) setSpeech(charId, text, duration)
        setTimeout(() => setCharacterAction(charId, 'idle'), 6000)
        break

      case 'celebrate':
        setCharacterAction(charId, 'celebrating')
        if (text) setSpeech(charId, text, duration)
        setTimeout(() => setCharacterAction(charId, 'idle'), 3500)
        break

      case 'call': {
        // Claude calls another character — slow walk-in, ~1 minute real conversation
        const uname = username ?? 'there'
        setCharacterAction(charId, 'calling')
        if (text) setSpeech(charId, text, 7000)

        if (targetChar && CHARACTERS[targetChar]) {
          const tc = CHARACTERS[targetChar]

          // ── 0.8s: target starts walking in (5.5s walk) ──────────────────
          setTimeout(() => {
            setCharacterAction(targetChar, 'walking', tc.meetPosition as [number, number, number])
            walkEndTimeRef.current[targetChar] = Date.now() + 5500
          }, 800)

          // ── 7s: arrived — target greets user by name ────────────────────
          setTimeout(() => {
            setCharacterAction(targetChar, 'waving')
            const g = tc.greetings[Math.floor(Math.random() * tc.greetings.length)] ?? 'Hi! Ready to help.'
            setSpeech(targetChar, `Hi ${uname}! ${g}`, 7000)
          }, 7000)

          // ── 7s: Claude responds to target arriving ──────────────────────
          setTimeout(() => {
            setCharacterAction(charId, 'talking')
            setSpeech(charId, tc.thinkingPhrases[0] ?? "Great, let's work through this together.", 7000)
          }, 14000)

          // ── 21s: target explains findings ───────────────────────────────
          setTimeout(() => {
            setCharacterAction(targetChar, 'talking')
            const wp = tc.workingPhrases[0] ?? 'Here is what I found...'
            setSpeech(targetChar, wp, 7000)
          }, 21000)

          // ── 28s: Claude asks follow-up ───────────────────────────────────
          setTimeout(() => {
            setCharacterAction(charId, 'talking')
            const tp = tc.thinkingPhrases[1] ?? 'That makes sense. Can you go deeper on that?'
            setSpeech(charId, tp, 7000)
          }, 28000)

          // ── 35s: target digs deeper ──────────────────────────────────────
          setTimeout(() => {
            setCharacterAction(targetChar, 'thinking')
            const wp2 = tc.workingPhrases[1] ?? 'Looking into it more carefully...'
            setSpeech(targetChar, wp2, 7000)
          }, 35000)

          // ── 42s: target gives final answer ──────────────────────────────
          setTimeout(() => {
            setCharacterAction(targetChar, 'talking')
            const g2 = tc.greetings[1] ?? "That covers everything I found."
            setSpeech(targetChar, g2, 7000)
          }, 42000)

          // ── 49s: Claude thanks and dismisses ────────────────────────────
          setTimeout(() => {
            setCharacterAction(charId, 'talking')
            setSpeech(
              charId,
              `Thank you ${tc.name}, that was really helpful! You can go now, great work.`,
              7000
            )
          }, 49000)

          // ── 56s: target waves goodbye ────────────────────────────────────
          setTimeout(() => {
            setCharacterAction(targetChar, 'waving')
            setSpeech(targetChar, `Anytime, ${uname}! Good luck with the build!`, 5000)
          }, 56000)

          // ── 61s: target walks home ───────────────────────────────────────
          setTimeout(() => {
            delete walkEndTimeRef.current[targetChar]
            setCharacterAction(targetChar, 'walking', CHARACTERS[targetChar].homePosition as [number, number, number])
          }, 62000)

          setTimeout(() => setCharacterAction(targetChar, 'idle'), 68000)
        }

        setTimeout(() => setCharacterAction(charId, 'listening'), 7500)
        break
      }

      case 'arrive':
        // Character arrives (already walking) — start talking
        setCharacterAction(charId, 'talking')
        if (text) setSpeech(charId, text, duration)
        setTimeout(() => setCharacterAction(charId, 'idle'), duration + 200)
        break

      case 'return':
        // Character waves goodbye then slowly walks back off-screen
        delete walkEndTimeRef.current[charId]
        setCharacterAction(charId, 'waving')
        if (text) setSpeech(charId, text, 7000)
        setTimeout(() => {
          setCharacterAction(charId, 'walking', CHARACTERS[charId].homePosition as [number, number, number])
        }, 7500)
        setTimeout(() => setCharacterAction(charId, 'idle'), 14000)
        break

      case 'point':
        setCharacterAction(charId, 'pointing')
        if (text) setSpeech(charId, text, duration)
        setTimeout(() => setCharacterAction(charId, 'talking'), duration + 100)
        setTimeout(() => setCharacterAction(charId, 'idle'), duration + 2000)
        break

      case 'listen':
        setCharacterAction(charId, 'listening')
        break
    }
  }, [setCharacterAction, setSpeech])

  // ── Connect to SSE stream ──────────────────────────────────────────────────

  const connect = useCallback((id: string) => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    if (reconnectRef.current) {
      clearTimeout(reconnectRef.current)
      reconnectRef.current = null
    }

    const token = typeof document !== 'undefined'
      ? document.cookie.split('; ').find(r => r.startsWith('accessToken='))?.split('=')[1]
      : undefined
    const url = `/api/v1/stream/tasks/${id}${token ? `?token=${encodeURIComponent(token)}` : ''}`
    const es = new EventSource(url, { withCredentials: true })
    esRef.current = es

    es.addEventListener('connected', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        reconnectCountRef.current = 0
        setState(prev => ({
          ...prev,
          isConnected: true,
          taskStatus: data.status ?? 'running',
          error: null,
        }))
        // Claude gets to work
        setCharacterAction('claude', 'thinking')
        setSpeech('claude', "Analyzing your request — let me build this for you!", 6000)
        setTimeout(() => setCharacterAction('claude', 'thinking'), 6200)
      } catch { /* ignore */ }
    })

    es.addEventListener('log', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as Record<string, unknown>

        // Character events — drive animations, don't show in chat
        if (data.isCharacterEvent) {
          processCharacterEvent(data)
          return
        }

        // Live code stream — ignore (no chat entry needed)
        if (data.isCodeStream || data.streamOnly) return

        // Regular log — add to chat
        const msg = String(data.message ?? data.log ?? '')
        if (msg) {
          addChatMessage({
            type: 'ai_log',
            text: msg,
            timestamp: (data.timestamp as string) ?? new Date().toISOString(),
            character: 'claude',
          })
        }
      } catch { /* ignore */ }
    })

    es.addEventListener('file_created', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        setState(prev => {
          const exists = prev.files.some(f => f.path === data.path)
          const files = exists
            ? prev.files.map(f => f.path === data.path ? { ...f, ...data } : f)
            : [...prev.files, { path: data.path, content: data.content, language: data.language }]
          return { ...prev, files }
        })
        addChatMessage({
          type: 'file_done',
          text: data.path,
          timestamp: new Date().toISOString(),
          character: 'claude',
        })
        setCharacterAction('claude', 'talking')
        setTimeout(() => setCharacterAction('claude', 'thinking'), 1200)
      } catch { /* ignore */ }
    })

    es.addEventListener('file_updated', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        setState(prev => ({
          ...prev,
          files: prev.files.map(f => f.path === data.path ? { ...f, ...data } : f),
        }))
      } catch { /* ignore */ }
    })

    es.addEventListener('user_message', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        addChatMessage({
          type: 'user',
          text: String(data.message ?? ''),
          timestamp: new Date().toISOString(),
        })
        setCharacterAction('claude', 'listening')
        setSpeech('claude', 'Got it!', 1500)
        setTimeout(() => setCharacterAction('claude', 'thinking'), 1600)
      } catch { /* ignore */ }
    })

    es.addEventListener('completed', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        setState(prev => ({
          ...prev,
          taskStatus: 'done',
          previewAvailable: true,
        }))
        addChatMessage({
          type: 'completed',
          text: `Build complete — ${data.fileCount ?? 0} file(s) generated`,
          timestamp: new Date().toISOString(),
          character: 'claude',
        })
        setCharacterAction('claude', 'celebrating')
        setSpeech('claude', `Done! I built ${data.fileCount ?? 'your'} files. Let me show you around.`, 5000)
        setTimeout(() => setCharacterAction('claude', 'pointing'), 5200)
      } catch { /* ignore */ }
    })

    es.addEventListener('error', (e: MessageEvent) => {
      if (!(e instanceof MessageEvent)) return
      try {
        const data = JSON.parse(e.data)
        setState(prev => ({ ...prev, taskStatus: 'failed' }))
        addChatMessage({
          type: 'error',
          text: String(data.message ?? 'Something went wrong'),
          timestamp: new Date().toISOString(),
        })
        setSpeech('claude', `Sorry, something went wrong. Try again!`, 4000)
      } catch { /* ignore */ }
    })

    es.addEventListener('credit_update', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        if (!data.isAdmin) {
          setState(prev => ({ ...prev, creditsUsedLive: data.creditsUsed ?? prev.creditsUsedLive }))
        }
      } catch { /* ignore */ }
    })

    es.addEventListener('cancelled', () => {
      setState(prev => ({ ...prev, taskStatus: 'cancelled' }))
    })

    es.addEventListener('stream_end', () => {
      setState(prev => ({ ...prev, isConnected: false, isComplete: true }))
      es.close()
      esRef.current = null
    })

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        if (reconnectCountRef.current < 3) {
          reconnectCountRef.current++
          reconnectRef.current = setTimeout(() => {
            if (!esRef.current) connect(id)
          }, 2000 * reconnectCountRef.current)
        } else {
          setState(prev => ({
            ...prev,
            isConnected: false,
            error: 'Connection lost',
          }))
        }
      }
    }
  }, [processCharacterEvent, addChatMessage, setCharacterAction, setSpeech])

  // ── Connect when taskId changes ────────────────────────────────────────────

  useEffect(() => {
    if (!taskId) return
    reconnectCountRef.current = 0
    setState(prev => ({
      ...prev,
      taskStatus: 'running',
      files: [],
      previewAvailable: false,
      creditsUsedLive: 0,
      isConnected: false,
      isComplete: false,
      error: null,
    }))
    connect(taskId)
    return () => {
      esRef.current?.close()
      esRef.current = null
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      // Clear all speech timers
      Object.values(speechTimersRef.current).forEach(clearTimeout)
    }
  }, [taskId, connect])

  // ── Follow-up reconnect ────────────────────────────────────────────────────

  const reconnectForFollowUp = useCallback(() => {
    if (!taskId) return
    setState(prev => ({
      ...prev,
      taskStatus: 'running',
      previewAvailable: false,
      isConnected: false,
      isComplete: false,
      error: null,
      characterStates: makeDefaultCharacterStates(),
    }))
    reconnectCountRef.current = 0
    connect(taskId)
  }, [taskId, connect])

  return { ...state, reconnectForFollowUp }
}
