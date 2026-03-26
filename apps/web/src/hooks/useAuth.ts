'use client'

import { useCallback } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import toast from 'react-hot-toast'
import { authApi, getApiError } from '@/lib/api'
import type { User, AuthLoginPayload, AuthSignupPayload } from '@/lib/api'

const AUTH_QUERY_KEY = ['auth', 'me'] as const

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseAuthReturn {
  user: User | null | undefined
  isLoading: boolean
  isLoggedIn: boolean
  login: (payload: AuthLoginPayload) => Promise<void>
  logout: () => Promise<void>
  signup: (payload: AuthSignupPayload) => Promise<void>
  refresh: () => void
}

export function useAuth(): UseAuthReturn {
  const queryClient = useQueryClient()
  const router = useRouter()

  const {
    data: user,
    isLoading,
    refetch,
  } = useQuery<User | null>(
    AUTH_QUERY_KEY,
    async () => {
      // Only fetch if we have a token
      const token = Cookies.get('accessToken')
      if (!token) return null
      try {
        return await authApi.me()
      } catch {
        return null
      }
    },
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: false,
    }
  )

  const login = useCallback(
    async (payload: AuthLoginPayload) => {
      try {
        const data = await authApi.login(payload)
        // Store token in cookie (7-day expiry, accessible across client)
        Cookies.set('accessToken', data.accessToken, {
          expires: 7,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Lax',
        })
        // Populate query cache immediately
        queryClient.setQueryData<User>(AUTH_QUERY_KEY, data.user)
        toast.success(`Welcome back, ${data.user.name.split(' ')[0]}!`)
        router.push('/dashboard')
      } catch (err) {
        throw new Error(getApiError(err))
      }
    },
    [queryClient, router]
  )

  const signup = useCallback(
    async (payload: AuthSignupPayload) => {
      try {
        const data = await authApi.signup(payload)
        Cookies.set('accessToken', data.accessToken, {
          expires: 7,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'Lax',
        })
        queryClient.setQueryData<User>(AUTH_QUERY_KEY, data.user)
        toast.success(`Account created! Welcome, ${data.user.name.split(' ')[0]}!`)
        router.push('/dashboard')
      } catch (err) {
        throw new Error(getApiError(err))
      }
    },
    [queryClient, router]
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Silently ignore — we clear client state regardless
    } finally {
      Cookies.remove('accessToken')
      queryClient.setQueryData(AUTH_QUERY_KEY, null)
      queryClient.clear()
      router.push('/login')
    }
  }, [queryClient, router])

  const refresh = useCallback(() => {
    refetch()
  }, [refetch])

  return {
    user: user ?? null,
    isLoading,
    isLoggedIn: !!user,
    login,
    logout,
    signup,
    refresh,
  }
}
