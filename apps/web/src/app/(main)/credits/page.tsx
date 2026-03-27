'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CreditsRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/settings?tab=credits')
  }, [router])
  return null
}
