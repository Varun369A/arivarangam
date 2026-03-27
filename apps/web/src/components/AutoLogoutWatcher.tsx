'use client'

import { useAuth } from '@/hooks/useAuth'
import { useAutoLogout } from '@/hooks/useAutoLogout'

export function AutoLogoutWatcher() {
  const { logout, isLoggedIn } = useAuth()
  useAutoLogout(logout, isLoggedIn)
  return null
}
