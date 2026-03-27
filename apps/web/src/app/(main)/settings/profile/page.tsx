'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ProfileRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/settings?tab=profile')
  }, [router])
  return null
}
