'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import { Toaster } from 'react-hot-toast'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            cacheTime: 5 * 60 * 1000, // 5 minutes
            retry: (failureCount, error: unknown) => {
              const err = error as { response?: { status?: number } }
              if (err?.response?.status === 401 || err?.response?.status === 403) return false
              return failureCount < 2
            },
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        position="top-right"
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#ffffff',
            color: '#1e293b',
            border: '1px solid #e2e8f0',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: '500',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
          },
          success: {
            iconTheme: { primary: '#10B981', secondary: '#ffffff' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#ffffff' },
          },
        }}
      />
    </QueryClientProvider>
  )
}
