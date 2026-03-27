'use client'

import { useEffect, useRef, useCallback, useState } from 'react'

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

// Warning shown this many seconds before logout
const WARNING_SECONDS = 60

export interface AutoLogoutState {
  showWarning: boolean
  secondsLeft: number
  staySignedIn: () => void
}

export function useAutoLogout(
  logout: () => Promise<void>,
  isLoggedIn: boolean
): AutoLogoutState {
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const minutesRef = useRef<number>(getAutoLogoutMinutes())

  const [showWarning, setShowWarning] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(WARNING_SECONDS)

  const clearAllTimers = useCallback(() => {
    if (logoutTimerRef.current)  { clearTimeout(logoutTimerRef.current);  logoutTimerRef.current = null }
    if (warningTimerRef.current) { clearTimeout(warningTimerRef.current); warningTimerRef.current = null }
    if (countdownRef.current)    { clearInterval(countdownRef.current);   countdownRef.current = null }
    setShowWarning(false)
    setSecondsLeft(WARNING_SECONDS)
  }, [])

  const startTimers = useCallback(() => {
    clearAllTimers()
    const minutes = minutesRef.current
    if (!isLoggedIn || minutes === 0) return

    const totalMs = minutes * 60 * 1000
    const warningMs = Math.max(0, totalMs - WARNING_SECONDS * 1000)

    // Warning timer — fires 60s before logout
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      setSecondsLeft(WARNING_SECONDS)

      // Countdown every second
      countdownRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current)
            return 0
          }
          return s - 1
        })
      }, 1000)

      // Logout timer — fires 60s after warning
      logoutTimerRef.current = setTimeout(() => {
        clearAllTimers()
        logout()
      }, WARNING_SECONDS * 1000)

    }, warningMs)
  }, [isLoggedIn, clearAllTimers, logout])

  // "Stay signed in" resets all timers
  const staySignedIn = useCallback(() => {
    startTimers()
  }, [startTimers])

  // Re-read setting whenever it changes (storage event)
  const syncSetting = useCallback(() => {
    minutesRef.current = getAutoLogoutMinutes()
    startTimers()
  }, [startTimers])

  useEffect(() => {
    if (!isLoggedIn) { clearAllTimers(); return }

    minutesRef.current = getAutoLogoutMinutes()
    startTimers()

    const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'] as const
    const handler = () => {
      if (!showWarning) startTimers()
    }

    EVENTS.forEach(e => window.addEventListener(e, handler, { passive: true }))
    window.addEventListener('storage', syncSetting)

    return () => {
      clearAllTimers()
      EVENTS.forEach(e => window.removeEventListener(e, handler))
      window.removeEventListener('storage', syncSetting)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn])

  return { showWarning, secondsLeft, staySignedIn }
}
