'use client'

import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'

export function AdminHeaderActions() {
  const { logout } = useAuth()

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/arena"
        className="text-xs text-white bg-[#1e1b4b] hover:bg-[#312e81] px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1.5 border border-[#3730a3]"
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
