// src/app/equipe/page.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Redirige vers /equipe/liste par défaut
export default function EquipePage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/equipe/liste')
  }, [router])

  return null
}