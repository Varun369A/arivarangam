'use client'

import { useEffect, useRef, useCallback } from 'react'

export const AUTO_LOGOUT_KEY = 'autoLogoutMinutes'
export const AUTO_LOGOUT_OPTIONS = [
  { value: 5,   label: '5 minutes' },
  { value: 10,  label: '10 minutes' },
  { value: 30,  label: '30 minutes' },
  { value: 60,  label: '1 hour' },
  { value: 0,   label: 'Never' },
]

export function getAutoLogoutMinutes(): number {
  if (typeof window === 'undefined') return 0
  const stored = localStorage.getItem(AUTO_LOGOUT_KEY)
  return stored !== null ? Number(stored) : 0
}

export function setAutoLogoutMinutes(minutes: number): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(AUTO_LOGOUT_KEY, String(minutes))
}

export function useAutoLogout(logout: () => Promise<void>, isLoggedIn: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const minutesRef = useRef<number>(getAutoLogoutMinutes())

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const resetTimer = useCallback(() => {
    clearTimer()
    const minutes = minutesRef.current
    if (!isLoggedIn || minutes === 0) return
    timerRef.current = setTimeout(() => {
      logout()
    }, minutes * 60 * 1000)
  }, [clearTimer, isLoggedIn, logout])

  // Re-read setting whenever it changes (storage event from same tab)
  const syncSetting = useCallback(() => {
    minutesRef.current = getAutoLogoutMinutes()
    resetTimer()
  }, [resetTimer])

  useEffect(() => {
    if (!isLoggedIn) { clearTimer(); return }

    minutesRef.current = getAutoLogoutMinutes()
    resetTimer()

    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const
    const handler = () => resetTimer()

    EVENTS.forEach(e => window.addEventListener(e, handler, { passive: true }))
    window.addEventListener('storage', syncSetting)

    return () => {
      clearTimer()
      EVENTS.forEach(e => window.removeEventListener(e, handler))
      window.removeEventListener('storage', syncSetting)
    }
  }, [isLoggedIn, resetTimer, clearTimer, syncSetting])
}
