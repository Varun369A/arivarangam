'use client'

import { useQuery, useQueryClient } from 'react-query'
import Cookies from 'js-cookie'
import { creditsApi } from '@/lib/api'

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const CREDITS_QUERY_KEY = ['credits', 'balance'] as const
export const ESTIMATE_QUERY_KEY = (prompt: string, category: string) =>
  ['credits', 'estimate', prompt, category] as const

// ---------------------------------------------------------------------------
// useCredits — fetches and caches the user's credit balance
// ---------------------------------------------------------------------------

export interface UseCreditsReturn {
  balance: number | null
  isLoading: boolean
  error: string | null
  refresh: () => void
}

export function useCredits(): UseCreditsReturn {
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery(
    CREDITS_QUERY_KEY,
    async () => {
      const token = Cookies.get('accessToken')
      if (!token) return { balance: 0, recentTransactions: [] }
      return creditsApi.getBalance()
    },
    {
      staleTime: 30 * 1000, // 30 seconds — credits change frequently
      cacheTime: 2 * 60 * 1000,
      retry: 1,
    }
  )

  return {
    balance: data?.balance ?? null,
    isLoading,
    error: error ? 'Failed to load credits' : null,
    refresh: () => {
      queryClient.invalidateQueries(CREDITS_QUERY_KEY)
      refetch()
    },
  }
}

// ---------------------------------------------------------------------------
// useEstimate — estimates credit cost for a given prompt + category
// ---------------------------------------------------------------------------

export interface CreditEstimateResult {
  min: number
  max: number
  typical: number
}

export interface UseEstimateReturn {
  estimate: CreditEstimateResult | null
  isLoading: boolean
  error: string | null
}

export function useEstimate(prompt: string, category: string): UseEstimateReturn {
  // Only run when both prompt and category are non-empty and prompt is substantial
  const enabled = prompt.trim().length > 10 && category.trim().length > 0

  const { data, isLoading, error } = useQuery(
    ESTIMATE_QUERY_KEY(prompt, category),
    () => creditsApi.estimateTask(prompt, category),
    {
      enabled,
      staleTime: 60 * 1000,
      cacheTime: 5 * 60 * 1000,
      retry: false,
      keepPreviousData: true,
    }
  )

  return {
    estimate: data ?? null,
    isLoading: enabled ? isLoading : false,
    error: error ? 'Failed to estimate credits' : null,
  }
}
