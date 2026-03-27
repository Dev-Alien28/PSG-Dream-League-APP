// src/i18n/useTranslation.ts
'use client'

import { useEffect, useState } from 'react'
import type { Language } from '@/types/user'

// Cache en mémoire pour ne pas recharger les JSONs
const translationCache: Partial<Record<Language, any>> = {}

async function loadTranslations(lang: Language): Promise<any> {
  if (translationCache[lang]) return translationCache[lang]
  try {
    const data = await import(`@/i18n/locales/${lang}.json`)
    translationCache[lang] = data.default
    return data.default
  } catch {
    // Fallback sur le français si la langue n'existe pas
    const fallback = await import('@/i18n/fr.json')
    translationCache[lang] = fallback.default
    return fallback.default
  }
}

// Résout un chemin pointé : "nav.chat" → translations.nav.chat
function resolve(obj: any, path: string): string {
  return path.split('.').reduce((acc, key) => acc?.[key], obj) ?? path
}

export function useTranslation() {
  const [lang, setLangState] = useState<Language>('fr')
  const [translations, setTranslations] = useState<any>(null)

  useEffect(() => {
    // Lire la langue depuis localStorage (sauvegardée au login/config)
    const stored = localStorage.getItem('psg_lang') as Language | null
    const activeLang = stored ?? 'fr'
    setLangState(activeLang)

    loadTranslations(activeLang).then(setTranslations)
  }, [])

  // Écoute les changements de langue (depuis la page config)
  useEffect(() => {
    const handler = () => {
      const stored = localStorage.getItem('psg_lang') as Language | null
      const activeLang = stored ?? 'fr'
      setLangState(activeLang)
      loadTranslations(activeLang).then(setTranslations)
    }
    window.addEventListener('psg_lang_changed', handler)
    return () => window.removeEventListener('psg_lang_changed', handler)
  }, [])

  const t = (key: string): string => {
    if (!translations) return key
    return resolve(translations, key)
  }

  return { t, lang }
}

// Appelé depuis la page config après sauvegarde des langues
export function setAppLanguage(lang: Language) {
  localStorage.setItem('psg_lang', lang)
  window.dispatchEvent(new Event('psg_lang_changed'))
}