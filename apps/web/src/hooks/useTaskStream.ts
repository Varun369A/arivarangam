'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { TaskStatus } from '@/lib/api'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskEventType =
  | 'connected'
  | 'file_created'
  | 'file_updated'
  | 'file_deleted'
  | 'command_run'
  | 'log'
  | 'error'
  | 'error_fixed'
  | 'preview_ready'
  | 'completed'
  | 'cancelled'
  | 'stream_end'

export interface TaskEvent {
  type: TaskEventType
  timestamp: string
  data: Record<string, unknown>
}

export interface TaskStreamFile {
  path: string
  content?: string
  language?: string
}

export interface TaskStreamState {
  events: TaskEvent[]
  status: TaskStatus | null
  previewUrl: string | null
  files: TaskStreamFile[]
  isConnected: boolean
  isComplete: boolean
  error: string | null
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseTaskStreamReturn extends TaskStreamState {
  disconnect: () => void
}

const TERMINAL_STATUSES: TaskStatus[] = ['done', 'failed', 'cancelled']

function parseData<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export function useTaskStream(taskId: string | null): UseTaskStreamReturn {
  const [state, setState] = useState<TaskStreamState>({
    events: [],
    status: null,
    previewUrl: null,
    files: [],
    isConnected: false,
    isComplete: false,
    error: null,
  })

  const esRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectCountRef = useRef(0)
  const MAX_RECONNECTS = 3

  const closeConnection = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }
    esRef.current?.close()
    esRef.current = null
  }, [])

  const addEvent = useCallback((type: TaskEventType, data: Record<string, unknown>) => {
    setState((prev) => ({
      ...prev,
      events: [
        ...prev.events,
        {
          type,
          timestamp: (data.timestamp as string) ?? new Date().toISOString(),
          data,
        },
      ],
    }))
  }, [])

  const connect = useCallback(
    (id: string) => {
      closeConnection()

      const url = `/api/v1/stream/tasks/${id}`
      const es = new EventSource(url, { withCredentials: true })
      esRef.current = es

      // connected
      es.addEventListener('connected', (e: MessageEvent) => {
        const data = parseData<{ status: TaskStatus; taskId: string }>(e.data)
        if (!data) return
        reconnectCountRef.current = 0
        setState((prev) => ({
          ...prev,
          isConnected: true,
          status: data.status,
          error: null,
        }))
        addEvent('connected', data as Record<string, unknown>)
      })

      // file_created
      es.addEventListener('file_created', (e: MessageEvent) => {
        const data = parseData<TaskStreamFile & Record<string, unknown>>(e.data)
        if (!data) return
        setState((prev) => {
          const exists = prev.files.some((f) => f.path === data.path)
          const files = exists
            ? prev.files.map((f) => (f.path === data.path ? { ...f, ...data } : f))
            : [...prev.files, { path: data.path as string, content: data.content as string, language: data.language as string }]
          return { ...prev, files }
        })
        addEvent('file_created', data)
      })

      // file_updated
      es.addEventListener('file_updated', (e: MessageEvent) => {
        const data = parseData<TaskStreamFile & Record<string, unknown>>(e.data)
        if (!data) return
        setState((prev) => ({
          ...prev,
          files: prev.files.map((f) =>
            f.path === data.path ? { ...f, ...data } : f
          ),
        }))
        addEvent('file_updated', data)
      })

      // file_deleted
      es.addEventListener('file_deleted', (e: MessageEvent) => {
        const data = parseData<{ path: string } & Record<string, unknown>>(e.data)
        if (!data) return
        setState((prev) => ({
          ...prev,
          files: prev.files.filter((f) => f.path !== data.path),
        }))
        addEvent('file_deleted', data)
      })

      // command_run
      es.addEventListener('command_run', (e: MessageEvent) => {
        const data = parseData<Record<string, unknown>>(e.data)
        if (!data) return
        addEvent('command_run', data)
      })

      // log
      es.addEventListener('log', (e: MessageEvent) => {
        const data = parseData<Record<string, unknown>>(e.data)
        if (!data) return
        addEvent('log', data)
      })

      // error (SSE named event, not the onerror callback)
      es.addEventListener('error', (e: MessageEvent) => {
        if (!(e instanceof MessageEvent)) return
        const data = parseData<Record<string, unknown>>(e.data)
        if (!data) return
        addEvent('error', data)
        setState((prev) => ({ ...prev, status: 'failed' }))
      })

      // error_fixed
      es.addEventListener('error_fixed', (e: MessageEvent) => {
        const data = parseData<Record<string, unknown>>(e.data)
        if (!data) return
        addEvent('error_fixed', data)
      })

      // preview_ready
      es.addEventListener('preview_ready', (e: MessageEvent) => {
        const data = parseData<{ url: string } & Record<string, unknown>>(e.data)
        if (!data) return
        setState((prev) => ({
          ...prev,
          previewUrl: data.url ?? null,
        }))
        addEvent('preview_ready', data)
      })

      // completed
      es.addEventListener('completed', (e: MessageEvent) => {
        const data = parseData<{ previewUrl?: string } & Record<string, unknown>>(e.data)
        if (!data) return
        setState((prev) => ({
          ...prev,
          status: 'done',
          previewUrl: data.previewUrl ?? prev.previewUrl,
        }))
        addEvent('completed', data)
      })

      // cancelled
      es.addEventListener('cancelled', (e: MessageEvent) => {
        const data = parseData<Record<string, unknown>>(e.data) ?? {}
        setState((prev) => ({ ...prev, status: 'cancelled' }))
        addEvent('cancelled', data)
      })

      // stream_end — server signals the stream is closing
      es.addEventListener('stream_end', () => {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isComplete: true,
        }))
        es.close()
        esRef.current = null
      })

      // Native EventSource error (network issue / server dropped)
      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED) {
          setState((prev) => {
            // If already in a terminal status, don't attempt reconnect
            if (prev.status && TERMINAL_STATUSES.includes(prev.status)) {
              return { ...prev, isConnected: false, isComplete: true }
            }
            return prev
          })

          // Attempt reconnect if not past limit
          if (reconnectCountRef.current < MAX_RECONNECTS) {
            reconnectCountRef.current += 1
            const delay = 2000 * reconnectCountRef.current
            reconnectTimerRef.current = setTimeout(() => {
              if (esRef.current === null) {
                connect(id)
              }
            }, delay)
          } else {
            setState((prev) => ({
              ...prev,
              isConnected: false,
              isComplete: true,
              error: 'Stream connection lost. Please refresh.',
            }))
          }
        }
      }
    },
    [addEvent, closeConnection]
  )

  // Start connection when taskId changes
  useEffect(() => {
    if (!taskId) return

    // Reset state for new task
    setState({
      events: [],
      status: null,
      previewUrl: null,
      files: [],
      isConnected: false,
      isComplete: false,
      error: null,
    })
    reconnectCountRef.current = 0

    connect(taskId)

    return () => {
      closeConnection()
    }
  }, [taskId, connect, closeConnection])

  const disconnect = useCallback(() => {
    closeConnection()
    setState((prev) => ({
      ...prev,
      isConnected: false,
      isComplete: true,
    }))
  }, [closeConnection])

  return { ...state, disconnect }
}
