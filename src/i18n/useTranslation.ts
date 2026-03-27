'use client'

import { useEffect, useState } from 'react'
import type { Language } from '@/types/user'

// Cache pour éviter de recharger les JSON
const translationCache: Partial<Record<Language, any>> = {}

// Chargement dynamique des fichiers de langue
async function loadTranslations(lang: Language): Promise<any> {
  if (translationCache[lang]) return translationCache[lang]

  try {
    const data = await import(`@/i18n/${lang}.json`)
    translationCache[lang] = data.default
    return data.default
  } catch (err) {
    console.warn(`Langue "${lang}" introuvable, fallback FR.`)

    const fallback = await import('@/i18n/fr.json')
    translationCache[lang] = fallback.default
    return fallback.default
  }
}

// Permet de lire "nav.chat" → translations.nav.chat
function resolve(obj: any, path: string): string {
  return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? path
}

export function useTranslation() {
  const [lang, setLangState] = useState<Language>('fr')
  const [translations, setTranslations] = useState<any>(null)

  // 🔹 Init langue depuis localStorage
  useEffect(() => {
    const stored = localStorage.getItem('psg_lang') as Language | null
    const activeLang = stored ?? 'fr'
    setLangState(activeLang)
  }, [])

  // 🔹 Recharge les traductions quand la langue change
  useEffect(() => {
  let isMounted = true

  // 🔥 reset immédiat pour forcer le refresh UI
  setTranslations(null)

  loadTranslations(lang).then((data) => {
    if (isMounted) setTranslations(data)
  })

  return () => {
    isMounted = false
  }
}, [lang])

  // 🔹 Écoute les changements globaux (config / login)
  useEffect(() => {
    const handler = () => {
      const stored = localStorage.getItem('psg_lang') as Language | null
      const activeLang = stored ?? 'fr'
      setLangState(activeLang)
    }

    window.addEventListener('psg_lang_changed', handler)
    return () => window.removeEventListener('psg_lang_changed', handler)
  }, [])

  // 🔹 Fonction de traduction
  const t = (key: string): string => {
  if (!translations) return '...'
  return resolve(translations, key)
}

  return { t, lang }
}

// 🔹 Setter global (appelé depuis login / config)
export function setAppLanguage(lang: Language) {
  localStorage.setItem('psg_lang', lang)

  // ⚡ important pour forcer le refresh UI
  window.dispatchEvent(new Event('psg_lang_changed'))
}