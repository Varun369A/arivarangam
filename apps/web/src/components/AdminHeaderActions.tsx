'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

export function AdminHeaderActions() {
  const { logout } = useAuth()

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/arena"
        className="text-xs text-[#4F46E5] bg-[#EEF2FF] hover:bg-[#E0E7FF] px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 border border-[#C7D2FE]"
      >
        ← Back to App
      </Link>
      <button
        onClick={() => logout()}
        className="text-xs text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg font-semibold transition-colors border border-red-200"
      >
        Sign Out
      </button>
    </div>
  )
}
