// src/app/chat/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/lib/authHelpers'

export default function ChatIndexPage() {
  const router = useRouter()

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (!user) {
        router.replace('/login')
      } else {
        router.replace(`/chat/${user.primary_language}`)
      }
    })
  }, [router])

  return (
    <div className="loader-center">
      <div className="loader" />
    </div>
  )
}